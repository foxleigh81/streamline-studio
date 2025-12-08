# Project: Streamline Studio - YouTube Content Planner

## Overview

Streamline Studio is a self-hostable web application for YouTubers to plan and manage video content. The application supports both single-tenant (self-hosted) and multi-tenant (SaaS) deployment modes from a single codebase. This plan explores multiple implementation approaches using tree-of-thought reasoning, documents key architectural decisions requiring evaluation, and provides a granular six-phase implementation roadmap.

**Status of Key Decisions:**

- ORM: **Drizzle** (ADR-001 accepted)
- API: **tRPC** (ADR-002 accepted)
- Multi-tenancy approach: **Requires decision**
- Auth: **Requires decision**
- Background jobs: **Requires decision**

---

## Part 1: Tree-of-Thought Exploration

### 1.1 Phase Structure Analysis

Three approaches were evaluated for structuring the implementation:

#### Option A: Linear Sequential Phases

```
Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5 -> Phase 6
(Foundation) (UI)    (Versioning) (Docker) (Multi-tenant) (YouTube)
```

**Pros:**

- Simple dependency management
- Clear milestones and checkpoints
- Easier to estimate and track progress
- Reduced cognitive load for developers

**Cons:**

- Longer time to first deployable artifact
- No early validation of Docker packaging assumptions
- Late discovery of multi-tenant architectural issues

**Risk:** Phase 4 Docker packaging could reveal issues that require Phase 1-3 rework.

#### Option B: Parallel Tracks with Integration Points

```
Track A: Core App      Track B: Infrastructure
Phase 1 (DB/Auth)  ->  Phase 4.1 (Dockerfile draft)
Phase 2 (UI)       ->  Phase 4.2 (Compose draft)
Phase 3 (Versioning) -> Phase 4.3 (Final packaging)
                   ->  Phase 5 (Multi-tenant)
```

**Pros:**

- Early validation of deployment assumptions
- Infrastructure issues discovered in parallel
- Faster feedback loops
- Can demonstrate progress on multiple fronts

**Cons:**

- Requires more coordination
- Docker work may need rework as app evolves
- More complex dependency tracking

**Risk:** Parallel work creates merge conflicts and integration challenges.

#### Option C: MVP-First (Vertical Slices)

```
MVP (minimal end-to-end):
  - Basic auth
  - Single video CRUD
  - Single document type
  - Docker-compose works

Then expand horizontally:
  - All document types
  - Categories
  - Version history
  - Multi-tenant
```

**Pros:**

- Fastest time to working system
- Early validation of entire stack
- User testing possible earlier
- De-risks integration issues

**Cons:**

- May require refactoring as features expand
- Harder to define clean phase boundaries
- Risk of accumulating technical debt

**Risk:** MVP shortcuts become permanent fixtures.

#### RECOMMENDED: Modified Linear with Early Infrastructure Validation

```
Phase 1: Core Architecture (with Docker smoke test)
Phase 2: Core UI
Phase 3: Version History
Phase 4: Docker Polish (builds on Phase 1 smoke test)
Phase 5: Multi-tenant
Phase 6: YouTube Design
```

**Rationale:** We follow the linear approach but include a Docker smoke test in Phase 1 (task 1.1.7). This validates deployment early without the coordination overhead of parallel tracks. Phase 4 then polishes rather than discovers.

---

### 1.2 Key Decisions Requiring Evaluation

#### Decision 1: Multi-Tenancy Implementation Strategy

**Context:** The app must support both single-tenant (self-hosted) and multi-tenant (SaaS) modes from the same codebase, controlled by `MODE` environment variable.

##### Option A: Application-Level Scoping

Every query includes `WHERE workspace_id = ?` enforced by middleware.

```typescript
// tRPC middleware injects workspace context
const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const workspace = await getWorkspaceFromSession(ctx);
  return next({ ctx: { ...ctx, workspace } });
});

// All queries filter by workspace
const videos = await db
  .select()
  .from(videosTable)
  .where(eq(videosTable.workspaceId, ctx.workspace.id));
```

**Pros:**

- Simplest to implement
- Single database, single schema
- Works identically in both modes
- Easy local development

**Cons:**

- Every query must include workspace filter (easy to forget)
- Cross-tenant queries possible if middleware bypassed
- Harder to audit for security
- No database-level isolation

**Security Mitigation:** Create typed repository layer that enforces workspace scoping.

##### Option B: PostgreSQL Row-Level Security (RLS)

Database enforces tenant isolation via policies.

```sql
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY videos_workspace_policy ON videos
  USING (workspace_id = current_setting('app.current_workspace_id')::uuid);
```

```typescript
// Set session variable before queries
await db.execute(sql`SET app.current_workspace_id = ${workspaceId}`);
const videos = await db.select().from(videosTable); // RLS auto-filters
```

**Pros:**

- Database-enforced security (defense in depth)
- Impossible to accidentally query wrong tenant's data
- Cleaner query code (no explicit filters)
- Auditors love it

**Cons:**

- More complex setup and testing
- Must set session variable on every request
- Debugging RLS issues is painful
- Connection pooling complications (must reset session state)
- Some ORMs struggle with RLS patterns

**Risk:** Drizzle's transaction handling may conflict with RLS session variables.

##### Option C: Schema-Per-Tenant (Separate Schemas)

Each workspace gets its own PostgreSQL schema.

```sql
CREATE SCHEMA workspace_abc123;
CREATE TABLE workspace_abc123.videos (...);
```

**Pros:**

- Complete isolation
- Easy to backup/restore single tenant
- Can scale to per-tenant databases later

**Cons:**

- Complex migration management
- Schema proliferation in multi-tenant mode
- Connection pooling per schema
- Overkill for MVP

**Not recommended for MVP.**

##### Option D: Hybrid (App-Level + RLS for Sensitive Tables)

Use app-level scoping generally but add RLS to sensitive tables (documents, audit_log).

**Pros:**

- Defense in depth where it matters most
- Less complex than full RLS
- Pragmatic balance

**Cons:**

- Inconsistent patterns
- Still has RLS complexity for some tables

#### RECOMMENDATION FOR LEAD DEVELOPER:

**Start with Option A (Application-Level Scoping)** with these mitigations:

1. Create a typed `WorkspaceRepository` wrapper that enforces scoping
2. Add integration tests that verify cross-tenant queries fail
3. Document RLS migration path for post-MVP if security audit requires it

**Questions for Lead Developer:**

- Is RLS a compliance requirement for any target customers?
- What is acceptable blast radius if a scoping bug occurs?

---

#### Decision 2: Authentication Implementation

**Context:** Need email/password auth that works for self-hosted (no external dependencies) and SaaS (scalable).

##### Option A: Custom Auth Implementation

Build from scratch: sessions table, password hashing, cookie management.

```typescript
// Custom session management
const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});
```

**Pros:**

- Full control over behavior
- No external dependencies
- Simpler deployment
- Learn the internals

