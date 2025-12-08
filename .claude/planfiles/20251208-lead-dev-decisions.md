# Lead Developer Decisions: Streamline Studio

**Status**: APPROVED
**Date**: 2025-12-08
**Author**: Lead Developer Agent
**Reviewed Plan**: `20251208-streamline-studio-plan.md`

---

## Executive Summary

After reviewing the Planning Agent's strategic plan, I am issuing definitive decisions on all major architectural questions and open items. These decisions are final for MVP scope unless explicitly reconsidered due to implementation blockers or new requirements.

---

## Part 1: Major Architectural Decisions

### Decision 1: Multi-Tenancy Strategy

**VERDICT: Option A - Application-Level Scoping**

**I accept the Planning Agent's recommendation with reinforced safeguards.**

#### Technical Justification

1. **Simplicity wins for MVP.** RLS adds complexity that is not warranted at this stage. The primary risk is developer error (forgetting `WHERE workspace_id = ?`), not malicious bypass.

2. **Drizzle + RLS has documented friction.** Drizzle's connection pooling with `pg` does not gracefully handle RLS session variables (`SET app.current_workspace_id`). Every connection from the pool would need the variable reset before query execution. This is achievable but error-prone and adds latency.

3. **Typed repository pattern mitigates risk.** By forcing all queries through a `WorkspaceRepository<T>` that requires `workspaceId` as a mandatory parameter, we make forgetting the filter a type error, not a runtime bug.

4. **Defense in depth at the middleware level.** The tRPC `protectedProcedure` already injects `ctx.workspace`. We will enforce that no direct Drizzle `db` access occurs outside the repository layer.

#### Implementation Requirements

```typescript
// REQUIRED: All data access through typed repositories
class WorkspaceRepository<T extends WorkspaceScopedTable> {
  constructor(
    private db: DrizzleDb,
    private table: T,
    private workspaceId: string
  ) {}

  async findMany(where?: WhereCondition<T>) {
    return this.db
      .select()
      .from(this.table)
      .where(and(eq(this.table.workspaceId, this.workspaceId), where));
  }
  // ... other methods
}
```

```typescript
// REQUIRED: Integration tests for cross-tenant isolation
describe('workspace isolation', () => {
  it('user cannot access videos from another workspace', async () => {
    const workspaceA = await createWorkspace();
    const workspaceB = await createWorkspace();
    const videoInB = await createVideo({ workspaceId: workspaceB.id });

    // Attempt to access video from workspace A context
    const caller = createCaller({ workspace: workspaceA });
    await expect(caller.video.get({ id: videoInB.id })).rejects.toThrow(
      'NOT_FOUND'
    );
  });
});
```

#### Risks Accepted

- **Developer discipline required.** All queries must use the repository layer. Code review must catch direct `db.select()` calls.
- **No database-level guarantee.** A bug in the repository could leak data. We accept this for MVP; security audit post-launch may require RLS retrofit.

#### Reconsideration Conditions

I will reconsider and mandate RLS if:

- A security audit (internal or external) requires database-level isolation
- We pursue SOC 2 or similar compliance that mandates defense-in-depth at the database layer
- A cross-tenant data leak occurs in production

---

### Decision 2: Authentication Implementation

**VERDICT: Option B - Lucia Auth**

**I accept the Planning Agent's recommendation.**

#### Technical Justification

1. **Proven session management.** Lucia handles session rotation, token hashing, and expiry correctly. These are areas where custom implementations frequently have subtle bugs.

2. **Drizzle adapter exists and is maintained.** The `@lucia-auth/adapter-drizzle` package is actively maintained and handles the session/user table integration.

3. **No external dependencies.** Unlike Auth.js (which encourages provider-based flows) or Better Auth (which is newer), Lucia is designed for email/password-first authentication with no external service requirements. This matches our self-hosted requirement.

4. **Clean migration path.** Lucia's session table schema is simple. If we need to move away from Lucia, the migration is straightforward - the session table structure is standard.

5. **v3 is stable.** I have reviewed the Lucia v3 changelog and GitHub issues. The major breaking changes from v2 are documented and the API is now stable. Community adoption is growing.

#### Implementation Requirements

```typescript
// Session configuration
const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  },
  getUserAttributes: (attributes) => ({
    email: attributes.email,
    name: attributes.name,
  }),
});
```

