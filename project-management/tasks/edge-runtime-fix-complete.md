# Edge Runtime Middleware Fix - Complete

**Date**: 2025-12-11
**Status**: Complete
**Issue**: E2E CI stage failing with Edge Runtime compatibility error

## Problem

The e2e CI stage was failing with:

```
⨯ Error: The edge runtime does not support Node.js 'path' module.
Learn More: https://nextjs.org/docs/messages/node-module-in-edge-runtime
    at eval (src/lib/setup.ts:26:29)
```

The middleware was importing `@/lib/setup` (uses `fs`, `path`) and `@/lib/logger` (uses `pino`), both of which depend on Node.js built-in modules that aren't available in Edge Runtime.

## Solution Implemented

### 1. Refactored Middleware to Edge-Compatible CSRF-Only

**File**: `/src/middleware.ts`

Changes:

- Removed `import { isSetupCompleteSync } from '@/lib/setup'`
- Removed `import { createLogger } from '@/lib/logger'`
- Removed all setup wizard redirect logic
- Kept only CSRF protection (Origin header verification)
- Updated JSDoc to clarify new scope
- Reduced from 198 lines to 127 lines
- Pure Edge Runtime compatible (no Node.js modules)

### 2. Moved Setup Detection to Server Component Layouts

Server Components run in Node.js runtime and CAN use `fs`, `path`, and other Node.js modules.

#### `/src/app/(app)/layout.tsx`

Added:

```typescript
import { redirect } from 'next/navigation';
import { isSetupComplete } from '@/lib/setup';
import { serverEnv } from '@/lib/env';

// In single-tenant mode, redirect to setup if not complete
if (serverEnv.MODE === 'single-tenant') {
  const setupComplete = await isSetupComplete();
  if (!setupComplete) {
    redirect('/setup');
  }
}
```

#### `/src/app/(auth)/layout.tsx`

Added same setup detection logic to ensure auth routes also redirect to setup when needed.

#### `/src/app/setup/layout.tsx`

Added:

```typescript
// In multi-tenant mode, setup wizard is disabled
if (serverEnv.MODE === 'multi-tenant') {
  redirect('/');
}

// If setup is already complete, redirect to home
const setupComplete = await isSetupComplete();
if (setupComplete) {
  redirect('/');
}
```

## Verification

### Local Testing

1. **Type Check**: ✅ PASSED

   ```
   npm run type-check
   ```

2. **Lint**: ✅ PASSED

   ```
   npm run lint
   ```

3. **Build**: ✅ PASSED

   ```
   npm run build
   ```

   - No Edge Runtime errors
   - Middleware: 34.3 kB (Edge-compatible)
   - All routes compiled successfully

### CI Pipeline

Next step: Push to GitHub and verify CI pipeline passes all stages:

- lint
- test
- storybook
- **e2e** (previously failing)
- security
- build

## Files Modified

1. `/src/middleware.ts` - Refactored to Edge-compatible CSRF protection only
2. `/src/app/(app)/layout.tsx` - Added setup redirect
3. `/src/app/(auth)/layout.tsx` - Added setup redirect
4. `/src/app/setup/layout.tsx` - Added setup-complete and multi-tenant redirects

## Files Created

1. `/project-management/decisions/edge-runtime-middleware-refactor.md` - Decision record
2. `/project-management/tasks/edge-runtime-fix-complete.md` - This summary

## Architectural Benefits

1. **Better Separation of Concerns**:
   - Middleware = Security (CSRF)
   - Layouts = Routing Logic (Setup wizard)

2. **Performance**: Edge middleware is faster without Node.js I/O

3. **Maintainability**: Clear responsibility boundaries

4. **Standards Compliance**: Follows Next.js best practices for Edge Runtime

## Next Actions

1. ✅ Code changes complete
2. ✅ Local verification passed
3. ⏳ Commit changes
4. ⏳ Push to GitHub
5. ⏳ Verify CI pipeline passes (especially e2e stage)

## References

- [Next.js Edge Runtime](https://nextjs.org/docs/app/building-your-application/rendering/edge-and-nodejs-runtimes)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- ADR-007: API and Authentication
- ADR-011: Self-Hosting Strategy
- ADR-014: Security Architecture
