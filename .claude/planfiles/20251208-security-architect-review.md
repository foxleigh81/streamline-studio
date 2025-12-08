# Security Architect Review: Streamline Studio

**Review Date**: 2025-12-08
**Reviewer**: Web Platform Security Architect
**Scope**: Security Architecture Analysis for Next.js 14+ App Router Application
**Status**: COMPLETE

---

## Executive Summary

This review provides an expert security analysis of Streamline Studio's architecture as documented in ADRs 007 (API and Auth), 008 (Multi-tenancy Strategy), and 011 (Self-hosting Strategy), alongside the QA Risk Assessment findings.

**Overall Security Posture**: ADEQUATE with ACTIONABLE IMPROVEMENTS RECOMMENDED

The architecture demonstrates sound security thinking, particularly in:

- Choice of Lucia Auth for session management
- Application-level multi-tenancy with repository pattern
- Explicit consideration of self-hosting attack vectors

However, several implementation details require clarification and specific Next.js 14+ patterns must be applied correctly to achieve the stated security goals.

---

## Threat Model Summary

### Key Assets

- User credentials (email, password hashes)
- Session tokens
- Video planning content (scripts, descriptions, thumbnails)
- Workspace membership and role data
- Environment secrets (DATABASE_URL, SESSION_SECRET)

### Entry Points

- Authentication endpoints (login, register, password reset)
- tRPC API procedures (all CRUD operations)
- Setup wizard (first-run only)
- Health check endpoint
- File upload (future: thumbnails)

### Primary Threats

| Threat                   | Actor              | Vector                                       | Impact                          |
| ------------------------ | ------------------ | -------------------------------------------- | ------------------------------- |
| Cross-tenant data access | Malicious user     | Application bug bypassing workspace scoping  | Critical - Data breach          |
| Session hijacking        | External attacker  | XSS, network sniffing                        | High - Account takeover         |
| CSRF                     | Malicious website  | State-changing requests without user consent | High - Unauthorized actions     |
| Setup wizard hijack      | External attacker  | Database wipe + wizard access                | Critical - Full system takeover |
| Credential stuffing      | Automated attacker | Bulk login attempts                          | Medium - Account compromise     |
| XSS via markdown         | Malicious user     | Injected script in document content          | High - Session theft            |

---

## Section 1: CSRF Implementation for tRPC + Next.js App Router

### Current State (ADR-007)

The ADR mentions:

- Double-submit cookie pattern
- Content-Type: application/json verification
- Origin/Referer verification as defense-in-depth

### Analysis

**The double-submit cookie pattern is NOT required for tRPC with JSON payloads.**

Modern browsers enforce the Same-Origin Policy for `fetch()` requests with `Content-Type: application/json`. An attacker cannot:

1. Submit JSON via `<form>` (forms only support `application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain`)
2. Submit cross-origin JSON via `fetch()` without CORS preflight

**However**, the Origin header verification approach documented by Lucia is the correct pattern and should be implemented.

### Golden Path: Origin Header Verification in Next.js Middleware

```typescript
// middleware.ts
import { verifyRequestOrigin } from 'lucia';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  // Allow GET, HEAD, OPTIONS requests without CSRF check
  if (
    request.method === 'GET' ||
    request.method === 'HEAD' ||
    request.method === 'OPTIONS'
  ) {
    return NextResponse.next();
  }

  // CSRF Protection: Verify Origin header
  const originHeader = request.headers.get('Origin');
  // Use X-Forwarded-Host when behind reverse proxy (TRUSTED_PROXY=true)
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
  matcher: [
    // Match API routes and tRPC
    '/api/:path*',
    // Exclude static files and images
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### Additional Defense: Content-Type Validation in tRPC Handler

```typescript
// app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '~/server/routers/_app';
import { createContext } from '~/server/context';