**Cons:**

- Security responsibility on us
- Must implement session rotation, expiry, etc.
- More code to maintain
- Risk of security mistakes

**Risk:** Custom auth is where security bugs hide.

##### Option B: Lucia Auth

Lucia is a session-based auth library designed for TypeScript/Next.js.

```typescript
import { lucia } from 'lucia';
import { drizzle } from '@lucia-auth/adapter-drizzle';

const auth = lucia({
  adapter: drizzle(db, { user: users, session: sessions, key: keys }),
  env: process.env.NODE_ENV === 'production' ? 'PROD' : 'DEV',
});
```

**Pros:**

- Well-tested session management
- Drizzle adapter available
- No external service dependencies
- Active community
- Handles edge cases we'd forget

**Cons:**

- Additional dependency
- Must learn library patterns
- Library design decisions may not match our needs
- v3 is relatively new (stability?)

##### Option C: Auth.js (NextAuth)

Full-featured auth solution.

**Pros:**

- Very mature
- Handles OAuth flows (for future YouTube integration)
- Large community

**Cons:**

- Heavy for our needs (we only need email/password initially)
- Magic patterns can be hard to customize
- Recent v5 transition caused breaking changes

##### Option D: Better Auth

Newer TypeScript-first auth library.

**Pros:**

- Modern API
- Good TypeScript support
- Growing adoption

**Cons:**

- Newer, less battle-tested
- Smaller community
- Less documentation

#### RECOMMENDATION FOR LEAD DEVELOPER:

**Option B (Lucia Auth)** is the sweet spot:

- More secure than custom (Option A)
- Lighter than Auth.js (Option C)
- No external service dependencies
- Drizzle adapter exists

**Fallback:** If Lucia proves problematic, the session table pattern is standard enough that we can swap to custom implementation without schema changes.

**Questions for Lead Developer:**

- Any prior experience with Lucia? Concerns about v3 stability?
- Is OAuth support needed earlier than Phase 6?

---

#### Decision 3: Background Jobs Strategy

**Context:** Eventually needed for:

- Document revision cleanup (future)
- YouTube API sync (Phase 6)
- Email sending for invitations (Phase 5)
- Scheduled publishing reminders (future)

##### Option A: Defer Until Needed

No job queue infrastructure in MVP. Handle async work synchronously or skip.

**Pros:**

- Simplest to start
- No additional infrastructure
- Faster MVP delivery

**Cons:**

- Must retrofit later
- Some features degraded (invitations are synchronous)
- May influence architecture decisions we'll regret

##### Option B: In-Process Job Queue (Quirrel or similar)

Lightweight job queue that runs in the Next.js process.

```typescript
import { Queue } from "quirrel/next";

export const emailQueue = Queue("api/queues/email", async (job) => {
  await sendEmail(job.to, job.subject, job.body);
});

// Usage
await emailQueue.enqueue({ to: "user@example.com", ... });
```

**Pros:**

- No external dependencies
- Simple deployment
- Good enough for low-volume

**Cons:**

- Jobs lost if process restarts
- No horizontal scaling
- Quirrel is serverless-focused (may not fit)

##### Option C: BullMQ with Redis

Production-grade job queue.

```typescript
import { Queue, Worker } from 'bullmq';

const emailQueue = new Queue('email', { connection: redis });

new Worker(
  'email',
  async (job) => {
    await sendEmail(job.data);
  },
  { connection: redis }
);
```

**Pros:**

- Industry standard
- Reliable job processing
- Supports retries, delays, priorities
- Scales horizontally

**Cons:**

- Requires Redis (additional infrastructure)
- More complex deployment
- Overkill for MVP

##### Option D: PostgreSQL-Based Queue (Graphile Worker)

Use Postgres as the job queue.

```typescript
import { run, quickAddJob } from 'graphile-worker';

await quickAddJob('send_email', { to: 'user@example.com' });
```

**Pros:**

- No additional infrastructure (uses existing Postgres)
- ACID guarantees
- Simple to deploy

**Cons:**

- Less performant than Redis for high volume
- Polling-based

#### RECOMMENDATION FOR LEAD DEVELOPER:

**Option A (Defer) for MVP** with design considerations:

1. Structure code so email sending is behind an interface
2. In Phase 5, add Graphile Worker (Option D) for invitations
3. In Phase 6, evaluate BullMQ if YouTube sync volume requires it

**Questions for Lead Developer:**

- What volume of invitation emails is expected in SaaS mode?
- Is synchronous email sending acceptable for MVP multi-tenant?

---

### 1.3 Architecture Decision Summary

| Decision        | Recommended                        | Rationale                                    |
| --------------- | ---------------------------------- | -------------------------------------------- |
| ORM             | Drizzle                            | ADR-001 (accepted)                           |
| API Style       | tRPC                               | ADR-002 (accepted)                           |
| Multi-tenancy   | App-level scoping                  | Simplest, add RLS post-MVP if needed         |
| Auth            | Lucia Auth                         | Secure, no external deps, Drizzle adapter    |
| Background Jobs | Defer (Graphile Worker in Phase 5) | Avoid infrastructure complexity until needed |

---

## Part 2: Critical Considerations

### 2.1 Security Requirements and Mitigations

#### Authentication Security

| Threat                    | Mitigation                                                 | Phase   |
| ------------------------- | ---------------------------------------------------------- | ------- |
| Password brute force      | Rate limiting on login endpoint (5 attempts/min per IP)    | Phase 1 |
| Password storage exposure | Argon2id hashing (fall back to bcrypt if native deps fail) | Phase 1 |
| Session hijacking         | HTTP-only cookies, Secure flag, SameSite=Lax               | Phase 1 |
| Session fixation          | Regenerate session ID on login                             | Phase 1 |
| CSRF                      | SameSite cookies, verify Origin header for mutations       | Phase 1 |
| XSS                       | React auto-escaping, sanitize markdown preview             | Phase 2 |

#### Data Isolation Security

| Threat                   | Mitigation                                                   | Phase   |
| ------------------------ | ------------------------------------------------------------ | ------- |
| Cross-tenant data access | Workspace ID in all queries via middleware                   | Phase 1 |
| Authorization bypass     | Role-based access control in tRPC middleware                 | Phase 5 |
| Audit log tampering      | Append-only table, no UPDATE/DELETE permissions for app user | Phase 3 |

#### Infrastructure Security

| Threat                        | Mitigation                                    | Phase   |
| ----------------------------- | --------------------------------------------- | ------- |
| SQL injection                 | Drizzle parameterized queries (never raw SQL) | Phase 1 |
| Environment variable exposure | Never log secrets, .dockerignore .env files   | Phase 4 |
| Unencrypted traffic           | Document HTTPS via reverse proxy requirement  | Phase 4 |
| Default credentials           | No default admin user, force setup wizard     | Phase 4 |

#### Security Review Checkpoints