```typescript
// Password hashing - Argon2id with bcrypt fallback
// Primary: @node-rs/argon2 (Rust-based, fast, no native deps in release builds)
// Fallback: bcrypt if Argon2 fails in Docker (unlikely but documented)
```

#### Risks Accepted

- **Third-party dependency.** If Lucia is abandoned, we maintain it ourselves or migrate. The code surface is small.
- **Learning curve.** Developers familiar with NextAuth will need to learn Lucia patterns.

#### Reconsideration Conditions

I will reconsider if:

- OAuth is required earlier than Phase 6 (Lucia supports it, but Auth.js is more mature for OAuth)
- We encounter blocking issues with Lucia + Drizzle adapter in production
- The project is abandoned (check GitHub activity before Phase 1 starts)

---

### Decision 3: Background Jobs Strategy

**VERDICT: Option A - Defer Until Needed, then Option D - Graphile Worker**

**I accept the Planning Agent's recommendation with a modification.**

#### Technical Justification

1. **No background jobs needed until Phase 5.** Phase 1-4 can operate entirely synchronously. Auto-save is client-initiated, version history is inline with saves, audit logging is synchronous.

2. **Phase 5 requires async email delivery.** Invitation emails cannot block the HTTP response. We need a job queue.

3. **Graphile Worker is the correct choice for Phase 5.** It uses PostgreSQL as the queue backend, meaning:
   - No additional infrastructure (Redis)
   - Transactional job creation (invite + job in same transaction)
   - Simpler deployment for self-hosters

4. **BullMQ deferred to Phase 6 evaluation.** If YouTube sync requires high-throughput job processing, we can add Redis and BullMQ. But this is a Phase 6 decision, not Phase 5.

#### Implementation Requirements (Phase 5)

