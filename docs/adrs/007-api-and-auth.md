# ADR-007: API Style and Authentication

**Status**: Accepted (Extended by ADR-017)
**Date**: 2025-12-08
**Extended By**: ADR-017 (Teamspace Hierarchy Architecture) - 2025-12-15
**Deciders**: Strategic Project Planner, Lead Developer, QA Architect

> **Note**: ADR-017 extends this ADR with a two-tier permission model (teamspace roles with project-level overrides) while maintaining the core tRPC and Lucia Auth decisions.

## Context

The application needs internal APIs for:

- CRUD operations on videos, documents, categories
- Authentication flows (register, login, logout)
- Document versioning operations
- Workspace management

This ADR covers two related decisions:

1. API style for client-server communication
2. Authentication library choice

## Decision

### API Style: tRPC

Use **tRPC** for all internal API communication between the Next.js frontend and backend.

### Authentication: Lucia Auth

Use **Lucia Auth** for session-based authentication with email/password.

## Consequences

### API Style (tRPC)

**Positive:**

- End-to-end type safety with automatic inference
- Excellent developer experience (autocomplete across the stack)
- Reduced boilerplate (no manual type definitions)
- Automatic request batching
- Native Next.js App Router integration
- Middleware support for auth and workspace scoping

**Negative:**

- Tight coupling between frontend and backend
- No REST for external access (would need separate layer)
- Network requests less readable than REST in dev tools
- Learning curve for developers unfamiliar with tRPC

### Authentication (Lucia Auth)

**Positive:**

- Well-tested session management
- Drizzle adapter available
- No external service dependencies (critical for self-hosting)
- Active community and maintenance
- Handles edge cases (session rotation, expiry) correctly

**Negative:**

- Additional dependency
- v3 is relatively new
- Less documentation than Auth.js

## Alternatives Considered

### API: REST with Zod

**Pros:**

- Industry standard, widely understood
- Easy to expose to external consumers
- Clear HTTP semantics

**Cons:**

- Manual type synchronization between client and server
- More boilerplate for type-safe fetching
- No built-in batching

### API: Next.js Server Actions

**Pros:**

- Zero API code for mutations
- Very low boilerplate

**Cons:**

- Less structured for complex apps
- Awkward for data fetching (reads)
- Harder to test in isolation

### Auth: Custom Implementation

**Pros:**

- Full control
- No dependencies

**Cons:**

- Security responsibility entirely on us
- Risk of subtle bugs in session management
- More code to maintain

### Auth: Auth.js (NextAuth)

**Pros:**

- Very mature, large community
- Handles OAuth well

**Cons:**

- Heavy for email/password-only
- Recent v5 breaking changes
- Magic patterns can be hard to customize

## Discussion

### Strategic Project Planner

"Let me map out our API needs:

- Simple CRUD for videos, categories, documents
- Authentication (register, login, logout)
- Document versioning (save with version check, get history, restore)
- Workspace management (create, switch, invite in Phase 5)

This is mostly straightforward CRUD with some RPC-style operations like 'restore version'. GraphQL's flexibility isn't needed since we control both client and server."

"For auth, we have a hard constraint: self-hosted deployments must not require external services. This rules out anything that pushes toward OAuth providers as the primary path."

### Lead Developer

"I've worked extensively with both tRPC and REST. For a full-stack Next.js app where we own the entire stack, tRPC is hard to beat for DX.

Here's a concrete comparison. With tRPC:

```typescript
// Server
export const videoRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.repos.video.findMany({ status: input.status });
    }),
});

// Client
const { data } = trpc.video.list.useQuery({ status: 'scripting' });
// data is fully typed, no manual definitions
```

With REST, I'd need to:

1. Define the route handler
2. Export the response type
3. Create a typed fetch wrapper
4. Import types in the frontend

That's 2-3x the code for the same functionality.

For auth, Lucia is the sweet spot. It's more secure than rolling our own, lighter than Auth.js, and has no external dependencies. The Drizzle adapter exists and works."

### QA Architect

"Type safety is great for catching bugs early, but I want to address debuggability. When something goes wrong in production, REST endpoints are easier to inspect with standard tools."

"Also, what about the future YouTube integration? If we need to expose APIs for webhook callbacks or a mobile app, tRPC doesn't help."

### Lead Developer (Response)