- [ ] **Phase 1 Complete:** Security review of auth implementation
- [ ] **Phase 4 Complete:** Penetration test of self-hosted deployment
- [ ] **Phase 5 Complete:** Multi-tenant isolation verification

---

### 2.2 Performance Targets

| Operation                      | Target  | Measurement          |
| ------------------------------ | ------- | -------------------- |
| Page load (empty cache)        | < 2s    | Lighthouse           |
| Video list (100 videos)        | < 500ms | Server response time |
| Document save                  | < 300ms | Time to confirmation |
| Document load                  | < 200ms | Time to editor ready |
| Version history (50 revisions) | < 400ms | Server response time |
| Search/filter videos           | < 300ms | Server response time |

#### Performance Optimization Strategy

**Phase 1:**

- Add indexes on `workspace_id`, `video.status`, `video.due_date`
- Use connection pooling (Drizzle with `pg` pool)

**Phase 2:**

- Lazy load markdown editor (code split)
- Implement skeleton loading states
- Paginate video lists (default 50, max 100)

**Phase 3:**

- Paginate revision history (default 20)
- Consider caching category lists (low change frequency)

**Phase 4:**

- Enable Next.js standalone output for smaller images
- Implement response compression

---

### 2.3 Accessibility Requirements

All UI must meet WCAG 2.1 Level AA compliance.

#### Phase 2 Accessibility Checklist

| Requirement         | Implementation                                        |
| ------------------- | ----------------------------------------------------- |
| Keyboard navigation | All interactive elements focusable, logical tab order |
| Skip links          | "Skip to main content" link at page top               |
| Focus indicators    | Visible focus rings (not just outline: none)          |
| Color contrast      | 4.5:1 for normal text, 3:1 for large text             |
| Alt text            | All meaningful images have descriptions               |
| Form labels         | All inputs have associated labels                     |
| Error messages      | Announced to screen readers via aria-live             |
| Reduced motion      | Respect `prefers-reduced-motion`                      |

#### Markdown Editor Accessibility

- Editor must support keyboard shortcuts announced to screen readers
- Preview must be navigable
- Character count announced on update (debounced)
- Consider CodeMirror 6 for better a11y support vs Monaco

#### Testing Tools

- axe-core for automated checking
- VoiceOver/NVDA manual testing for critical flows
- Playwright accessibility assertions

---

## Part 3: Phase Implementation Plans

### Phase 1: Core Architecture, Data Model, and Basic Auth

**Duration Estimate:** 2-3 weeks
**Critical Path:** Yes - blocks all other phases

#### Goals

- Establish project structure and tooling
- Implement complete database schema with migrations
- Build authentication system
- Create workspace management foundation
- Validate Docker deployment early (smoke test)

#### Non-Goals

- UI beyond basic auth flows
- Document editing
- Version history
- Full Docker packaging (Phase 4)
- Multi-tenant mode features (Phase 5)

#### Task Breakdown

##### 1.1 Project Setup

| ID    | Task                                                                          | Assigned To    | Priority | Dependencies | Est. Hours |
| ----- | ----------------------------------------------------------------------------- | -------------- | -------- | ------------ | ---------- |
| 1.1.1 | Initialize Next.js 15 with App Router, TypeScript strict mode, src/ directory | Lead Developer | Critical | None         | 1          |
| 1.1.2 | Configure ESLint (strict), Prettier, lint-staged, husky pre-commit hooks      | Lead Developer | High     | 1.1.1        | 2          |
| 1.1.3 | Set up Drizzle ORM with pg driver and drizzle-kit                             | Lead Developer | Critical | 1.1.1        | 2          |
| 1.1.4 | Configure environment handling (env.mjs with Zod validation)                  | Lead Developer | High     | 1.1.1        | 1          |
| 1.1.5 | Set up tRPC with App Router (fetchRequestHandler, react-query client)         | Lead Developer | Critical | 1.1.1        | 3          |
| 1.1.6 | Configure Vitest for unit tests, Playwright for E2E                           | QA Architect   | High     | 1.1.1        | 2          |
| 1.1.7 | Create basic Dockerfile and docker-compose for early validation               | Lead Developer | Medium   | 1.1.1        | 2          |

**Acceptance Criteria for 1.1:**

- [ ] `npm run dev` starts the application
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm run test` runs Vitest with no errors
- [ ] TypeScript strict mode enabled and compiling
- [ ] Environment variables validated at startup
- [ ] `docker-compose up` starts app and Postgres (basic functionality)

##### 1.2 Database Schema

| ID     | Task                                                   | Assigned To    | Priority | Dependencies | Est. Hours |
| ------ | ------------------------------------------------------ | -------------- | -------- | ------------ | ---------- |
| 1.2.1  | Define `workspaces` table schema                       | Lead Developer | Critical | 1.1.3        | 1          |
| 1.2.2  | Define `users` table schema                            | Lead Developer | Critical | 1.1.3        | 1          |
| 1.2.3  | Define `workspace_users` join table with role enum     | Lead Developer | Critical | 1.2.1, 1.2.2 | 1          |
| 1.2.4  | Define `sessions` table for auth                       | Lead Developer | Critical | 1.2.2        | 1          |
| 1.2.5  | Define `videos` table with all core fields             | Lead Developer | Critical | 1.2.1        | 1          |
| 1.2.6  | Define `categories` table                              | Lead Developer | High     | 1.2.1        | 0.5        |
| 1.2.7  | Define `video_categories` join table                   | Lead Developer | High     | 1.2.5, 1.2.6 | 0.5        |
| 1.2.8  | Define `documents` table with type enum, version field | Lead Developer | Critical | 1.2.5        | 1          |
| 1.2.9  | Define `document_revisions` table                      | Lead Developer | High     | 1.2.8        | 1          |
| 1.2.10 | Define `audit_log` table                               | Lead Developer | High     | 1.2.1        | 1          |
| 1.2.11 | Add all necessary indexes                              | Lead Developer | High     | 1.2.1-1.2.10 | 1          |
| 1.2.12 | Create and test migration                              | Lead Developer | Critical | 1.2.11       | 1          |
| 1.2.13 | Create seed script for development data                | Lead Developer | Medium   | 1.2.12       | 2          |

**Schema Notes:**

```typescript
// videos table key fields
{
  id: uuid,
  workspaceId: uuid, // FK + index
  title: varchar(255),
  status: varchar(50), // configurable workflow statuses
  dueDate: timestamp,
  publishDate: timestamp,
  youtubeUrl: text,
  createdAt: timestamp,
  updatedAt: timestamp,
}

