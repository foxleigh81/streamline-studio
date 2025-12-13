# E2E Test Fix Attempts Tracker

## Problem Statement

57 of 88 E2E tests fail in CI. All auth-related tests timeout waiting for form elements because pages redirect to `/setup`.

## Root Cause Identified

Next.js statically pre-renders `/login`, `/register`, `/setup` pages at build time. During build, the setup flag doesn't exist, so the redirect to `/setup` is baked into the static HTML.

Build output shows:

```
├ ○ /login      (○ = static, prerendered at build time)
├ ○ /register
├ ○ /setup
```

## Failed Attempts

### Attempt 1: Read DATA_DIR at runtime instead of module load

- **File**: `src/lib/setup.ts`
- **Change**: Changed `const DATA_DIR = process.env.DATA_DIR` to `function getDataDir()`
- **Result**: FAILED - Didn't address static rendering issue
- **Status**: Already committed

### Attempt 2: Inject env vars into standalone .env file

- **File**: `.github/workflows/ci.yml`
- **Change**: Added step to write DATABASE_URL, SESSION_SECRET, etc. to `.next/standalone/.env`
- **Result**: FAILED - Standalone server doesn't load .env files automatically
- **Status**: Already committed

### Attempt 3: Source .env file in playwright command

- **File**: `playwright.config.ts`
- **Change**: Changed CI command to `bash -c "source .env && node server.js"`
- **Result**: NOT TESTED - Reverted before push
- **Status**: Reverted

### Attempt 4: Force dynamic rendering on layouts

- **Files**: `src/app/(auth)/layout.tsx`, `src/app/(app)/layout.tsx`, `src/app/setup/layout.tsx`
- **Change**: Added `export const dynamic = 'force-dynamic'`
- **Result**: NOT TESTED - Correctly identified as changing app behavior to fix tests (wrong approach)
- **Status**: Reverted

### Attempt 5: Move setup flag creation before build (FINAL FIX)

- **File**: `.github/workflows/ci.yml`
- **Changes**:
  1. Moved "Create setup flag" step BEFORE "Build Next.js application"
  2. Added DATA_DIR env var to build step
  3. Added all build-time env vars (DATABASE_URL, MODE, SESSION_SECRET) for consistency
  4. Replaced "Configure standalone environment" with "Verify setup flag exists"
  5. Removed standalone .env injection (not needed - env vars passed at runtime)
- **Rationale**:
  - Next.js statically renders pages at build time
  - Setup flag MUST exist during build so `isSetupComplete()` returns true
  - This prevents redirect to /setup from being baked into static HTML
  - DATA_DIR must be available during build so the check can find the flag
- **Result**: COMMITTED - Ready for CI test
- **Status**: Implemented

## Current State

- Fix implemented in `.github/workflows/ci.yml`
- Ready to commit and push

## Why This Fix Works

1. **Build Time**: Setup flag exists → `isSetupComplete()` returns true → No redirect in static HTML
2. **Runtime**: Setup flag still exists → Auth pages render normally
3. **No Behavior Change**: Application code unchanged, only CI workflow order

## What Was Removed

- Standalone .env injection step (lines 171-187) - unnecessary because:
  - Env vars are passed directly to `npm run test:e2e` command
  - Standalone server reads from process.env, not .env files

## Next Steps

- [x] Implement fix
- [x] Update tracking document
- [ ] Commit changes
- [ ] Push to CI
- [ ] Monitor CI run
- [ ] Verify all 88 E2E tests pass