```typescript
// jobs/send-invitation-email.ts
export const tasks: TaskList = {
  sendInvitationEmail: async (payload, helpers) => {
    const { email, workspaceName, inviteUrl } = payload;
    await sendEmail({
      to: email,
      subject: `You've been invited to ${workspaceName}`,
      body: renderInviteTemplate({ workspaceName, inviteUrl }),
    });
  },
};
```

```typescript
// Creating job transactionally with invitation
await db.transaction(async (tx) => {
  const invitation = await tx.insert(invitations).values({...});
  await quickAddJob('sendInvitationEmail', {
    email: invitation.email,
    workspaceName: workspace.name,
    inviteUrl: `${baseUrl}/invite/${invitation.token}`,
  });
});
```

#### Risks Accepted

- **Synchronous email in early multi-tenant testing.** Before Graphile Worker is implemented, invitation emails will be synchronous. This is acceptable for limited beta testing.
- **Graphile Worker polling overhead.** It polls PostgreSQL. For our volume (hundreds of jobs/day max), this is negligible.

#### Reconsideration Conditions

I will mandate earlier implementation if:

- Email sending is required before Phase 5 (e.g., password reset in Phase 1)
- A feature emerges that requires background processing before Phase 5

---

## Part 2: Open Questions - Definitive Answers

### Question 4: Markdown Editor

**ANSWER: CodeMirror 6**

**Rationale:**

- **Bundle size**: CodeMirror 6 is ~50KB gzipped. Monaco is 500KB+. For a markdown editor, Monaco's features are overkill.
- **Accessibility**: CodeMirror 6 has explicit ARIA support and works with screen readers. Monaco has accessibility issues documented in their issue tracker.
- **Modularity**: We only need markdown highlighting and basic editing. CodeMirror 6 allows importing only what we need.
- **Mobile support**: CodeMirror 6 works better on mobile browsers than Monaco.

**Implementation note**: Use `@codemirror/lang-markdown` for syntax highlighting. Lazy-load the editor to keep initial page load fast.

---

### Question 5: Session Storage

**ANSWER: HTTP-only cookies - CONFIRMED**

**Rationale:**

- HTTP-only cookies cannot be accessed by JavaScript, preventing XSS from stealing session tokens.
- `SameSite=Lax` prevents CSRF for GET requests while allowing normal navigation.
- `Secure` flag in production ensures cookies only transmitted over HTTPS.
- This is the security standard. There is no reason to deviate.

**Configuration:**

```typescript
sessionCookie: {
  name: 'session',
  expires: false, // Session cookie (or set 30-day expiry)
  attributes: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  },
}
```

---

### Question 6: URL Structure

**ANSWER: `/w/[slug]/...`**

**Rationale:**

- **Brevity**: URLs are typed by users, appear in browser bars, and are shared. Shorter is better.
- **Convention**: GitHub uses `/orgs/`, Slack uses `/workspace/`, Linear uses short slugs. `/w/` is clear enough with context.
- **Technical**: Shorter URLs leave more room for deep paths (`/w/my-channel/videos/abc123/edit`)

**Structure:**

```
/                           # Landing (marketing or redirect to /w/...)
/login                      # Auth pages at root
/register
/w/[slug]                   # Workspace root (dashboard)
/w/[slug]/videos            # Video list
/w/[slug]/videos/[id]       # Video detail
/w/[slug]/videos/[id]/edit  # Video edit (if needed)
/w/[slug]/categories        # Category management
/w/[slug]/team              # Team management (Phase 5)
/w/[slug]/settings          # Workspace settings
```

---

### Question 7: Email Verification

**ANSWER: Defer to Phase 5**

**Rationale:**

- **Single-tenant mode**: Self-hosted instances typically have one user or a small trusted team. Email verification adds friction without security benefit.
- **Multi-tenant mode (Phase 5)**: Email verification becomes important to prevent spam accounts and ensure valid contact addresses for invitations. Implement it then.
- **MVP friction**: Every signup friction point reduces adoption for self-hosters testing the product.

**Phase 5 Implementation Note**: When implementing, add `email_verified_at` column to users table and require verification before workspace creation in multi-tenant mode.

---

### Question 8: Password Reset

**ANSWER: Defer to Phase 5**

**Rationale:**

- **Single-tenant mode**: Self-hosters can reset passwords via direct database access or by re-running the setup wizard (which creates a new user). Password reset flow adds complexity without proportional value.
- **Multi-tenant mode (Phase 5)**: Password reset is essential when we have many users who cannot access the database directly. Implement alongside invitation email infrastructure (same SMTP setup).

**Phase 5 Implementation Note**: Use same email infrastructure as invitations. Token-based reset with 1-hour expiry. Rate-limit reset requests.

---

### Question 9: Status Workflow Configuration

**ANSWER: Hardcoded defaults for Phase 2. Configuration deferred to post-MVP.**

**Rationale:**

- **Scope control**: Configurable workflows significantly increase complexity (UI for workflow editor, validation, migration of existing videos when workflow changes).
- **Adequate defaults**: The proposed workflow `Idea -> Scripting -> Recording -> Editing -> Scheduled -> Published` covers the standard YouTuber workflow.
- **Future iteration**: We can add configuration based on user feedback. Building it now is speculative.

**Implementation:**

```typescript
// lib/config/status-workflow.ts
export const VIDEO_STATUSES = [
  { id: 'idea', label: 'Idea', order: 1 },
  { id: 'scripting', label: 'Scripting', order: 2 },
  { id: 'recording', label: 'Recording', order: 3 },
  { id: 'editing', label: 'Editing', order: 4 },
  { id: 'scheduled', label: 'Scheduled', order: 5 },
  { id: 'published', label: 'Published', order: 6 },
] as const;

export type VideoStatus = (typeof VIDEO_STATUSES)[number]['id'];
```

---

## Part 3: Adjustments to Proposed Plan

### Adjustment 1: Add Rate Limiting to Phase 1 Auth

The plan mentions rate limiting in Phase 1 task 1.3.10, but I want to emphasize this is **critical**, not just high priority.

**Requirement**: Login endpoint must be rate-limited before any deployment, even development. Use `@upstash/ratelimit` with in-memory storage for development (no Redis needed yet).

```typescript
// 5 attempts per minute per IP
const ratelimit = new Ratelimit({
  limiter: Ratelimit.slidingWindow(5, '1m'),
});
```

---

### Adjustment 2: Remove Username Login Option

The plan asks "Should we support username in addition to email for login?"

**Answer: No.** Email-only login.

- Usernames add UX complexity (password reset requires email anyway)
- Users forget usernames but remember emails
- One identifier is cleaner for the auth system

---

### Adjustment 3: Workspace Slugs - Auto-Generated with Override

The plan asks "Should workspace slugs be auto-generated or user-provided?"

**Answer: Both.** Auto-generate from workspace name with user ability to customize.

```typescript
// Auto-generate on creation
const slug = generateSlug(workspaceName); // "My Channel" -> "my-channel"