const handler = async (req: Request) => {
  // Additional Content-Type validation for mutation requests
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

export { handler as GET, handler as POST };
```

### Rationale

1. **Origin verification** catches the 99% case of CSRF attempts
2. **Content-Type validation** provides defense-in-depth against edge cases
3. **No CSRF tokens needed** for JSON-only API - reduces complexity
4. **SameSite=Lax cookies** (already in ADR-007) prevent cookie attachment on cross-site POST

### What NOT to Do

- Do NOT implement double-submit cookies for tRPC - adds complexity without meaningful security benefit
- Do NOT rely solely on Referer header - can be stripped by browser extensions or corporate proxies
- Do NOT skip CSRF protection assuming "tRPC is safe" - while JSON mitigates many attacks, Origin verification is still necessary

---

## Section 2: Multi-tenancy Isolation Assessment

### Current State (ADR-008)

- Application-level scoping via `WorkspaceRepository<T>` pattern
- tRPC middleware injects workspace context
- All queries require workspace_id (enforced at type level)

### Analysis

**The approach is sound but creates a single point of failure.** A bug in:

- Repository pattern implementation
- Middleware workspace injection
- Developer bypassing repository with raw Drizzle query

...could result in cross-tenant data exposure.

### Recommendations

#### Immediate (Phase 1)

**1. ESLint Rule to Prevent Direct Database Access**

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
      // Allow direct imports only in repository files
      files: ['**/repositories/**/*.ts', '**/lib/db/**/*.ts'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
  ],
};
```

**2. Repository Method for Verifying Workspace Access**

```typescript
// server/repositories/base.ts
export class WorkspaceRepository<T extends WorkspaceScopedTable> {
  constructor(
    private db: DrizzleDb,
    private table: T,
    private workspaceId: string
  ) {}

  async findById(id: string): Promise<InferSelect<T> | null> {
    const [result] = await this.db
      .select()
      .from(this.table)
      .where(
        and(eq(this.table.id, id), eq(this.table.workspaceId, this.workspaceId))
      );

    // Return null, NOT throw - let caller decide how to handle
    return result ?? null;
  }

  async findByIdOrThrow(id: string): Promise<InferSelect<T>> {
    const result = await this.findById(id);
    if (!result) {
      // NOT_FOUND prevents enumeration - don't reveal if ID exists in another workspace
      throw new TRPCError({ code: 'NOT_FOUND' });
    }
    return result;
  }
}
```

**3. Comprehensive Integration Test Suite**

```typescript
// __tests__/integration/tenant-isolation.test.ts
describe('Cross-Tenant Isolation', () => {
  let workspaceA: Workspace;
  let workspaceB: Workspace;
  let userInA: User;
  let userInB: User;

  beforeAll(async () => {
    workspaceA = await createTestWorkspace();
    workspaceB = await createTestWorkspace();
    userInA = await createTestUser({ workspaceId: workspaceA.id });
    userInB = await createTestUser({ workspaceId: workspaceB.id });
  });

  describe.each([
    ['video', 'video.get', 'video.list'],
    ['document', 'document.get', 'document.list'],
    ['category', 'category.get', 'category.list'],
  ])('%s isolation', (entity, getProc, listProc) => {
    it(`prevents ${entity}.get across workspaces`, async () => {
      const entityInA = await createTestEntity(entity, {
        workspaceId: workspaceA.id,
      });
      const callerInB = createAuthenticatedCaller(userInB, workspaceB);

      await expect(
        callerInB[getProc]({ id: entityInA.id })
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it(`prevents ${entity} from appearing in cross-workspace list`, async () => {
      const entityInA = await createTestEntity(entity, {
        workspaceId: workspaceA.id,
        title: 'SECRET_CANARY_VALUE',
      });
      const callerInB = createAuthenticatedCaller(userInB, workspaceB);

      const results = await callerInB[listProc]({});

      expect(results.every((e) => e.title !== 'SECRET_CANARY_VALUE')).toBe(
        true
      );
    });
  });

  it('handles workspace removal during active session', async () => {
    const user = await createTestUser({ workspaceId: workspaceA.id });
    const caller = createAuthenticatedCaller(user, workspaceA);

    // User can initially access
    const video = await createTestEntity('video', {
      workspaceId: workspaceA.id,
    });
    await expect(caller.video.get({ id: video.id })).resolves.toBeDefined();

    // Remove user from workspace
    await removeUserFromWorkspace(user.id, workspaceA.id);

    // Subsequent access should fail
    await expect(caller.video.get({ id: video.id })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});
```

#### Future (Phase 5+): PostgreSQL RLS as Defense-in-Depth

If pursuing SOC 2 compliance or after any security incident, add RLS:

```sql
-- Enable RLS on tenant-scoped tables
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create policy that checks workspace_id against session variable
CREATE POLICY workspace_isolation ON videos
  USING (workspace_id = current_setting('app.current_workspace_id')::uuid);

-- Application sets this at start of each request
SET LOCAL app.current_workspace_id = 'workspace-uuid-here';
```

**Note**: This requires careful connection pool management. Drizzle does not have first-class RLS support, so implementation would require custom session variable handling.

---

## Section 3: Self-Hosting Security Posture

### Current State (ADR-011)

- Docker-based deployment
- Setup wizard on first run
- Persistent completion flag (file-based)
- Health check endpoint
- Auto-migration on startup

### Analysis

The QA Risk Assessment correctly identified several concerns. Here are specific implementation requirements:

### 3.1 Setup Wizard Security

**Risk**: If an attacker can trigger the setup wizard after initial setup, they can create an admin account.

**Implementation Pattern**:

```typescript
// lib/setup.ts
import fs from 'fs';
import path from 'path';

const SETUP_FLAG_PATH = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, '.setup-complete')
  : '/data/.setup-complete';

export async function isSetupComplete(): Promise<boolean> {
  // Check file flag first (survives database wipe)
  const fileFlag = fs.existsSync(SETUP_FLAG_PATH);

  // Also check database has at least one user
  const userCount = await db.select({ count: count() }).from(users);
  const hasUsers = userCount[0].count > 0;

  // Setup is complete if EITHER condition is true
  return fileFlag || hasUsers;
}

export async function markSetupComplete(): Promise<void> {
  // Create flag file
  fs.writeFileSync(SETUP_FLAG_PATH, new Date().toISOString());

  // Log for audit trail
  console.log(`[Security] Setup completed at ${new Date().toISOString()}`);
}

// Middleware to protect setup routes
export async function setupGuard(): Promise<void> {
  if (await isSetupComplete()) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Setup has already been completed',
    });
  }
}
```

**Setup Wizard Route Protection**:

```typescript
// app/setup/page.tsx
import { redirect } from "next/navigation";
import { isSetupComplete } from "@/lib/setup";

export default async function SetupPage() {
  if (await isSetupComplete()) {
    // Redirect to login if setup already done
    redirect("/login");
  }

  return <SetupWizard />;
}
```

### 3.2 Docker Security Configuration

**Dockerfile Hardening**:

```dockerfile
# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app

# Security: Run as non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Security: Remove unnecessary packages
RUN apk --no-cache add dumb-init && \
    rm -rf /var/cache/apk/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy application files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle

# Create data directory for setup flag
RUN mkdir -p /data && chown nextjs:nodejs /data

USER nextjs

EXPOSE 3000

# Use dumb-init to properly handle signals
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "scripts/start.js"]
```

**docker-compose.yml Security Improvements**:

```yaml
version: '3.8'

services:
  app:
    image: streamline-studio:latest
    build: .
    ports:
      - '3000:3000'
    environment:
      - DATABASE_URL=postgresql://streamline:${POSTGRES_PASSWORD}@db:5432/streamline
      - SESSION_SECRET=${SESSION_SECRET}
      - MODE=single-tenant
      - DATA_DIR=/data
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - appdata:/data
    restart: unless-stopped
    # Security: Limit capabilities
    security_opt:
      - no-new-privileges:true
    # Security: Read-only root filesystem where possible
    read_only: true
    tmpfs:
      - /tmp

  db:
    image: postgres:16-alpine
    environment:
      # CRITICAL: Never use default credentials
      - POSTGRES_USER=streamline
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=streamline
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U streamline -d streamline']
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    # Security: Don't expose database port to host
    # ports:
    #   - '5432:5432'  # Only uncomment for debugging

volumes:
  pgdata:
  appdata:
```

**Required: .env.example with secure defaults**:

```bash
# .env.example
# REQUIRED: Generate with: openssl rand -base64 32
SESSION_SECRET=

# REQUIRED: Generate with: openssl rand -base64 24
POSTGRES_PASSWORD=

# Optional: Set to 'multi-tenant' for SaaS deployment
MODE=single-tenant

# Optional: Set to 'true' when behind reverse proxy (nginx, Caddy, etc.)
TRUSTED_PROXY=false
```

### 3.3 Health Endpoint Security

```typescript
// app/api/health/route.ts
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Only check database connectivity, don't leak info
    await db.execute(sql`SELECT 1`);

    return Response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Don't expose error details
    return Response.json(
      {
        status: 'error',
        // Generic message - no stack traces or connection strings
        message: 'Service unavailable',
      },
      { status: 503 }
    );
  }
}

// Explicitly mark as public - no auth required
export const dynamic = 'force-dynamic';
```

---

## Section 4: Security Headers Configuration

### 4.1 Next.js Security Headers (next.config.js)

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // XSS Protection (legacy browsers)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions Policy - disable unnecessary features
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
      {
        // HSTS only for production (don't lock out during development)
        source: '/(.*)',
        headers:
          process.env.NODE_ENV === 'production'
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains',
                },
              ]
            : [],
      },
    ];
  },
};

