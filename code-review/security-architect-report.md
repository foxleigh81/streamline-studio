# Comprehensive Security Review Report

## Streamline Studio - Next.js Application

**Review Date:** December 10, 2025
**Application Version:** 0.1.0
**Reviewer:** Web Platform Security Architect (AI-Assisted)

---

## Executive Summary

### Security Posture Rating: **B+ (Good with Room for Improvement)**

Streamline Studio demonstrates a **solid security foundation** with several well-implemented security measures. The codebase shows evidence of security-conscious design decisions documented in ADRs (Architecture Decision Records), particularly ADR-007 (API and Auth), ADR-008 (Multi-Tenancy Strategy), and ADR-014 (Security Architecture).

**Strengths:**

- Strong password hashing with Argon2id
- Proper session management with secure token generation
- CSRF protection via Origin header verification
- Workspace isolation through repository pattern
- Input validation using Zod schemas
- XSS protection for markdown rendering via DOMPurify

**Areas Requiring Attention:**

- Missing Content Security Policy (CSP) headers
- In-memory rate limiting not suitable for production
- Client-side session cookie setting in invitation flow
- Missing Strict-Transport-Security (HSTS) header
- Potential timing attack in invitation token validation

---

## Threat Model Summary

### Key Assets

- User credentials (passwords, session tokens)
- Workspace data (videos, documents, categories)
- Invitation tokens
- Database connection strings
- SMTP credentials
- YouTube OAuth tokens (Phase 6)

### Entry Points

- `/api/trpc/*` - tRPC API endpoints
- `/api/health` - Health check endpoint
- `/login`, `/register`, `/setup` - Authentication pages
- `/invite/[token]` - Invitation acceptance
- Markdown document input

### Primary Threats

- Credential theft and account takeover
- Cross-workspace data access (multi-tenant isolation breach)
- Cross-Site Scripting (XSS)
- Cross-Site Request Forgery (CSRF)
- Session hijacking
- Brute force attacks on authentication
- Information disclosure via error messages
- Supply chain attacks via dependencies

---

## Identified Risks

| Risk                                   | Severity | Category | Location                                         |
| -------------------------------------- | -------- | -------- | ------------------------------------------------ |
| Missing CSP Headers                    | HIGH     | CWE-1021 | `/src/next.config.ts:30-46`                      |
| In-memory Rate Limiting                | HIGH     | CWE-307  | `/src/lib/auth/rate-limit.ts:38`                 |
| Client-side Cookie Setting             | MEDIUM   | CWE-614  | `/src/app/(auth)/invite/[token]/page.tsx:47`     |
| Session Token Returned in Response     | MEDIUM   | CWE-598  | `/src/server/trpc/routers/invitation.ts:452-453` |
| Missing HSTS Header                    | MEDIUM   | CWE-319  | `/next.config.ts:30-46`                          |
| Invitation URL in Environment Variable | MEDIUM   | CWE-798  | `/src/server/trpc/routers/invitation.ts:157`     |
| Non-constant Time Token Comparison     | LOW      | CWE-208  | `/src/server/trpc/routers/invitation.ts:325`     |
| Console Logging of Security Events     | LOW      | CWE-532  | Multiple files                                   |
| Setup Flag File Permissions            | LOW      | CWE-732  | `/src/lib/setup.ts:71`                           |

---

## Critical Vulnerabilities (IMMEDIATE Action Required)

### NONE IDENTIFIED

The application does not have any critical vulnerabilities that would allow immediate exploitation for unauthorized access or data breach.

---

## High-Risk Issues

### 1. Missing Content Security Policy (CSP)

**File:** `next.config.ts` (Lines 30-46)

The application configures several security headers but omits Content Security Policy entirely.

**Current Code:**

```typescript
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Missing CSP!
];
```

**Recommended Implementation:**

```typescript
{
  key: 'Content-Security-Policy',
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https://i.ytimg.com data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ')
}
```

**Impact:** Without CSP, XSS attacks have a larger attack surface. Malicious scripts could be injected and executed.

**Remediation Effort:** Low - Add configuration to `next.config.ts`

---

### 2. In-Memory Rate Limiting Not Production-Ready

**File:** `src/lib/auth/rate-limit.ts` (Line 38)

```typescript
const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();
```

**Issues:**

1. Rate limit state resets on server restart
2. Does not work across multiple server instances
3. Memory leak potential without cleanup

**Recommendation:** Implement Redis-based rate limiting for production/multi-tenant deployments.