// Validate uniqueness
if (await slugExists(slug)) {
  slug = `${slug}-${generateShortId()}`; // "my-channel-abc123"
}

// Allow rename in workspace settings
```

---

### Adjustment 4: Workspace Name Maximum Length

**Answer: 100 characters.**

- Long enough for "The Complete Guide to Video Production Channel"
- Short enough to display in UI without truncation issues
- Slug auto-generated with reasonable length

---

### Adjustment 5: Phase 1 Docker Smoke Test Scope

The plan includes a Docker smoke test in 1.1.7. I want to define minimal scope:

**Smoke test criteria:**

- [ ] `docker build .` succeeds
- [ ] Container starts without crash
- [ ] Health endpoint responds
- [ ] Can connect to Postgres in compose
- [ ] Basic auth flow works (register/login)

This is NOT full Docker packaging (Phase 4). This is early validation that our tech choices don't block Docker deployment.

---

## Part 4: Implementation Guidance - Phase 1 Critical Path

### Day 1-2: Project Initialization

1. **Initialize Next.js 15 with App Router**

   ```bash
   npx create-next-app@latest streamline-studio --typescript --tailwind --app --src-dir
   ```

2. **Configure TypeScript strict mode** - verify `tsconfig.json` has:

   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noUncheckedIndexedAccess": true,
       "noImplicitOverride": true
     }
   }
   ```

3. **Set up Drizzle**

   ```bash
   npm install drizzle-orm pg
   npm install -D drizzle-kit @types/pg
   ```

4. **Configure environment validation with Zod**

   ```typescript
   // src/env.ts
   import { z } from 'zod';

   const envSchema = z.object({
     DATABASE_URL: z.string().url(),
     SESSION_SECRET: z.string().min(32),
     MODE: z.enum(['single-tenant', 'multi-tenant']).default('single-tenant'),
     NODE_ENV: z
       .enum(['development', 'production', 'test'])
       .default('development'),
   });

   export const env = envSchema.parse(process.env);
   ```

### Day 3-5: Database Schema

**Critical files to create:**

- `src/db/schema/workspaces.ts`
- `src/db/schema/users.ts`
- `src/db/schema/sessions.ts`
- `src/db/schema/videos.ts`
- `src/db/schema/documents.ts`
- `src/db/schema/categories.ts`
- `src/db/schema/audit-log.ts`
- `src/db/index.ts` (exports all + db instance)

**Index requirements:**

```sql
CREATE INDEX idx_videos_workspace ON videos(workspace_id);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_due_date ON videos(due_date);
CREATE INDEX idx_documents_video ON documents(video_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_audit_workspace ON audit_log(workspace_id);
```

### Day 6-8: Authentication with Lucia

**Critical implementation order:**

1. Install Lucia and adapter: `npm install lucia @lucia-auth/adapter-drizzle`
2. Configure Lucia instance in `src/lib/auth.ts`
3. Create registration tRPC procedure (hash password, create user, create session)
4. Create login tRPC procedure (verify password, create session)
5. Create logout procedure (invalidate session)
6. Create auth middleware for tRPC context
7. Build minimal UI (registration page, login page)

### Day 9-10: Workspace Foundation + Docker Smoke Test

1. Implement `MODE` environment handling
2. Create workspace creation logic
3. In single-tenant mode: auto-create workspace on first registration
4. Create workspace-scoped tRPC middleware
5. Docker smoke test: verify build, startup, basic flow

---

## Part 5: Areas Requiring QA Architect Validation

The following areas have uncertainty that the QA Architect should stress-test:

1. **Workspace isolation tests**: Verify the repository pattern actually prevents cross-tenant access. Test edge cases (deleted workspace, user removed from workspace, concurrent requests).

2. **Session security**: Verify HTTP-only cookies are properly set. Test session expiry and refresh behavior. Verify logout invalidates server-side session.

3. **Docker multi-architecture builds**: Test that Argon2 works on both arm64 and amd64. If it fails, document the bcrypt fallback path.

4. **Optimistic locking (Phase 3 preview)**: The plan assumes Drizzle transactions work correctly with `FOR UPDATE`. Verify this with a spike test before Phase 3 begins.

5. **Performance baseline**: Establish performance targets for Phase 2. Test video list with 100+ videos, document load times, and save latency.

---

## Revision History

| Date       | Version | Changes                    |
| ---------- | ------- | -------------------------- |
| 2025-12-08 | 1.0     | Initial decisions document |