// documents table key fields
{
  id: uuid,
  videoId: uuid, // FK
  type: enum('script', 'description', 'notes'),
  content: text,
  version: integer, // for optimistic locking
  updatedBy: uuid, // FK to users
  updatedAt: timestamp,
}
```

**Acceptance Criteria for 1.2:**

- [ ] All tables created successfully via migration
- [ ] Migration is idempotent (can run multiple times)
- [ ] Foreign keys enforce referential integrity
- [ ] Indexes exist on workspace_id, video status, due_date
- [ ] Seed script creates usable test data
- [ ] Schema matches documented ERD

##### 1.3 Authentication

| ID     | Task                                        | Assigned To    | Priority | Dependencies | Est. Hours |
| ------ | ------------------------------------------- | -------------- | -------- | ------------ | ---------- |
| 1.3.1  | Set up Lucia Auth with Drizzle adapter      | Lead Developer | Critical | 1.2.4        | 3          |
| 1.3.2  | Configure password hashing (Argon2id)       | Lead Developer | Critical | 1.3.1        | 1          |
| 1.3.3  | Create registration tRPC procedure          | Lead Developer | Critical | 1.3.1        | 2          |
| 1.3.4  | Create login tRPC procedure                 | Lead Developer | Critical | 1.3.1        | 2          |
| 1.3.5  | Create logout tRPC procedure                | Lead Developer | High     | 1.3.1        | 1          |
| 1.3.6  | Implement auth middleware for tRPC context  | Lead Developer | Critical | 1.3.4        | 2          |
| 1.3.7  | Create session validation and refresh logic | Lead Developer | High     | 1.3.1        | 2          |
| 1.3.8  | Build registration page UI                  | UI Developer   | High     | 1.3.3        | 3          |
| 1.3.9  | Build login page UI                         | UI Developer   | High     | 1.3.4        | 2          |
| 1.3.10 | Add rate limiting to auth endpoints         | Lead Developer | High     | 1.3.3, 1.3.4 | 2          |
| 1.3.11 | Write unit tests for auth flows             | QA Architect   | High     | 1.3.3-1.3.5  | 3          |

**Implementation Notes:**

- Use HTTP-only cookies for session tokens
- Set Secure flag when `NODE_ENV=production`
- Session expiry: 30 days, refresh on activity
- Rate limit: 5 login attempts per minute per IP

**Acceptance Criteria for 1.3:**

- [ ] User can register with email and password
- [ ] Password stored as Argon2id hash (verify in DB)
- [ ] User can log in with valid credentials
- [ ] Invalid credentials return error (not which field is wrong)
- [ ] Session persists across page refresh
- [ ] User can log out (session invalidated)
- [ ] Rate limiting prevents brute force
- [ ] All auth tests pass

##### 1.4 Workspace Foundation

| ID    | Task                                                             | Assigned To    | Priority | Dependencies | Est. Hours |
| ----- | ---------------------------------------------------------------- | -------------- | -------- | ------------ | ---------- |
| 1.4.1 | Implement MODE environment variable handling                     | Lead Developer | High     | 1.1.4        | 1          |
| 1.4.2 | Create workspace creation logic                                  | Lead Developer | Critical | 1.2.1        | 2          |
| 1.4.3 | Auto-create workspace on first registration (single-tenant mode) | Lead Developer | Critical | 1.4.1, 1.4.2 | 2          |
| 1.4.4 | Create workspace context provider for frontend                   | UI Developer   | High     | 1.4.2        | 2          |
| 1.4.5 | Create workspace-scoped tRPC middleware                          | Lead Developer | Critical | 1.4.2, 1.3.6 | 2          |
| 1.4.6 | Write integration tests for workspace scoping                    | QA Architect   | Critical | 1.4.5        | 3          |

**Acceptance Criteria for 1.4:**

- [ ] MODE=single-tenant creates workspace on first registration
- [ ] MODE=multi-tenant does not auto-create workspace (Phase 5)
- [ ] tRPC procedures reject requests without valid workspace
- [ ] User cannot access other workspaces' data
- [ ] Integration tests verify workspace isolation

#### Phase 1 Risks and Mitigations

| Risk                              | Likelihood | Impact | Mitigation                                         |
| --------------------------------- | ---------- | ------ | -------------------------------------------------- |
| Argon2 native deps fail in Docker | Medium     | Medium | Test Docker build in 1.1.7, fallback to bcrypt     |
| Lucia Auth v3 instability         | Low        | High   | Keep auth interface abstract, can swap to custom   |
| Schema design misses requirements | Medium     | High   | Review schema against all phases before finalizing |

#### Open Questions for Phase 1

1. Should we support username in addition to email for login?
2. What is the maximum workspace name length?
3. Should workspace slugs be auto-generated or user-provided?

---

### Phase 2: Core UI for Videos and Documents

**Duration Estimate:** 3-4 weeks
**Critical Path:** Yes

#### Goals

- Build main dashboard showing video list
- Implement video CRUD operations
- Create video detail view with document editing
- Build category management
- Implement markdown editor with preview

#### Non-Goals

- Version history UI (Phase 3)
- Conflict resolution UI (Phase 3)
- Import/export (Phase 3)
- Multi-user collaboration

#### Task Breakdown

##### 2.1 Video Management

| ID     | Task                                                         | Assigned To    | Priority | Dependencies | Est. Hours |
| ------ | ------------------------------------------------------------ | -------------- | -------- | ------------ | ---------- |
| 2.1.1  | Create tRPC video router (list, get, create, update, delete) | Lead Developer | Critical | Phase 1      | 4          |
| 2.1.2  | Implement video list pagination                              | Lead Developer | High     | 2.1.1        | 2          |
| 2.1.3  | Add video filtering by status                                | Lead Developer | High     | 2.1.1        | 1          |
| 2.1.4  | Add video filtering by category                              | Lead Developer | High     | 2.1.1        | 1          |
| 2.1.5  | Add video sorting (due date, status, created)                | Lead Developer | High     | 2.1.1        | 1          |
| 2.1.6  | Build video list page                                        | UI Developer   | Critical | 2.1.1        | 4          |
| 2.1.7  | Build video card component                                   | UI Developer   | High     | 2.1.6        | 2          |
| 2.1.8  | Build video creation modal                                   | UI Developer   | Critical | 2.1.1        | 3          |
| 2.1.9  | Build video detail page shell                                | UI Developer   | Critical | 2.1.1        | 3          |
| 2.1.10 | Implement video deletion with confirmation                   | UI Developer   | High     | 2.1.1        | 2          |
| 2.1.11 | Define default status workflow configuration                 | Lead Developer | Medium   | 2.1.1        | 1          |
| 2.1.12 | Auto-create documents when video created                     | Lead Developer | Critical | 2.1.1        | 1          |

**Status Workflow Default:**

```
Idea -> Scripting -> Recording -> Editing -> Scheduled -> Published
```

##### 2.2 Category Management

| ID    | Task                                                       | Assigned To    | Priority | Dependencies | Est. Hours |
| ----- | ---------------------------------------------------------- | -------------- | -------- | ------------ | ---------- |
| 2.2.1 | Create tRPC category router (list, create, update, delete) | Lead Developer | High     | Phase 1      | 2          |
| 2.2.2 | Build category management page                             | UI Developer   | High     | 2.2.1        | 3          |
| 2.2.3 | Implement category color picker                            | UI Developer   | Medium   | 2.2.2        | 2          |
| 2.2.4 | Build category selector for video forms                    | UI Developer   | High     | 2.2.1        | 2          |
| 2.2.5 | Handle category deletion (unlink, no cascade)              | Lead Developer | Medium   | 2.2.1        | 1          |

##### 2.3 Document Editing

| ID     | Task                                                           | Assigned To    | Priority | Dependencies | Est. Hours |
| ------ | -------------------------------------------------------------- | -------------- | -------- | ------------ | ---------- |
| 2.3.1  | Create tRPC document router (get, update)                      | Lead Developer | Critical | Phase 1      | 2          |
| 2.3.2  | Evaluate and select markdown editor (CodeMirror 6 recommended) | Lead Developer | Critical | None         | 2          |
| 2.3.3  | Integrate markdown editor component                            | UI Developer   | Critical | 2.3.2        | 4          |
| 2.3.4  | Implement markdown preview panel                               | UI Developer   | High     | 2.3.3        | 3          |
| 2.3.5  | Add auto-save with debouncing (2 second delay)                 | Lead Developer | Critical | 2.3.1        | 2          |
| 2.3.6  | Implement manual save (Cmd+S)                                  | UI Developer   | High     | 2.3.3        | 1          |
| 2.3.7  | Build document type tabs in video detail                       | UI Developer   | High     | 2.1.9, 2.3.3 | 2          |
| 2.3.8  | Add character/word count display                               | UI Developer   | Low      | 2.3.3        | 1          |
| 2.3.9  | Implement basic keyboard shortcuts                             | UI Developer   | Medium   | 2.3.3        | 2          |
| 2.3.10 | Sanitize markdown preview output                               | Lead Developer | Critical | 2.3.4        | 1          |

**Markdown Editor Decision Notes:**

- CodeMirror 6: ~50KB gzipped, excellent a11y, modular
- Monaco: ~500KB+ gzipped, feature-rich, VS Code familiarity
- Recommendation: CodeMirror 6 for bundle size and accessibility

##### 2.4 Layout and Navigation

| ID    | Task                                       | Assigned To  | Priority | Dependencies | Est. Hours |
| ----- | ------------------------------------------ | ------------ | -------- | ------------ | ---------- |
| 2.4.1 | Build app shell with sidebar navigation    | UI Developer | Critical | Phase 1      | 4          |
| 2.4.2 | Create breadcrumb component                | UI Developer | Medium   | 2.4.1        | 1          |
| 2.4.3 | Implement responsive sidebar (collapsible) | UI Developer | High     | 2.4.1        | 2          |
| 2.4.4 | Build settings page shell                  | UI Developer | Low      | 2.4.1        | 1          |
| 2.4.5 | Implement loading skeletons for all views  | UI Developer | High     | 2.4.1        | 3          |
| 2.4.6 | Add empty states with helpful messages     | UI Developer | Medium   | 2.4.1        | 2          |

##### 2.5 Accessibility Implementation

| ID    | Task                                  | Assigned To  | Priority | Dependencies | Est. Hours |
| ----- | ------------------------------------- | ------------ | -------- | ------------ | ---------- |
| 2.5.1 | Add skip links to all pages           | UI Developer | High     | 2.4.1        | 1          |
| 2.5.2 | Implement keyboard navigation testing | QA Architect | High     | 2.4.1        | 2          |
| 2.5.3 | Add focus management for modals       | UI Developer | High     | 2.1.8        | 1          |
| 2.5.4 | Ensure color contrast compliance      | UI Developer | High     | 2.4.1        | 2          |
| 2.5.5 | Add aria labels and live regions      | UI Developer | High     | 2.4.1        | 2          |
| 2.5.6 | Run axe-core automated audit          | QA Architect | High     | 2.4.5        | 1          |

#### Phase 2 Acceptance Criteria

- [ ] User can view paginated list of videos
- [ ] User can create video with title, status, due date, categories
- [ ] User can edit markdown for Script, Description, Notes
- [ ] Markdown preview renders correctly
- [ ] Auto-save triggers after 2 seconds of inactivity
- [ ] Cmd+S saves immediately
- [ ] User can manage categories with colors
- [ ] Video list filterable by status and category
- [ ] All views have loading states
- [ ] Empty states provide guidance
- [ ] Keyboard navigation works for all interactions
- [ ] axe-core reports zero critical violations

#### Phase 2 Risks

| Risk                                 | Likelihood | Impact | Mitigation                                  |
| ------------------------------------ | ---------- | ------ | ------------------------------------------- |
| Markdown editor bundle too large     | Medium     | Medium | Use CodeMirror 6, lazy load                 |
| Auto-save causes data loss           | Medium     | High   | Visual save indicator, basic version check  |
| Accessibility retrofitting expensive | Medium     | Medium | Implement a11y from start of each component |

---

### Phase 3: Version History and Optimistic Locking

**Duration Estimate:** 2-3 weeks
**Critical Path:** Yes

#### Goals

- Implement optimistic locking for document edits
- Build version history UI
- Enable version restoration
- Implement audit log for metadata changes
- Add markdown import/export

#### Non-Goals

- Real-time collaboration
- Visual diff between versions
- Conflict auto-merge

#### Task Breakdown

##### 3.1 Optimistic Locking

| ID    | Task                                                  | Assigned To    | Priority | Dependencies | Est. Hours |
| ----- | ----------------------------------------------------- | -------------- | -------- | ------------ | ---------- |
| 3.1.1 | Add version field to document update mutations        | Lead Developer | Critical | Phase 2      | 1          |
| 3.1.2 | Implement server-side version check in transaction    | Lead Developer | Critical | 3.1.1        | 3          |
| 3.1.3 | Return ConflictError with current version on mismatch | Lead Developer | Critical | 3.1.2        | 1          |
| 3.1.4 | Build conflict resolution modal                       | UI Developer   | Critical | 3.1.3        | 3          |
| 3.1.5 | Implement "reload and discard changes" option         | UI Developer   | High     | 3.1.4        | 1          |
| 3.1.6 | Implement "force save as new version" option          | UI Developer   | High     | 3.1.4        | 1          |
| 3.1.7 | Write E2E test for two-tab conflict scenario          | QA Architect   | Critical | 3.1.4        | 3          |

**Optimistic Locking Flow:**

```
1. Client reads document (gets version N)
2. Client edits locally
3. Client sends save with expected version N
4. Server checks: if current != N, return Conflict
5. Server saves, sets version N+1
6. Client updates local version
```

##### 3.2 Revision History

| ID    | Task                                                       | Assigned To    | Priority | Dependencies | Est. Hours |
| ----- | ---------------------------------------------------------- | -------------- | -------- | ------------ | ---------- |
| 3.2.1 | Create revision on every save (in transaction with update) | Lead Developer | Critical | 3.1.2        | 2          |
| 3.2.2 | Create tRPC endpoint: list revisions (paginated)           | Lead Developer | High     | 3.2.1        | 2          |
| 3.2.3 | Create tRPC endpoint: get single revision                  | Lead Developer | High     | 3.2.1        | 1          |
| 3.2.4 | Build revision history sidebar/panel                       | UI Developer   | High     | 3.2.2        | 3          |
| 3.2.5 | Display revision metadata (version, timestamp, author)     | UI Developer   | High     | 3.2.4        | 1          |
| 3.2.6 | Build read-only revision viewer                            | UI Developer   | High     | 3.2.3        | 2          |
| 3.2.7 | Implement "restore this version" action                    | Lead Developer | High     | 3.2.3        | 2          |
| 3.2.8 | Add confirmation dialog for restore                        | UI Developer   | Medium   | 3.2.7        | 1          |

##### 3.3 Audit Log

| ID    | Task                                           | Assigned To    | Priority | Dependencies | Est. Hours |
| ----- | ---------------------------------------------- | -------------- | -------- | ------------ | ---------- |
| 3.3.1 | Create audit log service/utility               | Lead Developer | High     | Phase 2      | 2          |
| 3.3.2 | Log video status changes                       | Lead Developer | High     | 3.3.1        | 1          |
| 3.3.3 | Log video due date changes                     | Lead Developer | Medium   | 3.3.1        | 0.5        |
| 3.3.4 | Log video publish date changes                 | Lead Developer | Medium   | 3.3.1        | 0.5        |
| 3.3.5 | Log category CRUD operations                   | Lead Developer | Medium   | 3.3.1        | 1          |
| 3.3.6 | Build audit log viewer page                    | UI Developer   | Medium   | 3.3.1        | 3          |
| 3.3.7 | Build activity feed component for video detail | UI Developer   | Medium   | 3.3.1        | 2          |

**Audit Log Entry Structure:**

```typescript
{
  id: uuid,
  workspaceId: uuid,
  entityType: 'video' | 'category' | 'document',
  entityId: uuid,
  action: 'create' | 'update' | 'delete',
  changes: jsonb, // { field: { from: old, to: new } }
  actorId: uuid,
  createdAt: timestamp,
}
```

##### 3.4 Import/Export

| ID    | Task                                                   | Assigned To    | Priority | Dependencies | Est. Hours |
| ----- | ------------------------------------------------------ | -------------- | -------- | ------------ | ---------- |
| 3.4.1 | Build single document export (download .md)            | Lead Developer | Medium   | Phase 2      | 2          |
| 3.4.2 | Build single document import (upload .md, new version) | Lead Developer | Medium   | 3.2.7        | 2          |
| 3.4.3 | Build bulk export (zip all documents for video)        | Lead Developer | Low      | 3.4.1        | 2          |
| 3.4.4 | Add export button to editor toolbar                    | UI Developer   | Medium   | 3.4.1        | 0.5        |
| 3.4.5 | Add import button to editor toolbar                    | UI Developer   | Medium   | 3.4.2        | 0.5        |
| 3.4.6 | Add file size limit (1MB) with validation              | Lead Developer | Medium   | 3.4.2        | 0.5        |

#### Phase 3 Acceptance Criteria

- [ ] Saving document increments version
- [ ] Stale version save shows conflict error
- [ ] User can view revision history
- [ ] User can view content of any revision
- [ ] User can restore old revision (creates new version)
- [ ] Restoration preserves all history
- [ ] Audit log captures status/date changes
- [ ] Audit log shows before/after values
- [ ] User can export document as .md
- [ ] User can import .md (creates new version)
- [ ] E2E conflict test passes

#### Phase 3 Risks

| Risk                           | Likelihood | Impact | Mitigation                                     |
| ------------------------------ | ---------- | ------ | ---------------------------------------------- |
| Revision table grows unbounded | Medium     | Medium | Pagination, document retention policy (future) |
| Large imports cause timeout    | Low        | Low    | File size limit, async processing for bulk     |

---

### Phase 4: Self-Hosting Packaging

**Duration Estimate:** 2 weeks
**Critical Path:** Yes (for first release)

#### Goals

- Create production-ready Docker image
- Build docker-compose for full stack
- Write comprehensive self-hosting documentation
- Implement setup wizard for first-run
- Document backup/restore procedures

#### Non-Goals

- Kubernetes manifests
- Cloud-specific deployment scripts
- High availability configuration
- Automated backups (manual process only)

#### Task Breakdown

##### 4.1 Docker Image

| ID    | Task                                       | Assigned To    | Priority | Dependencies | Est. Hours |
| ----- | ------------------------------------------ | -------------- | -------- | ------------ | ---------- |
| 4.1.1 | Create multi-stage Dockerfile              | Lead Developer | Critical | Phase 3      | 3          |
| 4.1.2 | Configure Next.js standalone output        | Lead Developer | Critical | 4.1.1        | 1          |
| 4.1.3 | Optimize image size (Alpine, minimal deps) | Lead Developer | High     | 4.1.1        | 2          |
| 4.1.4 | Handle runtime env vars correctly          | Lead Developer | Critical | 4.1.1        | 2          |
| 4.1.5 | Create health check endpoint (/api/health) | Lead Developer | High     | Phase 1      | 1          |
| 4.1.6 | Auto-run migrations on container start     | Lead Developer | Critical | 4.1.1        | 2          |
| 4.1.7 | Test build on arm64 and amd64              | QA Architect   | High     | 4.1.3        | 2          |
| 4.1.8 | Implement graceful shutdown handling       | Lead Developer | Medium   | 4.1.1        | 1          |

**Dockerfile Structure:**

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
# Install dependencies only

# Stage 2: Build
FROM node:20-alpine AS builder
# Build application

# Stage 3: Production
FROM node:20-alpine AS runner
# Copy standalone output only
```

