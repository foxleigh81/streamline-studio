# Decision: Edge Runtime Middleware Refactor

**Date**: 2025-12-11
**Status**: In Progress
**Relates to**: CI Pipeline Fix - E2E Test Failures

## Context

The e2e CI stage is failing with the error:

```
⨯ Error: The edge runtime does not support Node.js 'path' module.
Learn More: https://nextjs.org/docs/messages/node-module-in-edge-runtime
    at eval (src/lib/setup.ts:26:29)
```

### Root Cause

The `src/middleware.ts` file currently imports:

1. `@/lib/setup` - Uses Node.js modules (`fs`, `fs/promises`, `path`)
2. `@/lib/logger` - Uses `pino` with `pino-pretty` transport
3. `@/lib/env` - Uses zod (pure JavaScript - OK)

Next.js middleware runs in the **Edge Runtime**, which is a lightweight JavaScript runtime that doesn't support Node.js built-in modules. This is by design for performance and cold-start optimization.

### Current Middleware Responsibilities

1. Setup wizard redirection (first-run detection) - **Uses Node.js APIs**
2. CSRF protection via Origin header verification - **Pure JavaScript**

## Decision

Refactor the middleware to be Edge Runtime compatible by:

1. **Remove Node.js dependencies from middleware**
   - Remove `isSetupCompleteSync()` import from `@/lib/setup`
   - Remove `createLogger()` import from `@/lib/logger`
   - Keep only `serverEnv` from `@/lib/env` (zod is Edge-compatible)

2. **Simplify middleware to CSRF protection only**
   - Keep `verifyRequestOrigin()` function (pure JavaScript)
   - Keep CSRF protection logic for POST/PUT/DELETE/PATCH requests
   - Remove all setup wizard redirect logic

3. **Move setup detection to Server Components**
   - Server components run in Node.js runtime and CAN use `fs`/`path`
   - Add setup redirect to `src/app/(app)/layout.tsx`
   - Add setup redirect to `src/app/(auth)/layout.tsx`
   - Add "already complete" redirect to `src/app/setup/layout.tsx`

## Implementation Plan

### Phase 1: Refactor Middleware (Senior Developer)

**File**: `/src/middleware.ts`

Changes:

- Remove `import { isSetupCompleteSync } from '@/lib/setup'`
- Remove `import { createLogger } from '@/lib/logger'`
- Remove `const logger = createLogger('middleware')`
- Remove all setup wizard redirect logic (lines 60-108)
- Keep only CSRF protection (lines 110-177)
- Update JSDoc comments to reflect new scope
- Simplify for Edge Runtime compatibility

**Result**: Middleware only handles CSRF, no Node.js modules

### Phase 2: Add Setup Detection to Layouts (Senior Developer)

**File**: `/src/app/(app)/layout.tsx`

Add server-side setup check:

```typescript
import { redirect } from 'next/navigation';
import { isSetupComplete } from '@/lib/setup';
import { serverEnv } from '@/lib/env';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // In single-tenant mode, redirect to setup if not complete
  if (serverEnv.MODE === 'single-tenant') {
    const setupComplete = await isSetupComplete();
    if (!setupComplete) {
      redirect('/setup');
    }
  }

  return <TRPCProvider>{children}</TRPCProvider>;
}
```

**File**: `/src/app/(auth)/layout.tsx`

Add server-side setup check:

```typescript
import { redirect } from 'next/navigation';
import { isSetupComplete } from '@/lib/setup';
import { serverEnv } from '@/lib/env';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // In single-tenant mode, redirect to setup if not complete
  if (serverEnv.MODE === 'single-tenant') {
    const setupComplete = await isSetupComplete();
    if (!setupComplete) {
      redirect('/setup');
    }
  }

  return <TRPCProvider>...</TRPCProvider>;
}
```

**File**: `/src/app/setup/layout.tsx`

Add "already complete" redirect:

```typescript
import { redirect } from 'next/navigation';
import { isSetupComplete } from '@/lib/setup';
import { serverEnv } from '@/lib/env';

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  // In multi-tenant mode, setup wizard is disabled
  if (serverEnv.MODE === 'multi-tenant') {
    redirect('/');
  }

  // If setup is already complete, redirect to home
  const setupComplete = await isSetupComplete();
  if (setupComplete) {
    redirect('/');
  }

  return <TRPCProvider>{children}</TRPCProvider>;
}
```

### Phase 3: Testing (QA Architect)

1. **Local Development Testing**
   - Run `npm run dev` - should start without errors
   - Test setup wizard flow (delete `.setup-complete` file)
   - Test CSRF protection (verify POST requests blocked without Origin)
   - Test authenticated routes redirect to setup when flag missing

2. **Build Testing**
   - Run `npm run build` - should complete without Edge Runtime errors
   - Verify production build includes middleware correctly

3. **CI Pipeline Testing**
   - Push to branch and verify CI passes:
     - lint stage
     - test stage
     - storybook stage
     - **e2e stage** (currently failing)
     - security stage
     - build stage

## Benefits

1. **CI Pipeline Fixed**: E2E tests will pass without Edge Runtime errors
2. **Better Architecture**: Server Components are the right place for server-side redirects
3. **Performance**: Edge middleware is faster without Node.js I/O operations
4. **Cleaner Separation**:
   - Middleware = Security (CSRF)
   - Layouts = Routing Logic (Setup redirects)

## Risks & Mitigation

### Risk: Setup redirect timing

- **Issue**: Server Component redirects happen after layout load
- **Impact**: Minimal - redirect happens before children render
- **Mitigation**: None needed - this is standard Next.js pattern

### Risk: Multi-tenant mode behavior

- **Issue**: Need to ensure setup wizard is properly disabled
- **Impact**: Could expose setup wizard in multi-tenant deployments
- **Mitigation**: Check `serverEnv.MODE` in all three layouts

## Alternative Considered: Environment Variable for Setup

We considered using a simple environment variable instead of file-based setup tracking:

```typescript
// Instead of isSetupComplete()
const setupComplete = process.env.SETUP_COMPLETE === 'true';
```

**Rejected because**:

- File-based approach persists across container restarts
- File-based approach is more secure (read-only flag)
- File-based approach includes metadata (timestamp, version)
- ADR-011 explicitly mandates file-based tracking

## References

- ADR-007: API and Authentication (CSRF Protection)
- ADR-011: Self-Hosting Strategy (Setup Wizard)
- ADR-014: Security Architecture
- Next.js Docs: [Edge Runtime](https://nextjs.org/docs/app/building-your-application/rendering/edge-and-nodejs-runtimes)
- Next.js Docs: [Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)

## Approval

- **Technical Lead**: Approved (automated via code review)
- **Security Architect**: Review required for CSRF-only middleware
- **QA Architect**: Testing plan approved
