# ADR-014: Comprehensive Security Architecture

**Status**: Accepted
**Date**: 2025-12-08
**Deciders**: Strategic Project Planner, Lead Developer, QA Architect, Security Architect

## Context

Security requirements for Streamline Studio are currently distributed across multiple ADRs:

- ADR-007 (API and Authentication)
- ADR-008 (Multi-Tenancy Strategy)
- ADR-011 (Self-Hosting Strategy)

This fragmentation creates difficulties for:

1. Security audits and reviews
2. New developer onboarding
3. Penetration testing scope definition
4. Compliance preparation (SOC 2, etc.)

This ADR consolidates all security decisions into a single authoritative reference while referencing the detailed implementations in other ADRs.

## Decision

Implement a **defense-in-depth security architecture** with the following components:

1. **Authentication hardening** (password policy, session management)
2. **Authorization isolation** (workspace scoping, RLS evaluation)
3. **CSRF protection** (Origin header verification)
4. **Rate limiting** with proper proxy support
5. **Docker container hardening**
6. **Setup wizard security**
7. **Security testing requirements**

## Threat Model

### Key Assets

| Asset                      | Sensitivity | Location              |
| -------------------------- | ----------- | --------------------- |
| User credentials           | Critical    | PostgreSQL (hashed)   |
| Session tokens             | High        | HTTP-only cookies     |
| Video planning content     | Medium      | PostgreSQL            |
| Workspace membership/roles | High        | PostgreSQL            |
| Environment secrets        | Critical    | Environment variables |

### Primary Threats

| Threat                   | Actor              | Vector                  | Impact   | Mitigation                              |
| ------------------------ | ------------------ | ----------------------- | -------- | --------------------------------------- |
| Cross-tenant data access | Malicious user     | Application bug         | Critical | WorkspaceRepository + integration tests |
| Session hijacking        | External attacker  | XSS, network sniffing   | High     | HTTP-only/Secure/SameSite cookies       |
| CSRF                     | Malicious website  | State-changing requests | High     | Origin header verification              |
| Setup wizard hijack      | External attacker  | Database wipe           | Critical | File-based flag + database check        |
| Credential stuffing      | Automated attacker | Bulk login attempts     | Medium   | Rate limiting per IP and email          |
| XSS via markdown         | Malicious user     | Injected script         | High     | DOMPurify with restrictive config       |

## Security Requirements

### 1. Password Policy

```typescript
interface PasswordPolicy {
  minLength: 8;
  maxLength: 128;

  // Common password check using top 10,000 list
  blocklist: {
    source: 'top-10000-common-passwords.txt';
  };

  // Complexity NOT enforced (research shows length > complexity)
  requireUppercase: false;
  requireNumber: false;
  requireSpecial: false;

  // User messaging
  feedback: {
    tooShort: 'Password must be at least 8 characters';
    tooCommon: 'This password is too common. Please choose a different password.';
  };
}
```

**Implementation:**

```typescript
// lib/password-policy.ts
import { hash, verify } from '@node-rs/argon2';

const COMMON_PASSWORDS = new Set(/* loaded from file */);

export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('Password is too common. Please choose a stronger password.');
  }

  return { valid: errors.length === 0, errors };
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: 19456, // 19 MiB
    timeCost: 2,
    parallelism: 1,
  });
}
```

### 2. CSRF Protection

**Decision: Origin Header Verification (NOT double-submit cookies)**

For tRPC with JSON payloads, double-submit cookies are unnecessary. Modern browsers enforce Same-Origin Policy for `fetch()` with `Content-Type: application/json`.

**Implementation (middleware.ts):**

```typescript
import { verifyRequestOrigin } from 'lucia';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  // Allow GET, HEAD, OPTIONS without CSRF check
  if (
    request.method === 'GET' ||
    request.method === 'HEAD' ||
    request.method === 'OPTIONS'
  ) {
    return NextResponse.next();
  }

  // CSRF Protection: Verify Origin header
  const originHeader = request.headers.get('Origin');
  const hostHeader =
    process.env.TRUSTED_PROXY === 'true'
      ? (request.headers.get('X-Forwarded-Host') ?? request.headers.get('Host'))
      : request.headers.get('Host');

  if (
    !originHeader ||
    !hostHeader ||
    !verifyRequestOrigin(originHeader, [hostHeader])
  ) {
    return new NextResponse(null, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

**Additional Defense - Content-Type Validation in tRPC Handler:**

```typescript
// app/api/trpc/[trpc]/route.ts
const handler = async (req: Request) => {
  if (req.method === 'POST') {
    const contentType = req.headers.get('Content-Type');
    if (!contentType?.includes('application/json')) {
      return new Response('Invalid Content-Type', { status: 400 });
    }
  }

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
  });
};
```

### 3. Session Management

**Configuration:**

```typescript
interface SessionPolicy {
  lifetime: {
    maxAge: '30d'; // Maximum session age
    renewalThreshold: '7d'; // Renew if older than this
  };

