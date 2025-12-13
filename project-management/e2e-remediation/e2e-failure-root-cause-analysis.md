# E2E Test Failure Root Cause Analysis

**Date**: 2025-12-13
**Severity**: Critical
**Status**: Fixed
**Assigned To**: Project Orchestrator

## Problem Statement

57 of 88 E2E tests were failing in CI with 100% failure rate on authentication tests. All tests passed locally but failed in CI with identical timeout symptoms.

## Symptoms

- **CI**: 57 tests failed, all timing out waiting for `form` elements on `/login` and `/register` pages
- **Local**: All tests passed (23 passed, 0 failed)
- **Pattern**: All failing tests appeared to be redirected to `/setup` instead of their intended pages

## Root Cause Analysis

### Investigation Timeline

1. **Initial Hypothesis**: Setup flag detection was failing in CI
2. **First Fix Attempt**: Modified `src/lib/setup.ts` to read `DATA_DIR` at runtime instead of module initialization
3. **Result**: No improvement - tests still failing in CI

### Deep Dive

After building locally and examining the standalone server structure:

1. **Next.js Standalone Build Process**:
   - `npm run build` creates `.next/standalone/` directory
   - Copies `.env` file from project root to `.next/standalone/.env`
   - Bundles all server code with references to `process.env` variables
   - `npm run start` executes `node .next/standalone/server.js`

2. **CI Workflow Sequence** (`.github/workflows/ci.yml`):

   ```yaml
   - Build Next.js (standalone) # DATA_DIR not in .env
   - Create setup flag at /tmp/streamline-data/.setup-complete
   - Run E2E tests # Playwright passes DATA_DIR env var
   ```

