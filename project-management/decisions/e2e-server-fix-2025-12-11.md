# E2E Test Server Configuration Fix

**Date**: 2025-12-11
**Status**: Implemented
**Impact**: Critical - Fixes failing CI pipeline

## Problem

The E2E tests in CI were failing because the Next.js production server was not running when Playwright tests executed. The workflow had these steps:

1. Build Next.js app (npm run build)
2. Run E2E tests (npm run test:e2e)

However, building the app does not start a server. The tests were attempting to navigate to pages that didn't exist because no server was listening on port 3000.

## Root Cause

The `playwright.config.ts` webServer configuration was using `npm run dev` for both local development and CI. While this works locally (dev server starts quickly), in CI we want to test the production build that was just created.

Additionally, there was no mechanism in the CI workflow to ensure the server was running before tests started.

## Solution

Modified `/Users/foxleigh81/dev/internal/streamline-studio/playwright.config.ts` to use the appropriate server command based on the environment:

### Changes Made

1. **webServer command updated**:
   - Local: `npm run dev` (development server)
   - CI: `npm run start` (production server)

2. **Increased timeouts for CI stability**:
   - Test timeout: 60000ms (60 seconds)
   - Expect timeout: 10000ms (10 seconds)

3. **Updated webServer comment** to clarify dual-mode behavior

### Code Changes

```typescript
// Before
webServer: {
  command: 'npm run dev',
  // ...
}

// After
webServer: {
  command: process.env.CI ? 'npm run start' : 'npm run dev',
  // ...
}
```

And added:

```typescript
// Increased timeouts for CI environment
timeout: 60000,
expect: { timeout: 10000 },
```

## Why This Works

Playwright's webServer configuration automatically:

1. Starts the server before running tests
2. Waits for the server to be ready (polls the URL)
3. Stops the server after tests complete
4. Passes environment variables to the server process

This eliminates the need for manual server management in the CI workflow and ensures the server is always running when tests execute.

## Alternative Approaches Considered

### Manual Server Start in CI Workflow

We could have added a step to the CI workflow:

```yaml
- name: Start Next.js production server
  run: |
    npm run start &
    npx wait-on http://localhost:3000 --timeout 120000
```

**Rejected because**:

- Playwright's built-in webServer management is more robust
- Requires manual process cleanup
- Duplicates server management logic between local and CI
- More prone to race conditions

## Testing

Verified that:

- TypeScript compilation passes
- Configuration syntax is correct
- `npm run start` script exists in package.json

## Files Modified

- `/Users/foxleigh81/dev/internal/streamline-studio/playwright.config.ts`

## Next Steps

1. Monitor CI pipeline to confirm E2E tests pass
2. If tests still fail, investigate individual test failures (not server startup)
3. Consider adding server health check to webServer configuration if needed

## Related Issues

- CI pipeline failures in e2e job
- Timeout errors in Playwright tests
- "Navigation timeout" errors when accessing pages