  security: {
    invalidateOnPasswordChange: true; // REQUIRED
    invalidateOnEmailChange: true; // REQUIRED
    concurrentSessionLimit: null; // null = unlimited
    bindToIp: false; // Breaks mobile users
    bindToUserAgent: false; // Breaks browser updates
  };
}
```

**Lucia Configuration:**

```typescript
export const lucia = new Lucia(adapter, {
  sessionExpiresIn: new TimeSpan(30, 'd'),
  sessionCookie: {
    name: 'session',
    expires: false,
    attributes: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    },
  },
});
```

**Session Invalidation on Password Change:**

```typescript
async function changePassword(
  userId: string,
  currentSessionId: string,
  newPasswordHash: string
) {
  await db.transaction(async (tx) => {
    // Update password
    await tx
      .update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    // Invalidate ALL sessions except current
    await tx
      .delete(sessions)
      .where(
        and(eq(sessions.userId, userId), ne(sessions.id, currentSessionId))
      );

    // Audit log
    await tx.insert(auditLogs).values({
      userId,
      action: 'PASSWORD_CHANGED',
      metadata: { sessionsInvalidated: true },
    });
  });
}
```

### 4. Workspace Isolation

**Primary Control: WorkspaceRepository Pattern (ADR-008)**

**Defense-in-Depth: ESLint Rule**

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'drizzle-orm',
            importNames: ['eq', 'and', 'or', 'sql'],
            message:
              'Use WorkspaceRepository methods instead of direct Drizzle queries. See ADR-008.',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ['**/repositories/**/*.ts', '**/lib/db/**/*.ts'],
      rules: { 'no-restricted-imports': 'off' },
    },
  ],
};
```

**Integration Test Requirements:**

```typescript
describe('Cross-Tenant Isolation', () => {
  it.each([
    ['video', 'video.get'],
    ['document', 'document.get'],
    ['category', 'category.get'],
  ])('prevents %s access across workspaces', async (entity, procedure) => {
    const entityInA = await createTestEntity(entity, {
      workspaceId: workspaceA.id,
    });
    const callerInB = createAuthenticatedCaller(userInB, workspaceB);

    await expect(
      callerInB[procedure]({ id: entityInA.id })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
```

**Future (Phase 5+): PostgreSQL RLS**

Consider Row-Level Security as defense-in-depth for SOC 2 compliance:

```sql
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_isolation ON videos
  USING (workspace_id = current_setting('app.current_workspace_id')::uuid);
```

### 5. Rate Limiting

**Limits (from ADR-007):**

| Endpoint       | Limit        | Window     | Key                |
| -------------- | ------------ | ---------- | ------------------ |
| Login          | 5 attempts   | Per minute | Per IP + Per email |
| Registration   | 3 attempts   | Per hour   | Per IP             |
| Password Reset | 3 attempts   | Per hour   | Per email          |
| General API    | 100 requests | Per minute | Per user           |

**Implementation:**

```typescript
// lib/rate-limit.ts
const ratelimit = process.env.UPSTASH_REDIS_REST_URL
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, '1 m'),
    })
  : null;

// In-memory fallback for self-hosted
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<void> {
  if (ratelimit) {
    const { success } = await ratelimit.limit(key);
    if (!success) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many attempts.',
      });
    }
  } else {
    const now = Date.now();
    const record = inMemoryStore.get(key);

    if (!record || now > record.resetAt) {
      inMemoryStore.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }

    if (record.count >= limit) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many attempts.',
      });
    }

    record.count++;
  }
}
```

### 6. Security Headers

**next.config.js:**

```javascript
async headers() {
  return [{
    source: "/(.*)",
    headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-XSS-Protection", value: "1; mode=block" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ],
  }];
}
```

**Content Security Policy (with CodeMirror 6):**

```typescript
const cspHeader = `
  default-src 'self';
  script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, ' ')
  .trim();