##### 4.2 Docker Compose

| ID    | Task                                                    | Assigned To    | Priority | Dependencies | Est. Hours |
| ----- | ------------------------------------------------------- | -------------- | -------- | ------------ | ---------- |
| 4.2.1 | Create docker-compose.yml                               | Lead Developer | Critical | 4.1.1        | 2          |
| 4.2.2 | Configure named volume for Postgres                     | Lead Developer | Critical | 4.2.1        | 0.5        |
| 4.2.3 | Create comprehensive .env.example                       | Lead Developer | High     | 4.2.1        | 1          |
| 4.2.4 | Configure service dependencies and healthchecks         | Lead Developer | High     | 4.2.1        | 1          |
| 4.2.5 | Test clean start from scratch                           | QA Architect   | Critical | 4.2.4        | 1          |
| 4.2.6 | Test data persistence across restarts                   | QA Architect   | Critical | 4.2.5        | 1          |
| 4.2.7 | Add optional Redis service (commented out for Phase 5+) | Lead Developer | Low      | 4.2.1        | 0.5        |

##### 4.3 First-Run Experience

| ID    | Task                                           | Assigned To    | Priority | Dependencies | Est. Hours |
| ----- | ---------------------------------------------- | -------------- | -------- | ------------ | ---------- |
| 4.3.1 | Detect first run (no users in DB)              | Lead Developer | Critical | Phase 1      | 1          |
| 4.3.2 | Build setup wizard UI                          | UI Developer   | Critical | 4.3.1        | 4          |
| 4.3.3 | Collect admin email/password in wizard         | UI Developer   | Critical | 4.3.2        | 1          |
| 4.3.4 | Create first user and workspace via wizard     | Lead Developer | Critical | 4.3.2        | 1          |
| 4.3.5 | Lock wizard after first user created           | Lead Developer | Critical | 4.3.4        | 1          |
| 4.3.6 | Display helpful error on DB connection failure | Lead Developer | High     | 4.1.1        | 1          |