module.exports = nextConfig;
```

### 4.2 Content Security Policy with Nonces

For applications using CodeMirror 6 (as planned in ADR-013), a nonce-based CSP is required:

```typescript
// middleware.ts
import { verifyRequestOrigin } from 'lucia';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  // === CSRF Protection ===
  if (
    request.method !== 'GET' &&
    request.method !== 'HEAD' &&
    request.method !== 'OPTIONS'
  ) {
    const originHeader = request.headers.get('Origin');
    const hostHeader =
      process.env.TRUSTED_PROXY === 'true'
        ? (request.headers.get('X-Forwarded-Host') ??
          request.headers.get('Host'))
        : request.headers.get('Host');

    if (
      !originHeader ||
      !hostHeader ||
      !verifyRequestOrigin(originHeader, [hostHeader])
    ) {
      return new NextResponse(null, { status: 403 });
    }
  }

  // === Content Security Policy ===
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

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

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set('Content-Security-Policy', cspHeader);

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health).*)'],
};
```

**Note on style-src 'unsafe-inline'**: CodeMirror 6 dynamically injects styles. While `'unsafe-inline'` for styles is less risky than for scripts, a future improvement could use CSS-in-JS libraries that support nonces.

### 4.3 Accessing Nonce in Components

```typescript
// lib/nonce.ts
import { headers } from 'next/headers';

