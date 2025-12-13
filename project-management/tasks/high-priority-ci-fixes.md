# High Priority CI Fixes

**Created:** 2025-12-11
**Status:** In Progress
**Priority:** CRITICAL
**Assigned To:** Project Orchestrator → Senior Developer

## Overview

Two critical issues are blocking the CI pipeline and making the test suite unusable:

1. **Database "root" user error persists** - E2E tests fail with `FATAL: role "root" does not exist`
2. **E2E tests take 1.5+ hours** - Completely unacceptable for CI pipeline

## Issue 1: Database "root" User Error

### Problem

CI is setting the correct DATABASE_URL:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/streamline_test
```

But something in the code is still trying to connect as the "root" user, causing:

```
FATAL: role "root" does not exist
```

### Investigation Required

#### Files Already Checked (No Issues Found)

- `/src/server/db/index.ts` - Uses `process.env.DATABASE_URL` directly in test mode ✅
- `/drizzle.config.ts` - Uses `process.env.DATABASE_URL` with validation ✅
- `/e2e/helpers/fixtures.ts` - No database connection code ✅
- `/e2e/helpers/auth.ts` - No database connection code ✅
- `/scripts/seed.ts` - Fallback URL uses 'streamline' user, not 'root' ✅

#### Files That Need Investigation

- `/src/test/helpers/database.ts` - Contains `new Pool()` calls
- `/src/test/setup.ts` - May have test environment setup
- Any other files creating database connections
- Playwright configuration for test environment variables
- Next.js configuration for environment variable handling during build/test

#### Key Questions to Answer

1. Is the `pg` library using OS environment variables (USER, etc.) to default the username?
2. Is there a connection pool being created without an explicit connectionString?
3. Is NODE_ENV or VITEST being set correctly during E2E tests?
4. Does Playwright pass environment variables correctly to the Next.js dev server?
5. Is the webServer command in `playwright.config.ts` using the right environment?

### Success Criteria

- E2E tests connect to PostgreSQL using the "postgres" user
- No more "role 'root' does not exist" errors
- Tests pass in CI environment

## Issue 2: E2E Test Performance

### Problem

E2E tests are taking 1.5+ hours to complete, which is:

- Blocking deployments
- Making development iterations impossible
- Wasting CI resources

### Current Configuration Issues

From `/playwright.config.ts`:

```typescript
workers: process.env.CI ? 1 : 4,  // Only 1 worker in CI!
retries: process.env.CI ? 2 : 0,   // 2 retries for flaky tests

projects: [
  chromium,      // Desktop
  firefox,       // Desktop
  webkit,        // Desktop
  mobile-chrome, // Mobile
  mobile-safari, // Mobile
]
```

**5 browsers × 1 worker × 2 retries = SLOW**

### Performance Optimization Plan

1. **Reduce Browsers in CI** (Priority: HIGH)
   - CI should only run Chromium
   - Firefox, WebKit, and mobile can be developer-optional or weekly
   - Reduces test matrix from 5x to 1x

2. **Increase Parallelization** (Priority: HIGH)
   - Increase workers from 1 to 2-4 in CI
   - Tests should be isolated enough to run in parallel

3. **Reduce Retries** (Priority: MEDIUM)
   - Fix flaky tests instead of relying on retries
   - Reduce retries from 2 to 1 or 0

4. **Optimize Test Code** (Priority: MEDIUM)
   - Check for unnecessary waits/timeouts
   - Use `waitForLoadState('networkidle')` sparingly
   - Ensure efficient test fixtures

5. **Selective Test Running** (Priority: LOW)
   - Consider running only smoke tests on PRs
   - Full E2E suite on main/develop branches only

### Target Performance

- **Current:** 90+ minutes
- **Target:** 10-15 minutes
- **Acceptable:** < 20 minutes

## Investigation Strategy

### Phase 1: Identify Root Cause (Database Issue)

1. Search for ALL database connection code
2. Check if pg library has default connection behavior
3. Verify environment variable propagation in Playwright
4. Add debug logging to trace where "root" username comes from

### Phase 2: Fix Database Connection

1. Ensure all Pool() calls use explicit connectionString
2. Add validation that DATABASE_URL is used
3. Test fix locally with user other than "postgres"
4. Verify fix in CI

### Phase 3: Optimize E2E Performance

1. Update playwright.config.ts to use only Chromium in CI
2. Increase worker count to 2-4
3. Profile test execution to find slowest tests
4. Optimize or parallelize slow tests
5. Consider reducing retries after tests stabilize

## Files to Modify

### Confirmed

- `/playwright.config.ts` - Browser and worker configuration

### To Be Determined

- Files with database connection issues (TBD after investigation)
- Potentially `/src/test/helpers/database.ts`
- Potentially `/src/test/setup.ts`

## Success Criteria

### Issue 1: Database

- ✅ No "role 'root' does not exist" errors
- ✅ E2E tests connect using correct credentials
- ✅ CI pipeline passes database connection phase

### Issue 2: Performance

- ✅ E2E tests complete in under 15 minutes
- ✅ Only Chromium runs in CI
- ✅ Increased worker parallelization
- ✅ CI pipeline completes in reasonable time

## Next Steps

1. Senior Developer investigates database connection issue
2. Senior Developer implements fix for database connection
3. Senior Developer optimizes Playwright configuration
4. QA validates fixes in local environment
5. Test in CI pipeline
6. Document findings and solutions

## Notes

- Previous attempt to fix database issue did NOT work
- Need deeper investigation into pg library behavior
- E2E performance is equally critical as database fix
- Both issues are blocking productive development