##### 4.4 Documentation

| ID    | Task                                               | Assigned To    | Priority | Dependencies | Est. Hours |
| ----- | -------------------------------------------------- | -------------- | -------- | ------------ | ---------- |
| 4.4.1 | Write quick start guide (5-minute setup)           | Lead Developer | Critical | 4.2.5        | 2          |
| 4.4.2 | Document all environment variables                 | Lead Developer | Critical | 4.2.3        | 1          |
| 4.4.3 | Write backup procedure (pg_dump)                   | Lead Developer | High     | 4.2.2        | 1          |
| 4.4.4 | Write restore procedure                            | Lead Developer | High     | 4.4.3        | 1          |
| 4.4.5 | Document upgrade procedure                         | Lead Developer | High     | 4.2.5        | 1          |
| 4.4.6 | Write troubleshooting guide                        | Lead Developer | Medium   | 4.2.5        | 2          |
| 4.4.7 | Add reverse proxy examples (nginx, Traefik, Caddy) | Lead Developer | Medium   | 4.2.5        | 2          |
| 4.4.8 | Have someone unfamiliar test the quick start       | QA Architect   | High     | 4.4.1        | 2          |

#### Phase 4 Acceptance Criteria

- [ ] `docker-compose up` brings up working app from scratch
- [ ] First visit redirects to setup wizard
- [ ] Setup wizard creates admin user and workspace
- [ ] Wizard not accessible after first user exists
- [ ] Health endpoint returns 200 when ready
- [ ] Data persists across container restarts
- [ ] Backup procedure documented and tested
- [ ] Restore procedure documented and tested
- [ ] Documentation tested by unfamiliar user

