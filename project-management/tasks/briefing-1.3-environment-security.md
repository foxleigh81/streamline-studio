# Task Briefing: 1.3 - Harden Environment Variable Security

**Task ID:** CRIT-003
**Assigned To:** Security Architect
**Priority:** Critical
**Status:** Assigned - Awaiting Start
**Estimated Effort:** 0.5 days (4 hours)

---

## Mission

Remove development defaults from sensitive environment variables to prevent accidental use of development credentials or weak secrets in production environments.

## Context

**Current Problem:**

The environment validation in `src/lib/env.ts` provides development defaults for critical security variables:

```typescript
// Dangerous pattern - development defaults could leak to production
DATABASE_URL: process.env.NODE_ENV === 'development'
  ? 'postgresql://dev:dev@localhost:5432/streamline'
  : process.env.DATABASE_URL,

SESSION_SECRET: process.env.NODE_ENV === 'development'
  ? 'dev-secret-not-for-production'
  : process.env.SESSION_SECRET,
```

**Why This Is Critical:**

1. If `NODE_ENV` is misconfigured (missing, typo, etc.), production could use development credentials
2. Development database could be accidentally exposed to production traffic
3. Weak development secrets could be used in production
4. Violates security principle: fail secure, not fail open

## Acceptance Criteria

You must deliver ALL of the following:

- [ ] No development defaults for `DATABASE_URL` in production-adjacent code
- [ ] No development defaults for `SESSION_SECRET` in production-adjacent code
- [ ] Clear, actionable error messages when required variables are missing
- [ ] Validation fails fast at application startup (before handling any requests)
- [ ] Environment variable documentation updated (`.env.example`, README, etc.)
- [ ] Development setup still works (different approach needed)

## Files to Modify

### Primary Implementation

- `/Users/foxleigh81/dev/internal/streamline-studio/src/lib/env.ts`

### Documentation Updates

- `/Users/foxleigh81/dev/internal/streamline-studio/.env.example`
- `/Users/foxleigh81/dev/internal/streamline-studio/README.md` (if environment setup section exists)
- `/Users/foxleigh81/dev/internal/streamline-studio/docker-compose.yml` (ensure development values are in environment section)

## Implementation Requirements

### 1. Remove Conditional Defaults

**Current (Problematic):**

```typescript
DATABASE_URL: z.string()
  .url()
  .default(
    process.env.NODE_ENV === 'development' ? 'postgresql://...' : undefined
  );
```

**Target (Secure):**

```typescript
DATABASE_URL: z.string().url(), // No default - must be explicitly set
SESSION_SECRET: z.string().min(32), // No default - must be explicitly set
```

### 2. Provide Clear Error Messages

When validation fails, developers should know exactly what to do:

```typescript
// Example error handling
try {
  const env = envSchema.parse(process.env);
} catch (error) {
  console.error('❌ Environment validation failed:');
  console.error('Missing required environment variables.');
  console.error('');
  console.error(
    'For local development, copy .env.example to .env and fill in values:'
  );
  console.error('  cp .env.example .env');
  console.error('');
  process.exit(1);
}
```

### 3. Update `.env.example`

Ensure `.env.example` contains all required variables with descriptive comments:

```bash
# Database connection string
# Local development example: postgresql://user:password@localhost:5432/streamline
DATABASE_URL=postgresql://...

# Session secret (minimum 32 characters)
# Generate with: openssl rand -base64 32
SESSION_SECRET=your-secret-here-minimum-32-characters

# Redis URL (optional in development, required in production)
REDIS_URL=redis://localhost:6379
```

### 4. Development Environment Strategy

**Problem:** Developers still need easy local setup.

**Solution Options:**

**Option A: Require local .env file**

- Developers must create `.env` with development values
- Provides `.env.example` as template
- Pros: Explicit, secure by default
- Cons: Extra setup step

**Option B: Separate env schema for development**

- Use different validation in development vs production
- Keep defaults for development only
- Pros: Easy developer experience
- Cons: More complex code

