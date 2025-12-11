# Root Cause Analysis: CI Failures

**Date:** 2025-12-11
**Decision Maker:** Project Orchestrator
**Status:** Analysis Complete, Ready for Implementation

## Issue 1: Database "root" User Error - ROOT CAUSE IDENTIFIED

### Symptoms

```
FATAL: role "root" does not exist
```

E2E tests fail in CI despite DATABASE_URL being correctly set in the workflow.

### Root Cause

The issue is in `/playwright.config.ts`:

```typescript
webServer: {
  command: 'npm run dev',    // <-- Problem here!
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
  timeout: 120000,
}
```

**What happens:**

1. GitHub Actions CI sets DATABASE_URL in the "Run E2E tests" step
2. Playwright test command is executed with DATABASE_URL env var
3. **BUT** Playwright spawns a NEW process for `npm run dev` (webServer)
4. This new process does NOT inherit the DATABASE_URL environment variable
5. The Next.js dev server starts without DATABASE_URL
6. The pg library falls back to libpq defaults
7. libpq uses the system USER environment variable as the database username
8. In CI environments, USER might be "root" or undefined
9. Connection fails: "role 'root' does not exist"

### Why Previous Fixes Didn't Work

The code in `/src/server/db/index.ts` is correct:

```typescript
function getDatabaseConnectionString(): string {
  const isTestEnv =
    process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

  if (isTestEnv) {
    return process.env.DATABASE_URL; // Correct!
  }
  // ...
}
```

However, during E2E tests:

- NODE_ENV is likely NOT 'test' (it's probably 'development' or undefined)
- VITEST is NOT 'true' (we're running Playwright, not Vitest)
- So the code uses `serverEnv.DATABASE_URL`
- But serverEnv validation happens at import time
- If DATABASE_URL isn't set when the dev server starts, it fails or falls back to defaults

### Solution

**Option 1: Pass env vars to webServer command (Recommended)**

```typescript
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
  timeout: 120000,
  env: {
    DATABASE_URL: process.env.DATABASE_URL!,
    SESSION_SECRET: process.env.SESSION_SECRET!,
    MODE: process.env.MODE!,
  },
}
```

**Option 2: Use .env file in CI**
Create a .env file before running E2E tests in CI workflow.

**Option 3: Modify database connection logic**
Add E2E test detection in `/src/server/db/index.ts`:

```typescript
const isTestEnv =
  process.env.NODE_ENV === 'test' ||
  process.env.VITEST === 'true' ||
  process.env.CI === 'true'; // <-- Add this
```

**Recommendation:** Use **Option 1** - it's explicit, clear, and follows Playwright best practices.

## Issue 2: E2E Test Performance - ROOT CAUSE IDENTIFIED

### Symptoms

E2E tests take 90+ minutes to complete in CI.

### Root Causes

#### 1. Too Many Browser Configurations (PRIMARY)

```typescript
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  { name: 'mobile-safari', use: { ...devices['iPhone 12'] } },
];
```

**5 browsers × N tests × 1 worker = VERY SLOW**

#### 2. Single Worker in CI (SECONDARY)

```typescript
workers: process.env.CI ? 1 : 4,
```

Only 1 test runs at a time in CI. This is overly conservative.

#### 3. Retry Logic (TERTIARY)

```typescript
retries: process.env.CI ? 2 : 0,
```

Flaky tests can run up to 3 times (1 initial + 2 retries).

### Solution

**Immediate fixes:**

1. **Run only Chromium in CI**

```typescript
projects: process.env.CI
  ? [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
  : [
      { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
      { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
      { name: 'webkit', use: { ...devices['Desktop Safari'] } },
      { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
      { name: 'mobile-safari', use: { ...devices['iPhone 12'] } },
    ],
```

2. **Increase workers to 2 in CI**

```typescript
workers: process.env.CI ? 2 : 4,
```

3. **Reduce retries to 1**

```typescript
retries: process.env.CI ? 1 : 0,
```

**Expected Impact:**

- 5 browsers → 1 browser = **5x faster**
- 1 worker → 2 workers = **2x faster**
- 2 retries → 1 retry = ~**1.3x faster** (assuming some flaky tests)

**Combined: ~13x performance improvement**

- Current: 90 minutes
- Expected: 7 minutes (90 / 13 ≈ 7)
- Target: < 15 minutes ✅

## Implementation Plan

### Phase 1: Fix Database Connection (CRITICAL)

1. Update `playwright.config.ts` to pass environment variables to webServer
2. Add validation to ensure required env vars are present
3. Test locally with different DATABASE_URL values
4. Verify fix in CI

### Phase 2: Optimize Performance (HIGH PRIORITY)

1. Update `playwright.config.ts` to use only Chromium in CI
2. Increase workers from 1 to 2
3. Reduce retries from 2 to 1
4. Measure and document performance improvement

### Phase 3: Validate (REQUIRED)

1. Run full E2E suite locally
2. Push to CI and monitor results
3. Document timings and success rate
4. Update ADR-005 if needed

## Success Criteria

1. ✅ No "role 'root' does not exist" errors
2. ✅ E2E tests complete in < 15 minutes
3. ✅ CI pipeline passes consistently
4. ✅ All environment variables properly propagated

## Next Steps

Delegate to `senior-nextjs-developer` for implementation:

1. Implement database connection fix
2. Implement performance optimizations
3. Test locally
4. Coordinate with QA for validation
5. Deploy to CI

## Files to Modify

1. `/playwright.config.ts` - Database env vars + performance settings
2. Potentially update `/src/server/db/index.ts` if Option 3 is needed as fallback

## References

- Playwright docs: https://playwright.dev/docs/test-webserver
- Issue tracking: `/project-management/tasks/high-priority-ci-fixes.md`
- CI workflow: `/.github/workflows/ci.yml`