export function getNonce(): string {
  return headers().get('x-nonce') ?? '';
}
```

```typescript
// app/layout.tsx
import { getNonce } from "@/lib/nonce";
import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = getNonce();

  return (
    <html lang="en">
      <head>
        {/* Any inline scripts must include nonce */}
        <Script nonce={nonce} strategy="beforeInteractive">
          {`/* Critical inline script */`}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

## Section 5: Cookie Security Configuration

### Lucia Configuration (Complete)

```typescript
// lib/auth.ts
import { Lucia, TimeSpan } from 'lucia';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { db, sessions, users } from '@/lib/db';

const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

export const lucia = new Lucia(adapter, {
  sessionExpiresIn: new TimeSpan(30, 'd'), // 30 days
  sessionCookie: {
    name: 'session',
    expires: false, // Session cookie persists until expiry
    attributes: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      // Path should be "/" to work across all routes
      path: '/',
    },
  },
  getUserAttributes: (attributes) => ({
    email: attributes.email,
    name: attributes.name,
  }),
  getSessionAttributes: (attributes) => ({
    // Include workspace for session binding (optional enhancement)
    currentWorkspaceId: attributes.currentWorkspaceId,
  }),
});

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      email: string;
      name: string;
    };
    DatabaseSessionAttributes: {
      currentWorkspaceId: string | null;
    };
  }
}
```

### Session Invalidation on Password Change

```typescript
// server/routers/auth.ts
export const authRouter = router({
  changePassword: authedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify current password
      const user = await ctx.repos.users.findById(ctx.user.id);
      const validPassword = await verifyPassword(
        user.passwordHash,
        input.currentPassword
      );

      if (!validPassword) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Current password is incorrect',
        });
      }

      // Check password strength
      const isCommon = await isCommonPassword(input.newPassword);
      if (isCommon) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Password is too common. Please choose a stronger password.',
        });
      }

      // Hash new password
      const newHash = await hashPassword(input.newPassword);

      await db.transaction(async (tx) => {
        // Update password
        await tx
          .update(users)
          .set({ passwordHash: newHash, updatedAt: new Date() })
          .where(eq(users.id, ctx.user.id));

        // Invalidate ALL sessions except current
        await tx
          .delete(sessions)
          .where(
            and(
              eq(sessions.userId, ctx.user.id),
              ne(sessions.id, ctx.session.id)
            )
          );

        // Audit log
        await tx.insert(auditLogs).values({
          userId: ctx.user.id,
          action: 'PASSWORD_CHANGED',
          metadata: {
            sessionsInvalidated: true,
            timestamp: new Date().toISOString(),
          },
        });
      });

      return { success: true };
    }),
});
```

---

## Section 6: Additional Security Concerns

### 6.1 Rate Limiting Implementation

The ADR-007 rate limiting configuration is correct. Here's the implementation pattern for tRPC:

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { TRPCError } from '@trpc/server';

// For self-hosted: use in-memory store
// For SaaS: use Redis
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
        message: 'Too many attempts. Please try again later.',
      });
    }
  } else {
    // In-memory rate limiting
    const now = Date.now();
    const record = inMemoryStore.get(key);

    if (!record || now > record.resetAt) {
      inMemoryStore.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }

    if (record.count >= limit) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many attempts. Please try again later.',
      });
    }

    record.count++;
  }
}
```

```typescript
// Usage in auth router
export const authRouter = router({
  login: publicProcedure.input(loginSchema).mutation(async ({ input, ctx }) => {
    const ip = getClientIP(ctx.req);

    // Rate limit by IP
    await checkRateLimit(`login:ip:${ip}`, 5, 60_000);

    // Rate limit by email (prevents distributed attacks)
    await checkRateLimit(`login:email:${input.email}`, 5, 60_000);

    // ... login logic
  }),
});