**Recommendation:** Option A (require local `.env`). Security over convenience for production safety.

### 5. Docker Compose Updates

Ensure `docker-compose.yml` provides development environment variables:

```yaml
services:
  app:
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/streamline
      SESSION_SECRET: dev-secret-only-used-in-docker-compose
      NODE_ENV: development
```

## Security Considerations

### Variables to Harden

**Critical (No defaults allowed):**

- `DATABASE_URL` - Database connection string
- `SESSION_SECRET` - Session signing secret

**High Priority (No production defaults):**

- `REDIS_URL` - May have development fallback (in-memory)
- `SMTP_PASSWORD` - Email service credentials

**Medium Priority (Can have sensible defaults):**

- `SMTP_HOST` - Can default to localhost for development
- `SMTP_PORT` - Standard ports OK
- `LOG_LEVEL` - Can default to 'info'

### Fail-Fast Principle

Application should:

1. Validate environment on startup (before server starts)
2. Exit with code 1 if validation fails
3. Never start with invalid or missing critical variables
4. Never silently fall back to unsafe defaults

## Testing Requirements

Before marking complete, verify:

1. **Production simulation:** Unset `DATABASE_URL`, confirm application refuses to start
2. **Clear error messages:** Error output is helpful and actionable
3. **Development still works:** With proper `.env` file, development works normally
4. **Docker Compose still works:** `docker-compose up` works without changes
5. **TypeScript compilation:** No type errors introduced
6. **Documentation accuracy:** `.env.example` has all required variables

## Edge Cases to Handle

1. **Empty string vs undefined:**
   - `DATABASE_URL=""` should fail validation
   - `DATABASE_URL=undefined` should fail validation

2. **Partial configuration:**
   - If `DATABASE_URL` is set but `SESSION_SECRET` is missing, should fail with clear message about which variable is missing

3. **Invalid formats:**
   - `DATABASE_URL="not-a-url"` should fail with format error
   - `SESSION_SECRET="short"` should fail with length requirement

## Dependencies

- **Depends On:** None (fully independent task)
- **Blocks:** Phase 2 Task 2.1 (Security Headers) - must have secure env first
- **Related To:** Task 1.2 (Redis Rate Limiting) - will add `REDIS_URL` variable

## Reference Materials

- Current implementation: `/Users/foxleigh81/dev/internal/streamline-studio/src/lib/env.ts`
- Security review: `/Users/foxleigh81/dev/internal/streamline-studio/code-review/security-architect-report.md` (Section on environment variables)
- Zod documentation: https://zod.dev/

## Escalation Protocol

**Escalate to Project Orchestrator immediately if:**

- Uncertain about which variables should have defaults
- Questions about development environment setup impact
- Docker Compose changes needed but unclear
- Conflicts with existing setup wizard logic
- Questions about environment variable naming or structure

**Do NOT remove defaults without confirming they're truly security-critical.**

## Definition of Done

Task is complete when:

1. All critical environment variables require explicit values
2. No conditional defaults based on `NODE_ENV` for security variables
3. Application fails fast on startup if variables missing
4. Error messages are clear and actionable
5. `.env.example` is complete and accurate
6. Development environment still works with `.env` file
7. Docker Compose still works without code changes
8. TypeScript compilation succeeds
9. Task status updated in phase-1-status.md
10. Completion summary provided to Project Orchestrator

## Additional Notes

### Migration Guide for Existing Deployments

Consider creating a migration notice for existing installations:

```markdown
## ⚠️ Breaking Change: Environment Variables

As of [version], the following environment variables are now required:

- DATABASE_URL (no default)
- SESSION_SECRET (no default)

Action required:

1. Ensure these variables are set in your environment
2. Verify values are production-appropriate
3. Update deployment configurations
```

---

**Assigned:** December 10, 2025
**Expected Completion:** Within 0.5 days (4 hours) of start
**Status:** Ready to begin
