# Task Briefing: 1.2 - Implement Redis-Based Rate Limiting

**Task ID:** CRIT-002
**Assigned To:** Security Architect
**Priority:** Critical
**Status:** Assigned - Awaiting Start
**Estimated Effort:** 3 days

---

## Mission

Replace the in-memory rate limiting implementation with a Redis-based solution that works correctly in production multi-instance deployments and persists across server restarts.

## Context

**Current Problem:**

The authentication rate limiting uses an in-memory Map:

```typescript
// src/lib/auth/rate-limit.ts:38
const ipRequestCounts = new Map<string, RateLimitRecord>();
```

This has critical flaws:

1. **Resets on server restart** - attacker can bypass by causing restart
2. **Doesn't work across multiple instances** - attacker can distribute requests across instances
3. **Memory leak potential** - no cleanup mechanism for old entries

**Impact:** Rate limiting is completely bypassable in production, allowing unlimited brute force attempts.

## Acceptance Criteria

You must deliver ALL of the following:

- [ ] Rate limiting persists across server restarts
- [ ] Rate limiting works correctly across multiple server instances
- [ ] Graceful fallback if Redis is unavailable (configurable: fail-open with warning OR fail-closed)
- [ ] Memory leak eliminated
- [ ] Existing rate limit logic preserved (window size, max requests, exponential backoff)
- [ ] Environment configuration for Redis connection
- [ ] Backward compatibility with in-memory mode for local development (optional)

## Files to Modify

### Primary Implementation

- `/Users/foxleigh81/dev/internal/streamline-studio/src/lib/auth/rate-limit.ts`

### Environment Configuration

- `/Users/foxleigh81/dev/internal/streamline-studio/src/lib/env.ts` (add REDIS_URL validation)

### Documentation Updates (if needed)

- `.env.example`
- `docker-compose.yml` (if adding Redis service)
- Setup wizard documentation

## Implementation Requirements

### 1. Redis Client Selection

Choose ONE of the following based on deployment target:

**Option A: @upstash/redis (Recommended for serverless)**

- Pros: HTTP-based, works in serverless environments, managed service
- Cons: Requires Upstash account
- Use case: Vercel, Netlify, serverless deployments

**Option B: ioredis (Recommended for traditional deployments)**

- Pros: Full Redis protocol, works with any Redis instance, self-hosted friendly
- Cons: Requires TCP connection, not serverless-compatible
- Use case: Docker, VPS, traditional deployments

**Decision Required:** Consult Project Orchestrator if unclear which to use. Consider: Is this application primarily deployed to serverless or traditional infrastructure?

### 2. Environment Variable Configuration

Add to `src/lib/env.ts`:

```typescript
REDIS_URL: z.string().url().optional(), // Optional for development
```

Provide clear error messaging if REDIS_URL is not set in production.

### 3. Rate Limiting Logic Preservation

**Must maintain existing behavior:**

- Window size: 15 minutes (900 seconds)
- Max requests: 5 attempts
- Exponential backoff for repeated violations
- IP-based tracking
- Return format: `{ allowed: boolean; remaining: number }`

### 4. Fallback Strategy

Design decision needed: When Redis is unavailable, should the application:

**Option A: Fail-open (allow requests, log warning)**

- Pros: Application stays available
- Cons: Rate limiting temporarily disabled

**Option B: Fail-closed (deny requests)**

- Pros: Security maintained
- Cons: Application unavailable if Redis is down

**Recommendation:** Fail-closed for production, fail-open for development. Make this configurable.

### 5. Development Mode Support

Provide in-memory fallback for local development when REDIS_URL is not set:

```typescript
if (!process.env.REDIS_URL && process.env.NODE_ENV === 'development') {
  // Use existing in-memory implementation
  console.warn('Using in-memory rate limiting in development mode');
}
```

## Technical Implementation Details

### Redis Key Structure

Design a clear key naming convention:

```typescript
// Recommended format:
const key = `rate_limit:auth:${ip}`;

// Or for more granularity:
const key = `rate_limit:${endpoint}:${ip}`;
```

### Sliding Window Implementation

```typescript
// Pseudo-code approach:
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const key = `rate_limit:auth:${ip}`;

  // Increment counter
  const count = await redis.incr(key);

  // Set expiration on first request
  if (count === 1) {
    await redis.expire(key, WINDOW_SIZE_SECONDS);
  }

  return {
    allowed: count <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - count),
  };
}
```

### Error Handling

Must handle:

- Redis connection failures
- Network timeouts
- Redis unavailable scenarios
- Invalid responses

## Testing Requirements

Before marking complete, verify:

1. **Multi-instance correctness:** Rate limit enforced across instances
2. **Persistence:** Rate limit survives server restart
3. **Expiration:** Old rate limit records are cleaned up
4. **Fallback behavior:** Graceful degradation when Redis unavailable
5. **Existing tests pass:** All authentication tests still pass
6. **TypeScript compilation:** No new type errors

## Dependencies

- **Depends On:** None (fully independent task)
- **Blocks:** Production deployment
- **Package Dependency:** Will add either `@upstash/redis` or `ioredis`

## Security Considerations

1. **Redis connection security:**
   - Use TLS for Redis connections in production
   - Ensure REDIS_URL is not logged or exposed
   - Use connection pooling if using ioredis

2. **Rate limit bypass prevention:**
   - Consider X-Forwarded-For header handling for proxies
   - Document IP extraction strategy

3. **DoS prevention:**
   - Rate limit the rate limiter itself (Redis request rate)
   - Set reasonable TTLs on all keys

## Reference Materials

- Current implementation: `/Users/foxleigh81/dev/internal/streamline-studio/src/lib/auth/rate-limit.ts`
- Security review report: `/Users/foxleigh81/dev/internal/streamline-studio/code-review/security-architect-report.md`
- Upstash Redis docs: https://upstash.com/docs/redis
- ioredis docs: https://github.com/redis/ioredis

## Escalation Protocol

**Escalate to Project Orchestrator immediately if:**

- Unclear which Redis client to use (Upstash vs ioredis)
- Questions about deployment target or infrastructure
- Uncertainty about fail-open vs fail-closed strategy
- Need clarification on backward compatibility requirements
- Package dependency conflicts
- Environment variable strategy questions

**Do NOT proceed with implementation if uncertain about deployment architecture.**

## Definition of Done

Task is complete when:

1. Redis-based rate limiting implemented and tested
2. Environment configuration added and documented
3. Fallback strategy implemented
4. All existing rate limiting behavior preserved
5. TypeScript compilation succeeds
6. Manual testing confirms multi-instance correctness
7. Development mode still works without Redis
8. Task status updated in phase-1-status.md
9. Completion summary provided to Project Orchestrator

---

**Assigned:** December 10, 2025
**Expected Completion:** Within 3 days of start
**Status:** Ready to begin