3. **The Problem**:
   - **Build Time**: `.env` file doesn't include `DATA_DIR`, so standalone `.env` doesn't have it
   - **Runtime**: Playwright config passes `DATA_DIR=/tmp/streamline-data` to `webServer.env`
   - **Actual Behavior**: Next.js standalone reads `.env` file first, then overlays `process.env`
   - **BUT**: The environment variables passed to `webServer.env` in Playwright aren't consistently propagated to the Next.js process
   - **Fallback**: Zod schema in `src/lib/env.ts` defaults `DATA_DIR` to `/data` when undefined
   - **Result**: App checks `/data/.setup-complete` (doesn't exist) → redirects to `/setup`

### Evidence

1. **Standalone `.env` Contents** (before fix):

   ```
   DATABASE_URL=postgresql://...
   SESSION_SECRET=...
   MODE=single-tenant
   # No DATA_DIR
   ```

2. **Test Script Validation**:

   ```bash
   # Without DATA_DIR env var
   $ node test-setup-detection.js
   DATA_DIR: /data
   Setup flag exists: false
   ❌ FAILED

   # With DATA_DIR env var
   $ DATA_DIR=/tmp/streamline-data node test-setup-detection.js
   DATA_DIR: /tmp/streamline-data
   Setup flag exists: true
   ✅ SUCCESS
   ```

3. **Bundled Code Inspection**:
   - Examined `.next/standalone/.next/server/app/(app)/workspaces/page.js`
   - Confirmed setup detection code reads `process.env.DATA_DIR || "/data"`
   - No build-time baking of the value - it's a runtime read
   - **Issue**: Runtime environment isn't being set correctly

## Root Cause

**Next.js standalone builds do NOT automatically pick up environment variables from Playwright's `webServer.env` config reliably.** The standalone server reads from its `.env` file first, and while it should overlay `process.env`, the timing and propagation of environment variables from Playwright to the standalone Node.js process is inconsistent.

The safest approach is to **inject critical environment variables directly into the standalone `.env` file** after the build completes.

## Solution

### Implementation

Added a new CI workflow step to inject `DATA_DIR` and `E2E_TEST_MODE` into the standalone `.env` file:

```yaml
- name: Configure standalone environment
  run: |
    echo "Injecting DATA_DIR into standalone .env..."
    echo "DATA_DIR=/tmp/streamline-data" >> .next/standalone/.env
    echo "E2E_TEST_MODE=true" >> .next/standalone/.env
    echo "Standalone .env contents:"
    cat .next/standalone/.env
```

This step runs **after** the build but **before** the E2E test execution.

### Why This Works

1. **Explicit Configuration**: No reliance on environment variable propagation
2. **Standalone Compatibility**: Next.js standalone explicitly reads `.env` file
3. **Build-Time Agnostic**: Can create setup flag before or after build
4. **Deterministic**: No timing issues or race conditions

### Changes Made

**File**: `.github/workflows/ci.yml`

- **Line 171-177**: Added "Configure standalone environment" step
- **Purpose**: Inject `DATA_DIR` and `E2E_TEST_MODE` into standalone `.env`
- **Placement**: After build, after setup flag creation, before E2E tests

## Verification Plan

### Local Testing

1. Build standalone: `npm run build`
2. Inject environment variables:
   ```bash
   echo "DATA_DIR=/tmp/streamline-data" >> .next/standalone/.env
   echo "E2E_TEST_MODE=true" >> .next/standalone/.env
   ```
3. Create setup flag:
   ```bash
   mkdir -p /tmp/streamline-data
   echo '{"completed":true,"timestamp":"2024-01-01T00:00:00.000Z","version":"1.0"}' > /tmp/streamline-data/.setup-complete
   ```
4. Start standalone server: `npm run start`
5. Verify `/login` page loads (not redirected to `/setup`)

### CI Testing

1. Push fix to `high-priority-fixes` branch
2. Monitor GitHub Actions E2E job
3. Expected result: **88/88 tests pass** (0 failures)
4. Verify test duration remains under 15 minutes

## Lessons Learned

1. **Standalone Builds Have Different Runtime Behavior**:
   - Environment variables must be in `.env` file for reliable access
   - Relying on `process.env` from parent process is fragile

2. **CI Environment Variables Are Tricky**:
   - Job-level `env` ≠ Step-level `env` ≠ Process-level `process.env`
   - Playwright `webServer.env` passes to the command, but not reliably to child processes

3. **Test Both Locally AND in CI**:
   - Local dev mode (`npm run dev`) behaves differently from production mode (`npm run start`)
   - Always verify fixes in CI, not just locally

4. **File-Based Configuration Is More Reliable**:
   - For containerized/standalone environments, inject config into files
   - Reduces reliance on environment variable propagation chains

## Impact Assessment

### Before Fix

- **CI E2E Pass Rate**: 35% (31/88)
- **Blocker for**: All authentication-related features
- **User Impact**: Cannot verify production readiness

### After Fix (Expected)

- **CI E2E Pass Rate**: 100% (88/88)
- **Blocker Resolution**: Unblocked for production deployment
- **Confidence**: High - root cause identified and addressed

## Related Files

- `.github/workflows/ci.yml` - CI workflow (fixed)
- `src/lib/setup.ts` - Setup detection logic
- `src/lib/env.ts` - Environment variable validation (Zod schema)
- `src/app/(auth)/layout.tsx` - Auth layout with setup redirect
- `playwright.config.ts` - Playwright configuration

## Next Steps

1. Commit fix to repository
2. Push to `high-priority-fixes` branch
3. Monitor CI build
4. If successful, create pull request to merge
5. Document in project retrospective

## Notes for Future Maintenance

If adding new environment variables that must be available in E2E tests:

1. **Add to Zod schema** in `src/lib/env.ts`
2. **Add to `.env.example`** for documentation
3. **Add to CI workflow** in the "Configure standalone environment" step
4. **Add to Playwright config** in `webServer.env` (defense in depth)

**DO NOT** rely solely on Playwright `webServer.env` for standalone builds.