#### Phase 4 Risks

| Risk                               | Likelihood | Impact | Mitigation                            |
| ---------------------------------- | ---------- | ------ | ------------------------------------- |
| Native deps (Argon2) fail on arm64 | Medium     | Medium | Pre-build, document alternatives      |
| Migration failures on upgrade      | Low        | High   | Migration status check, rollback docs |
| Users can't figure out setup       | Medium     | Medium | Test with unfamiliar users            |

---

### Phase 5: Multi-Tenant SaaS Mode

**Duration Estimate:** 3-4 weeks
**Critical Path:** No (separate track)

#### Goals

- Enable multi-tenant mode via configuration
- Implement workspace creation and invitation flows
- Add user management within workspaces
- Implement workspace switching
- Add billing placeholders

#### Non-Goals

- Actual payment processing
- Custom domains per workspace
- Admin panel for SaaS operator
- Email verification (defer to future)

#### Task Breakdown

##### 5.1 Multi-Tenant Configuration

| ID    | Task                                           | Assigned To    | Priority | Dependencies | Est. Hours |
| ----- | ---------------------------------------------- | -------------- | -------- | ------------ | ---------- |
| 5.1.1 | Implement MODE=multi-tenant detection          | Lead Developer | Critical | Phase 4      | 1          |
| 5.1.2 | Disable setup wizard in multi-tenant           | Lead Developer | Critical | 5.1.1        | 0.5        |
| 5.1.3 | Enable public registration in multi-tenant     | Lead Developer | Critical | 5.1.1        | 1          |
| 5.1.4 | Require workspace creation during registration | Lead Developer | Critical | 5.1.3        | 2          |

##### 5.2 Workspace Management

| ID    | Task                                             | Assigned To    | Priority | Dependencies | Est. Hours |
| ----- | ------------------------------------------------ | -------------- | -------- | ------------ | ---------- |
| 5.2.1 | Build workspace creation form                    | UI Developer   | Critical | 5.1.4        | 2          |
| 5.2.2 | Implement workspace slug validation (unique)     | Lead Developer | High     | 5.2.1        | 1          |
| 5.2.3 | Build workspace settings page                    | UI Developer   | High     | 5.2.1        | 3          |
| 5.2.4 | Add workspace rename functionality               | UI Developer   | Medium   | 5.2.3        | 1          |
| 5.2.5 | Implement workspace deletion (with confirmation) | Lead Developer | Medium   | 5.2.3        | 2          |

##### 5.3 Team Management

| ID     | Task                                            | Assigned To    | Priority | Dependencies | Est. Hours |
| ------ | ----------------------------------------------- | -------------- | -------- | ------------ | ---------- |
| 5.3.1  | Build team members list page                    | UI Developer   | High     | 5.2.3        | 3          |
| 5.3.2  | Create invitations table schema                 | Lead Developer | High     | Phase 1      | 1          |
| 5.3.3  | Implement invitation creation (generates token) | Lead Developer | High     | 5.3.2        | 2          |
| 5.3.4  | Build invitation email template                 | UI Developer   | High     | 5.3.3        | 1          |
| 5.3.5  | Set up SMTP configuration                       | Lead Developer | High     | 5.3.4        | 1          |
| 5.3.6  | Implement invitation acceptance flow            | Lead Developer | High     | 5.3.3        | 3          |
| 5.3.7  | Build invitation acceptance page                | UI Developer   | High     | 5.3.6        | 2          |
| 5.3.8  | Define role enum (owner, editor, viewer)        | Lead Developer | High     | Phase 1      | 0.5        |
| 5.3.9  | Add RBAC to tRPC middleware                     | Lead Developer | Critical | 5.3.8        | 3          |
| 5.3.10 | Build role management UI                        | UI Developer   | High     | 5.3.9        | 2          |
| 5.3.11 | Implement "remove user from workspace"          | Lead Developer | Medium   | 5.3.10       | 1          |
| 5.3.12 | Prevent owner leaving without transfer          | Lead Developer | High     | 5.3.11       | 1          |

**Role Permissions:**
| Action | Owner | Editor | Viewer |
|--------|-------|--------|--------|
| View videos/docs | Yes | Yes | Yes |
| Edit videos/docs | Yes | Yes | No |
| Manage categories | Yes | Yes | No |
| Manage team | Yes | No | No |
| Delete workspace | Yes | No | No |

##### 5.4 Workspace Switching