"Valid concerns. For debugging, tRPC requests show up in the network tab - they're just POST to /api/trpc with a JSON body. Not as clean as REST but workable with tRPC DevTools.

For external APIs, here's my approach: internal operations stay tRPC. If we need external endpoints later, we add a thin REST layer under /api/v1/ that calls the same business logic. This way:

- Internal code gets tRPC DX benefits
- External consumers get proper REST
- Business logic is shared

We're not building external APIs in MVP, so deferring this decision costs nothing."

### QA Architect (On Auth)

"For Lucia, I want explicit tests for:

1. Session expiry behaves correctly
2. Session refresh works on activity
3. Logout actually invalidates server-side session
4. Rate limiting on login is effective
5. CSRF protection is in place

The plan mentions CSRF via Origin header verification. That's not sufficient alone - some browsers/proxies strip Origin. We need proper CSRF token handling."

### Lead Developer (Response)

"Agreed. I'll implement double-submit cookie pattern for CSRF. For tRPC specifically, we also verify Content-Type is application/json - browsers don't send JSON in form submissions, so this provides additional protection.

Session configuration will be:

- HTTP-only cookies (XSS protection)
- Secure flag in production
- SameSite=Lax
- 30-day expiry with refresh on activity"

### Strategic Project Planner (Conclusion)

"Decision is tRPC + Lucia Auth. The risks are ecosystem coupling (tRPC) and library maturity (Lucia v3). Both are acceptable given our control over the full stack and our ability to abstract the auth interface if needed."

## Implementation Notes

### tRPC Setup

```typescript
// Routers
- authRouter: register, login, logout
- videoRouter: list, get, create, update, delete
- documentRouter: get, update
- categoryRouter: list, create, update, delete
- workspaceRouter: get, update (Phase 5: create, switch)

// Middleware chain
publicProcedure -> authedProcedure -> workspaceProcedure
```

### Lucia Configuration

```typescript
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

### CSRF Protection

- Double-submit cookie pattern
- Verify Content-Type: application/json
- Verify Origin/Referer as defense-in-depth

### Rate Limiting Configuration

Rate limiting is critical for authentication endpoints. The following limits apply:

| Endpoint                 | Limit        | Window     | Key       |
| ------------------------ | ------------ | ---------- | --------- |
| Login                    | 5 attempts   | Per minute | Per IP    |
| Registration             | 3 attempts   | Per hour   | Per IP    |
| Password Reset (Phase 5) | 3 attempts   | Per hour   | Per email |
| General API              | 100 requests | Per minute | Per user  |

**Implementation Notes:**

1. **Per-IP Limiting**: Use `X-Forwarded-For` when `TRUSTED_PROXY=true` is set
2. **Per-Email Limiting**: Prevents email enumeration via password reset
3. **User-based Limiting**: Authenticated endpoints use user ID, not IP

```typescript
// Example rate limiting middleware
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  keyGenerator: (req) => {
    if (process.env.TRUSTED_PROXY === 'true') {
      return req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    }
    return req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many login attempts. Please try again later.',
    });
  },
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  keyGenerator: (req) => {
    if (process.env.TRUSTED_PROXY === 'true') {
      return req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    }
    return req.ip;
  },
});
```

**TRUSTED_PROXY Validation:**

When `TRUSTED_PROXY=true`, validate that requests actually come through a proxy:

```typescript
// Warn if TRUSTED_PROXY is set but no proxy headers present
if (process.env.TRUSTED_PROXY === 'true') {
  const hasProxyHeaders = req.headers['x-forwarded-for'] !== undefined;
  if (!hasProxyHeaders) {
    console.warn(
      '[Security] TRUSTED_PROXY=true but no X-Forwarded-For header. Rate limiting may be ineffective.'
    );
  }
}
```

### Session Invalidation

When a user changes their password:

1. Invalidate all sessions except the current one
2. Log the password change in the audit log
3. Send notification to user's email (Phase 5)

```typescript
async function changePassword(userId: string, currentSessionId: string) {
  await db.transaction(async (tx) => {
    // Update password
    await tx.update(users).set({ passwordHash }).where(eq(users.id, userId));

    // Invalidate all other sessions
    await tx
      .delete(sessions)
      .where(
        and(eq(sessions.userId, userId), ne(sessions.id, currentSessionId))
      );
  });
}
```
