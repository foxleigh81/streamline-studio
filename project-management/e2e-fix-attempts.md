# E2E Test Fix Attempts Tracker

## Problem Statement

57 of 88 E2E tests fail in CI. All auth-related tests timeout waiting for form elements because pages redirect to `/setup`.

## Root Cause Identified (CORRECTED)

**Previous theory was WRONG.** The "static rendering bakes redirect into HTML" theory was incorrect.

**The ACTUAL root cause:**

1. Playwright config (line 81) runs: `bash -c "set -a && source .next/standalone/.env && set +a && node .next/standalone/server.js"`
2. This command **sources `.next/standalone/.env`** before starting the server
3. **CI does not create this file** - the step was removed as "unnecessary"
4. Without the .env file being sourced, DATA_DIR is undefined
5. DATA_DIR defaults to `/data` (not `/tmp/streamline-data`)
6. The setup flag at `/tmp/streamline-data/.setup-complete` is not found
7. `isSetupComplete()` returns false → redirect to `/setup`

**Why the static rendering theory was wrong:**

- Server Components with `redirect()` execute at **REQUEST time**, not build time
- The "(static)" designation only means the HTML **shell** is pre-rendered
- The redirect logic in layouts runs every request via Server Components
- Lead Developer analysis: "The `redirect()` function from `next/navigation` does NOT bake a redirect into static HTML"

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

### Attempt 6: Restore .env file creation for standalone server (ACTUAL FIX)

- **File**: `.github/workflows/ci.yml`
- **Changes**:
  1. Added "Configure standalone server environment" step AFTER build, BEFORE tests
  2. Creates `.next/standalone/.env` with: DATA_DIR, DATABASE_URL, SESSION_SECRET, MODE, E2E_TEST_MODE, NODE_ENV
- **Rationale**:
  - Playwright command sources `.next/standalone/.env` before starting server
  - Without this file, DATA_DIR is undefined and defaults to `/data`
  - Server can't find setup flag → redirects to /setup
- **Result**: IMPLEMENTED - Ready for CI test
- **Status**: Committed

## Current State

- **Root cause correctly identified**: Missing `.next/standalone/.env` file
- **Fix**: Add step to create the .env file that Playwright expects
- **Key insight**: The env vars in `webServer.env` are unreliable with standalone builds - the bash sourcing approach is correct but the file must exist

## Why This Fix Will Work

1. **Playwright sources .env**: The command `source .next/standalone/.env` requires the file to exist
2. **DATA_DIR propagates**: After sourcing, DATA_DIR=/tmp/streamline-data is in the environment
3. **Setup flag found**: Server checks `/tmp/streamline-data/.setup-complete` and finds it
4. **No redirect**: `isSetupComplete()` returns true, pages render normally

## What Was Wrong Before

- Removed the .env injection step thinking it was "unnecessary"
- Kept the Playwright command that depends on it - MISMATCH
- Conflated `webServer.env` (unreliable) with sourced .env file (reliable)

## Next Steps

- [x] Identify correct root cause
- [x] Update tracking document
- [x] Add .env creation step to CI workflow
- [ ] Commit changes
- [ ] Push to CI
- [ ] Monitor CI run
- [ ] Verify all 88 E2E tests pass