| ID    | Task                                                 | Assigned To    | Priority | Dependencies | Est. Hours |
| ----- | ---------------------------------------------------- | -------------- | -------- | ------------ | ---------- |
| 5.4.1 | Build workspace switcher component                   | UI Developer   | High     | 5.2.1        | 2          |
| 5.4.2 | Store current workspace in cookie                    | Lead Developer | High     | 5.4.1        | 1          |
| 5.4.3 | Implement workspace URL structure (/w/[slug]/...)    | Lead Developer | High     | 5.4.1        | 2          |
| 5.4.4 | Redirect to selector if user has multiple workspaces | Lead Developer | Medium   | 5.4.1        | 1          |

##### 5.5 Billing Placeholders

| ID    | Task                                       | Assigned To    | Priority | Dependencies | Est. Hours |
| ----- | ------------------------------------------ | -------------- | -------- | ------------ | ---------- |
| 5.5.1 | Add subscription_status to workspace       | Lead Developer | Low      | 5.2.1        | 0.5        |
| 5.5.2 | Build billing settings page (placeholder)  | UI Developer   | Low      | 5.5.1        | 2          |
| 5.5.3 | Implement video limit per workspace        | Lead Developer | Low      | 5.5.1        | 1          |
| 5.5.4 | Show upgrade prompt when approaching limit | UI Developer   | Low      | 5.5.3        | 1          |

#### Phase 5 Acceptance Criteria

- [ ] MODE=multi-tenant enables public registration
- [ ] New user creates workspace during registration
- [ ] Owner can invite via email
- [ ] Invitee can accept and join workspace
- [ ] Role-based access control enforced
- [ ] Viewer cannot edit, Editor cannot manage team
- [ ] Workspace switcher works for multi-workspace users
- [ ] URLs include workspace slug
- [ ] Cross-tenant access prevented (test verification)

#### Phase 5 Risks

| Risk                                    | Likelihood | Impact | Mitigation                                |
| --------------------------------------- | ---------- | ------ | ----------------------------------------- |
| Email delivery requires SMTP setup      | High       | Medium | Console fallback for dev, document SMTP   |
| Role permissions need refinement        | Medium     | Medium | Start simple, iterate on feedback         |
| Invitation tokens could be brute-forced | Low        | Medium | Long random tokens, expiry, rate limiting |

---

### Phase 6: YouTube Integration (Design Only)

**Duration Estimate:** 1-2 weeks (design), implementation deferred

#### Goals

- Design YouTube Data API integration architecture
- Plan OAuth flow for YouTube account connection
- Design sync mechanism
- Document quota management strategy

#### Non-Goals

- Any implementation work
- Video upload functionality
- Live streaming integration

#### Design Tasks

| ID  | Task                                                | Assigned To    | Priority | Est. Hours |
| --- | --------------------------------------------------- | -------------- | -------- | ---------- |
| 6.1 | Document YouTube Data API requirements and quotas   | Lead Developer | High     | 4          |
| 6.2 | Design OAuth 2.0 flow for YouTube connection        | Lead Developer | High     | 3          |
| 6.3 | Design youtube_channels table schema                | Lead Developer | High     | 1          |
| 6.4 | Design youtube_videos table for synced metadata     | Lead Developer | High     | 1          |
| 6.5 | Design background job architecture (BullMQ + Redis) | Lead Developer | High     | 2          |
| 6.6 | Design analytics storage strategy                   | Lead Developer | Medium   | 2          |
| 6.7 | Design video matching algorithm                     | Lead Developer | Medium   | 2          |
| 6.8 | Document rate limiting and quota strategy           | Lead Developer | High     | 2          |
| 6.9 | Write ADR for YouTube integration approach          | Lead Developer | High     | 2          |

#### Design Deliverables

1. **ADR-003: YouTube Integration Approach**
2. **Schema designs for youtube\_\* tables**
3. **Background job architecture diagram**
4. **API quota management strategy document**

---

## Part 4: Cross-Phase Dependencies

```
Phase 1 ─────────────────────────────────────────────┐
    │                                                │
    v                                                │
Phase 2 ──────────────────────────────────┐          │
    │                                     │          │
    v                                     v          v
Phase 3 ──────────────────────────────> Phase 4 ───────────> Release 1.0
                                          │
                                          v
                                       Phase 5 ────────────> Release 1.1
                                          │
                                          v
                                       Phase 6 (Design)
                                          │
                                          v
                                       Phase 6 (Impl) ─────> Release 2.0
```

---

## Part 5: Success Metrics

### Phase 1-4 (MVP Release)

| Metric                               | Target             |
| ------------------------------------ | ------------------ |
| Time to working self-hosted instance | < 10 minutes       |
| User registration success rate       | > 99%              |
| Document save success rate           | > 99.9%            |
| Page load time (P95)                 | < 2 seconds        |
| Accessibility violations (axe-core)  | 0 critical/serious |
| Test coverage (unit + integration)   | > 80%              |

### Phase 5 (Multi-Tenant)

| Metric                           | Target |
| -------------------------------- | ------ |
| Invitation acceptance rate       | > 90%  |
| Cross-tenant data leak incidents | 0      |
| Workspace creation success rate  | > 99%  |

---

## Part 6: Estimated Timeline

| Phase            | Duration  | Start Dependency                   |
| ---------------- | --------- | ---------------------------------- |
| Phase 1          | 2-3 weeks | Project kickoff                    |
| Phase 2          | 3-4 weeks | Phase 1 complete                   |
| Phase 3          | 2-3 weeks | Phase 2 complete                   |
| Phase 4          | 2 weeks   | Phase 3 complete                   |
| Phase 5          | 3-4 weeks | Phase 4 complete                   |
| Phase 6 (Design) | 1-2 weeks | Phase 4 complete (parallel with 5) |

**Total to MVP (Phases 1-4):** 9-12 weeks
**Total to SaaS (Phase 5):** 12-16 weeks

---

## Part 7: Open Questions for Lead Developer

### Architecture

1. **Multi-tenancy:** Is app-level scoping sufficient, or should we invest in RLS from the start?
2. **Auth:** Confirm Lucia Auth selection. Any concerns about v3 stability?
3. **Background Jobs:** Accept deferral strategy, or implement Graphile Worker in Phase 1?

### Implementation

4. **Markdown Editor:** Approve CodeMirror 6 over Monaco?
5. **Session Storage:** HTTP-only cookies confirmed?
6. **URL Structure:** `/w/[slug]/videos` or `/workspace/[slug]/videos`?

### Scope

7. **Email Verification:** Required for Phase 1 registration, or defer?
8. **Password Reset:** Required for MVP, or defer to Phase 5?
9. **Status Workflow:** Hardcoded defaults acceptable, or configurable from Phase 2?

---

## Revision History

| Date       | Version | Changes                                                 |
| ---------- | ------- | ------------------------------------------------------- |
| 2025-12-08 | 1.0     | Initial strategic plan with tree-of-thought exploration |