function getClientIP(req: Request): string {
  if (process.env.TRUSTED_PROXY === 'true') {
    const forwarded = req.headers.get('x-forwarded-for');
    return forwarded?.split(',')[0].trim() ?? 'unknown';
  }
  // In Next.js, there's no direct IP access - would need custom header
  return 'direct';
}
```

### 6.2 XSS Prevention in Markdown Preview

```typescript
// lib/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

// Restrictive DOMPurify config for markdown preview
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
  ALLOWED_ATTR: [
    'href',
    'src',
    'alt',
    'title',
    'class', // For syntax highlighting
  ],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target'], // For opening links in new tab
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

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, SANITIZE_CONFIG);
}

// Force all links to open in new tab and have noopener
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});
```

### 6.3 Password Policy Implementation

```typescript
// lib/password-policy.ts
import { hash, verify } from '@node-rs/argon2';

// Top 10,000 most common passwords (load from file)
// Source: https://github.com/danielmiessler/SecLists
const COMMON_PASSWORDS = new Set(/* load from file */);

export interface PasswordValidation {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidation {
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

  // Optional: Check for character diversity
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    errors.push('Password should contain both letters and numbers');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: 19456, // 19 MiB
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  return verify(hash, password);
}
```

### 6.4 Account Enumeration Prevention

```typescript
// server/routers/auth.ts
export const authRouter = router({
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input }) => {
      // Rate limit
      await checkRateLimit(`register:ip:${ip}`, 3, 3600_000); // 3/hour

      // Check if email exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, input.email.toLowerCase()),
      });

      if (existingUser) {
        // DON'T reveal that email exists
        // Instead, behave identically to success case
        // In production, send "account already exists" email
        return {
          success: true,
          message:
            'If this email is not registered, you will receive a confirmation email.',
        };
      }

      // ... create user

      return {
        success: true,
        message:
          'If this email is not registered, you will receive a confirmation email.',
      };
    }),

  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      // Always return same response regardless of whether email exists
      // This prevents email enumeration
      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email.toLowerCase()),
      });

      if (user) {
        // Send actual reset email
        await sendPasswordResetEmail(user);
      }

      // Same response either way
      return {
        message:
          'If an account exists for this email, you will receive reset instructions.',
      };
    }),
});
```

---

## Section 7: Recommendation for Security ADR

**RECOMMENDATION: YES - Create a dedicated Security ADR (ADR-014)**

### Rationale

The current security considerations are scattered across:

- ADR-007 (Auth/CSRF)
- ADR-008 (Multi-tenancy isolation)
- ADR-011 (Self-hosting)
- QA Risk Assessment

A dedicated Security ADR would:

1. Consolidate all security decisions in one reference document
2. Define the security baseline for contributors
3. Provide clear implementation requirements
4. Document security testing requirements
5. Establish incident response procedures

### Proposed ADR-014 Structure

```markdown
# ADR-014: Security Architecture

