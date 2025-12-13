# E2E Test Fix Attempts Tracker

## Problem Statement

57 of 88 E2E tests fail in CI. All auth-related tests timeout waiting for form elements because pages redirect to `/setup`.

## Root Causes Identified (MULTIPLE ISSUES)

### Issue 1: Missing .env file for standalone server (FIXED in Attempt 6)

1. Playwright config sources `.next/standalone/.env` before starting server
2. CI was not creating this file
3. Without it, DATA_DIR defaults to `/data` → setup flag not found → redirect to /setup

### Issue 2: Missing static assets for standalone server (FIXED in Attempt 7)

**After fixing Issue 1, a NEW failure pattern emerged:**

- Tests that just check page structure PASS (pages load correctly)
- Tests that require JavaScript interaction FAIL (form submissions, validation errors)

**Root cause:** Next.js standalone output does NOT include static assets automatically.
According to Next.js docs, you MUST copy:

- `.next/static` → `.next/standalone/.next/static`
- `public` → `.next/standalone/public`

Without this, client-side JavaScript bundles aren't served, so React can't hydrate and interactive features don't work.

**Evidence from CI logs:**

```
✓ renders login form with all required fields (PASS - just checks DOM)
✓ login page is accessible (PASS - just checks DOM)
✘ shows error for empty email (FAIL - requires JS click + React state)
✘ login form with errors is accessible (FAIL - requires JS interaction)
```

### Previous theories that were WRONG:

- "Static rendering bakes redirects into HTML" - Server Components execute at REQUEST time
- The "(static)" designation only means the HTML **shell** is pre-rendered

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

### Attempt 5: Move setup flag creation before build (WRONG THEORY)

- **File**: `.github/workflows/ci.yml`
- **Changes**:
  1. Moved "Create setup flag" step BEFORE "Build Next.js application"
  2. Added DATA_DIR env var to build step
  3. Removed standalone .env injection
- **Rationale** (INCORRECT):
  - Based on wrong theory that static rendering bakes redirects into HTML
- **Result**: FAILED - Static rendering theory was wrong
- **Status**: Implemented but ineffective

### Attempt 6: Restore .env file creation for standalone server (PARTIAL FIX)

- **File**: `.github/workflows/ci.yml`
- **Changes**:
  1. Added "Configure standalone server environment" step AFTER build, BEFORE tests
  2. Creates `.next/standalone/.env` with: DATA_DIR, DATABASE_URL, SESSION_SECRET, MODE, E2E_TEST_MODE, NODE_ENV
- **Rationale**:
  - Playwright command sources `.next/standalone/.env` before starting server
  - Without this file, DATA_DIR is undefined and defaults to `/data`
  - Server can't find setup flag → redirects to /setup
- **Result**: PARTIAL SUCCESS - Fixed redirect issue, but revealed NEW issue with missing static assets
- **Status**: Committed but incomplete

### Attempt 7: Copy static assets for standalone server (ACTUAL FIX)

- **File**: `.github/workflows/ci.yml`
- **Changes**:
  1. Added "Copy static assets for standalone server" step AFTER build
  2. Copies `.next/static` to `.next/standalone/.next/static`
  3. Copies `public` to `.next/standalone/public`
- **Rationale**:
  - Next.js standalone output does NOT include static assets by default
  - Without static assets, client-side JS bundles aren't served
  - React can't hydrate, so interactive features (forms, buttons) don't work
  - This is documented in Next.js: https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
- **Result**: IMPLEMENTING NOW
- **Status**: In progress

## Current State

- **Issue 1 (redirect)**: FIXED - .env file is created with correct DATA_DIR
- **Issue 2 (no JS)**: FIXING - Adding static assets copy step
- **Combined fix**: Both steps needed for tests to pass

## Why This Fix Will Work

1. **Env vars propagate**: .env file created and sourced by Playwright command
2. **Setup flag found**: DATA_DIR=/tmp/streamline-data → flag exists → no redirect
3. **JS bundles served**: Static assets copied → React hydrates → forms work
4. **Full interactivity**: Client-side validation, form submission, state updates all work

## Next Steps

- [x] Identify Issue 1 (missing .env file)
- [x] Fix Issue 1 (add .env creation step)
- [x] Identify Issue 2 (missing static assets)
- [x] Fix Issue 2 (add static assets copy step)
- [ ] Commit and push changes
- [ ] Monitor CI run
- [ ] Verify all 88 E2E tests pass