```typescript
// Example Redis-based implementation
import { Redis } from '@upstash/redis';

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const redis = Redis.fromEnv();
  const key = `rate_limit:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, WINDOW_SIZE_SECONDS);
  }
  return {
    allowed: count <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - count),
  };
}
```

---

## Medium-Risk Issues

### 3. Client-Side Session Cookie Setting

**File:** `src/app/(auth)/invite/[token]/page.tsx` (Lines 45-48)

```typescript
// Current problematic code
const result = await acceptInvitation({ token, password });
if (result.sessionToken) {
  document.cookie = `session=${result.sessionToken}; path=/`;
}
```

**Issues:**

- Cookie lacks `HttpOnly` flag when set via JavaScript
- Session token exposed to client-side JavaScript
- Inconsistent with other auth flows that use server-side cookie setting

**Recommendation:** Return a redirect from the server action with `Set-Cookie` header:

```typescript
// In server action
cookies().set('session', sessionToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30 days
});
```

---

### 4. Missing HSTS Header

**File:** `next.config.ts`

The application does not set `Strict-Transport-Security` header, which could allow SSL stripping attacks.

**Recommendation:**

```typescript
{
  key: 'Strict-Transport-Security',
  value: 'max-age=31536000; includeSubDomains'
}
```

---

### 5. Invitation URL uses NEXT*PUBLIC* variable

**File:** `src/server/trpc/routers/invitation.ts` (Line 157)

```typescript
const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;
```

**Issue:** `NEXT_PUBLIC_` variables are bundled into client-side JavaScript, which is unnecessary for server-side code.

**Recommendation:** Use a server-side `APP_URL` environment variable instead.

---

## Low-Risk Issues

### 6. Non-constant Time Token Comparison (Timing Attack)

**File:** `src/server/trpc/routers/invitation.ts` (Line 325)

```typescript
const invitation = await db.invitation.findFirst({
  where: { token },
});
```

**Issue:** Database query timing could theoretically leak information about token validity.

**Recommendation:** Use `crypto.timingSafeEqual()` for token comparison after hashing:

```typescript
import { timingSafeEqual } from 'crypto';

// Hash and compare tokens
const hashedInput = hashToken(inputToken);
const hashedStored = invitation.tokenHash;
if (!timingSafeEqual(Buffer.from(hashedInput), Buffer.from(hashedStored))) {
  throw new TRPCError({ code: 'NOT_FOUND' });
}
```

---

### 7. Console Logging of Security Events

**Files:** Multiple files throughout codebase

Security events are logged with `console.log()` which:

- Doesn't persist across server restarts
- Lacks structured format for analysis
- Missing in production environments

**Recommendation:** Implement structured logging with a library like `pino`:

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['password', 'sessionToken', 'token'],
});

logger.info({ event: 'login_success', userId: user.id });
```

---

### 8. Setup Flag File Permissions

**File:** `src/lib/setup.ts` (Line 71)

```typescript
await fs.writeFile(setupFlagPath, 'setup_complete', 'utf-8');
```

**Issue:** File is created with default permissions, potentially readable by other users.

**Recommendation:**

```typescript
await fs.writeFile(setupFlagPath, 'setup_complete', {
  encoding: 'utf-8',
  mode: 0o600, // Owner read/write only
});
```

---

## Security Best Practices Observed

### 1. Strong Password Hashing

**File:** `src/lib/auth/password.ts`

Excellent implementation using Argon2id with OWASP-recommended parameters:

```typescript
memoryCost: 19456,  // 19MB
timeCost: 2,
parallelism: 1
```

### 2. Secure Session Management

**File:** `src/lib/auth/session.ts`

- 256-bit cryptographically secure random tokens
- Tokens hashed before database storage
- HttpOnly cookies with secure flags
- Proper session expiration handling

### 3. CSRF Protection

**File:** `src/middleware.ts`

Origin header verification protects POST/PUT/DELETE requests:

```typescript
if (request.method !== 'GET') {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host || new URL(origin).host !== host) {
    return new Response('Forbidden', { status: 403 });
  }
}
```

### 4. Multi-Tenant Isolation

**File:** `src/server/repositories/workspace-repository.ts`

Repository pattern enforces workspace scoping on all queries:

```typescript
async findById(id: string) {
  return this.db.video.findFirst({
    where: { id, workspaceId: this.workspaceId },
  });
}
```

### 5. Input Validation

All tRPC endpoints use Zod schemas for input validation, preventing malformed data from reaching business logic.

### 6. XSS Prevention in Markdown

**File:** `src/components/document/markdown-preview/markdown-preview.tsx`

DOMPurify with strict allowlist:

```typescript
const sanitized = DOMPurify.sanitize(html, {
  ALLOWED_TAGS: [
    'p',
    'br',
    'strong',
    'em',
    'h1',
    'h2',
    'h3',
    'ul',
    'ol',
    'li',
    'a',
    'code',
    'pre',
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
});
```

### 7. Account Enumeration Prevention

Authentication endpoints return generic error messages that don't reveal whether an account exists.

### 8. Email Security

**File:** `src/lib/email.ts`

- CRLF injection prevention in headers
- HTML entity escaping in email content

---

## Recommended Next Steps

### Immediate (Before Production):

1. ✅ Add Content Security Policy headers
2. ✅ Fix invitation flow to use server-side cookie setting
3. ✅ Add HSTS header

### Short-Term (Within 30 Days):

1. Implement distributed rate limiting for multi-tenant mode
2. Add structured security logging
3. Run `npm audit` and address findings
4. Implement constant-time token comparison

### Ongoing:

1. Regular dependency updates
2. Security header verification in CI/CD
3. Periodic penetration testing

---

## Dependency Security Check

Run the following to check for known vulnerabilities:

```bash
npm audit
npm audit fix
```

Consider adding to CI/CD pipeline:

```yaml
- name: Security Audit
  run: npm audit --audit-level=high
```

---

_Report generated by AI-assisted security review. Manual verification recommended for all findings._