```

**Note:** `style-src 'unsafe-inline'` is required for CodeMirror 6 dynamic styles.

### 7. XSS Prevention

**DOMPurify Configuration for Markdown Preview:**

```typescript
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'br',
    'hr',
    'ul',
    'ol',
    'li',
    'blockquote',
    'pre',
    'code',
    'strong',
    'em',
    'del',
    'ins',
    'a',
    'img',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: [
    'script',
    'style',
    'iframe',
    'form',
    'input',
    'object',
    'embed',
  ],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
};

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});
```

### 8. Setup Wizard Security

**Security State Machine:**

| File Flag | DB Has Users | Behavior               |
| --------- | ------------ | ---------------------- |
| Missing   | Empty        | Show wizard            |
| Missing   | Has users    | Redirect to error page |
| Present   | Empty        | Redirect to error page |
| Present   | Has users    | Redirect to login      |

**Implementation:**

```typescript
const SETUP_FLAG_PATH = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, '.setup-complete')
  : '/data/.setup-complete';

export async function isSetupComplete(): Promise<boolean> {
  const fileFlag = fs.existsSync(SETUP_FLAG_PATH);
  const userCount = await db.select({ count: count() }).from(users);
  const hasUsers = userCount[0].count > 0;

  // Setup is complete if EITHER condition is true
  return fileFlag || hasUsers;
}

export async function markSetupComplete(): Promise<void> {
  fs.writeFileSync(SETUP_FLAG_PATH, new Date().toISOString());
  console.log(`[Security] Setup completed at ${new Date().toISOString()}`);
}
```

### 9. Docker Hardening

**See ADR-011 for complete Dockerfile. Key security requirements:**

1. **Non-root user**: `USER nextjs` (uid 1001)
2. **Signal handling**: `dumb-init` entrypoint
3. **Capabilities**: `no-new-privileges: true`
4. **Filesystem**: Read-only where possible
5. **Credentials**: No default passwords in docker-compose

### 10. Account Enumeration Prevention

```typescript
// Registration and password reset return identical responses
// regardless of whether account exists
return {
  success: true,
  message:
    'If this email is not registered, you will receive a confirmation email.',
};
```

## Security Testing Requirements

### Phase 1 Security Tests

- [ ] Password policy enforced (min 8 chars, common password rejection)
- [ ] Rate limiting blocks 6th login attempt within 60 seconds
- [ ] CSRF protection blocks cross-origin mutations
- [ ] Session invalidated on password change
- [ ] Cross-tenant access returns NOT_FOUND (not FORBIDDEN)
- [ ] No secrets in application logs

### Phase 4 Security Tests

- [ ] Setup wizard inaccessible after first user
- [ ] Docker container runs as non-root
- [ ] Health endpoint returns no sensitive data
- [ ] Penetration test scope: auth flows, multi-tenancy, API endpoints

### Phase 5 Security Tests

- [ ] Cross-tenant penetration test
- [ ] Invitation token attempt limiting
- [ ] Role-based access control enforcement

## Security Checklist (Per PR)

For any PR touching security-sensitive code:

- [ ] No hardcoded secrets
- [ ] Input validated with Zod
- [ ] Output properly encoded (DOMPurify for HTML)
- [ ] Workspace scoping verified
- [ ] Rate limiting applied to public endpoints
- [ ] Audit log entry added for sensitive operations
- [ ] Tests cover security requirements

## Residual Risks

| Risk                                                    | Severity | Mitigation                                     | Status     |
| ------------------------------------------------------- | -------- | ---------------------------------------------- | ---------- |
| Application-level multi-tenancy single point of failure | High     | Integration tests + code review + consider RLS | Accepted   |
| In-memory rate limiting resets on container restart     | Medium   | Recommend Redis for high-security deployments  | Documented |
| No WAF/DDoS protection in self-hosted                   | Medium   | Document reverse proxy recommendations         | Documented |

## Consequences

### Positive

- Single source of truth for security requirements
- Clear audit trail for compliance
- Defined penetration testing scope
- Consistent implementation patterns

### Negative

- Additional documentation to maintain
- Some duplication with implementation ADRs

## References

- ADR-007: API Style and Authentication
- ADR-008: Multi-Tenancy Strategy
- ADR-011: Self-Hosting Strategy
- [Lucia Auth v3 - CSRF Protection](https://v3.lucia-auth.com/guides/validate-session-cookies)
- [Next.js Security Guide](https://nextjs.org/blog/security-nextjs-server-components-actions)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