## Scope

- Authentication and session security
- Authorization and access control
- Input validation and output encoding
- Transport security
- Security headers
- Rate limiting
- Audit logging
- Incident response

## Non-Functional Requirements

- All security tests must pass before merge
- No secrets in version control
- All dependencies must pass npm audit with no critical/high vulnerabilities
- Security review required for auth-related changes

## Security Checklist (per PR)

- [ ] No hardcoded secrets
- [ ] Input validated with Zod
- [ ] Output properly encoded
- [ ] Workspace scoping verified
- [ ] Rate limiting applied to public endpoints
- [ ] Audit log entry added for sensitive operations
```

---

## Section 8: Risk Matrix Summary

| Risk                                      | Severity | Status    | Mitigation                                             |
| ----------------------------------------- | -------- | --------- | ------------------------------------------------------ |
| Cross-tenant data access                  | Critical | Mitigated | Repository pattern + integration tests                 |
| CSRF                                      | High     | Mitigated | Origin header verification in middleware               |
| Setup wizard hijack                       | Critical | Mitigated | File-based flag + database check                       |
| Session hijacking                         | High     | Mitigated | HTTP-only, Secure, SameSite=Lax cookies                |
| XSS via markdown                          | High     | Mitigated | DOMPurify with restrictive config                      |
| Credential stuffing                       | Medium   | Mitigated | Rate limiting per IP and email                         |
| Session persistence after password change | Medium   | Mitigated | Invalidate all sessions on change                      |
| Account enumeration                       | Low      | Mitigated | Identical responses for existing/non-existing accounts |
| Missing security headers                  | Medium   | Mitigated | next.config.js headers configuration                   |
| Container running as root                 | Medium   | Mitigated | Dockerfile USER instruction                            |

---

## Residual Risks and Assumptions

### Residual Risks

1. **Application-level multi-tenancy remains a single point of failure** - Mitigated by testing and code review, but a bug could still cause cross-tenant access. Consider RLS in Phase 5+ for defense-in-depth.

2. **In-memory rate limiting in self-hosted mode** - An attacker could restart the container to reset limits. For high-security deployments, recommend Redis.

3. **No WAF/DDoS protection in self-hosted mode** - Users deploying without a reverse proxy are exposed. Documented in deployment guide.

4. **Browser-based local storage for document backup** - Could be accessed by malicious browser extensions. Low risk given target user profile.

### Assumptions

1. Users follow deployment documentation (secure passwords, HTTPS, etc.)
2. Reverse proxy handles TLS termination in production
3. Database backups are user's responsibility
4. Node.js and dependencies are kept updated
5. Docker images are pulled from trusted registry

---

## References

- [Lucia Auth v3 Documentation - CSRF Protection](https://v3.lucia-auth.com/guides/validate-session-cookies)
- [Next.js Security Guide - Server Components and Actions](https://nextjs.org/blog/security-nextjs-server-components-actions)
- [Next.js CSP Configuration](https://nextjs.org/docs/pages/guides/content-security-policy)
- [tRPC Next.js App Router Setup](https://trpc.io/docs/client/nextjs/setup)
- [OWASP Cheat Sheet - CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP Cheat Sheet - Docker Security](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- [TurboStarter Next.js Security Guide 2025](https://www.turbostarter.dev/blog/complete-nextjs-security-guide-2025-authentication-api-protection-and-best-practices)

---

_Security Architecture Review completed by Web Platform Security Architect_
_ADRs analyzed: 007, 008, 011_
_QA Risk Assessment integrated: Yes_
_Code examples provided: 15_
_Specific Next.js 14+ patterns documented: Yes_
_Recommendation for Security ADR: Yes (ADR-014)_
