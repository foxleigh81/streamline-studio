# Plan 02: Test Configuration - Playwright Config Fixes

## Priority: P1 (HIGH - REQUIRED BEFORE RUNNING TESTS)

## Status: Ready for Implementation

## Problem Statement

The Playwright configuration needs updates to work correctly in CI with the standalone server. While the current config has some CI optimizations, it needs adjustments for:

1. Proper CI detection and environment setup
2. Correct server startup command after Plan 01 fix
3. Optimal timeout configurations for CI stability
4. Better error reporting and debugging

### Current Issues

- Config assumes `npm run start` will work (fixed in Plan 01)
- Some timeouts may be too aggressive for CI
- Missing some CI-specific best practices

## Solution Design

### Configuration Updates Required

1. **Web Server Command** - Align with Plan 01 changes
2. **Timeout Tuning** - Balance speed vs. stability
3. **CI Detection** - Ensure proper environment detection
4. **Output Configuration** - Improve error reporting

## Implementation Plan

### Files to Modify

1. **`/playwright.config.ts`** (Required)
   - Update webServer configuration
   - Verify timeout values
   - Add better CI detection
   - Improve error output settings

### Changes Required

#### 1. Update playwright.config.ts

**Section: webServer (lines 78-100)**

**Current**:

```typescript
webServer: {
  command: process.env.CI ? 'npm run start' : 'npm run dev',
  url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  reuseExistingServer: !process.env.CI && !process.env.PLAYWRIGHT_NO_REUSE,
  timeout: 120000,
  // ... env vars
}
```

**Updated**:

```typescript
webServer: {
  // Use standalone server in CI (Plan 01 fix), dev server locally
  command: process.env.CI ? 'npm run start' : 'npm run dev',
  url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  // Never reuse server in CI for clean test runs
  reuseExistingServer: !process.env.CI && !process.env.PLAYWRIGHT_NO_REUSE,
  // 2 minute timeout for server startup (CI build takes time)
  timeout: 120000,
  // Capture server output for debugging CI issues
  stdout: process.env.CI ? 'pipe' : 'ignore',
  stderr: process.env.CI ? 'pipe' : 'ignore',
  // CRITICAL: Pass environment variables to the server
  env: {
    ...(process.env.DATABASE_URL && {
      DATABASE_URL: process.env.DATABASE_URL,
    }),
    ...(process.env.SESSION_SECRET && {
      SESSION_SECRET: process.env.SESSION_SECRET,
    }),
    ...(process.env.MODE && { MODE: process.env.MODE }),
    ...(process.env.DATA_DIR && { DATA_DIR: process.env.DATA_DIR }),
    ...(process.env.NODE_ENV && { NODE_ENV: process.env.NODE_ENV }),
    ...(process.env.PORT && { PORT: process.env.PORT }),
    // Ensure standalone server listens on all interfaces in CI
    ...(process.env.CI && { HOSTNAME: '0.0.0.0' }),
  },
}
```

**Changes**:

1. Added `stdout` and `stderr` capture in CI for debugging
2. Added `HOSTNAME: '0.0.0.0'` for CI to ensure server listens on all interfaces
3. Added comments explaining each setting
4. Command already correct after Plan 01 fixes `npm run start`

**Section: Reporter Configuration (lines 24-28)**

**Current**:

```typescript
reporter: [
  ['html', { outputFolder: 'playwright-report' }],
  ['json', { outputFile: 'playwright-results.json' }],
  ['list'],
],
```

**Updated**:

```typescript
reporter: [
  ['html', { outputFolder: 'playwright-report' }],
  ['json', { outputFile: 'playwright-results.json' }],
  // Use 'list' in CI for better GitHub Actions output, 'html' preview locally
  process.env.CI ? ['github'] : ['list'],
],
```

**Changes**:

1. Use GitHub Actions reporter in CI for better integration
2. Keep list reporter locally for interactive feedback

**Section: Global Configuration (lines 18-32)**

**Current values are good, but verify**:

```typescript
timeout: 120000, // 2 minutes per test (GOOD for CI)
expect: { timeout: 10000 }, // 10s per assertion (GOOD)
use: {
  actionTimeout: 30000, // 30s per action (GOOD)
  navigationTimeout: 60000, // 60s for navigation (GOOD)
}
```

**No changes needed** - These values are appropriate for CI stability.

### Complete Updated playwright.config.ts

**Note**: Only the webServer and reporter sections need updates. Here's the full updated config:

```typescript
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * ADR-005 Requirements:
 * - Multi-browser testing (Chrome, Firefox, Safari)
 * - Mobile viewport testing
 * - Trace and screenshot on failure
 *
 * Performance Optimizations (Dec 2025):
 * - CI runs only Chromium to reduce test time from 90+ min to <15 min
 * - CI uses 2 workers for better parallelization
 * - CI retries reduced to 1 (from 2) to avoid excessive re-runs
 *
 * @see /docs/adrs/005-testing-strategy.md
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-results.json' }],
    // Use GitHub Actions reporter in CI for better integration
    process.env.CI ? ['github'] : ['list'],
  ],

  // Increased timeouts for CI environment stability
  timeout: 120000, // global test timeout (120s)
  expect: { timeout: 10000 }, // per-expect timeout

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000, // action timeout (30s)
    navigationTimeout: 60000, // navigation timeout (60s)
  },

  // CI: Run only Chromium for speed (5x faster)
  // Local: Run all browsers for comprehensive testing
  projects: process.env.CI
    ? [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
      ]
    : [
        // Desktop browsers
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
        {
          name: 'firefox',
          use: { ...devices['Desktop Firefox'] },
        },
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'] },
        },
        // Mobile viewports
        {
          name: 'mobile-chrome',
          use: { ...devices['Pixel 5'] },
        },
        {
          name: 'mobile-safari',
          use: { ...devices['iPhone 12'] },
        },
      ],

  // Local dev server (dev mode) / Production server (CI)
  webServer: {
    // Use standalone server in CI (after Plan 01 fix), dev server locally
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    // Never reuse server in CI for clean test runs
    reuseExistingServer: !process.env.CI && !process.env.PLAYWRIGHT_NO_REUSE,
    timeout: 120000,
    // Capture server output for debugging CI issues
    stdout: process.env.CI ? 'pipe' : 'ignore',
    stderr: process.env.CI ? 'pipe' : 'ignore',
    // CRITICAL: Pass environment variables to the server
    env: {
      ...(process.env.DATABASE_URL && {
        DATABASE_URL: process.env.DATABASE_URL,
      }),
      ...(process.env.SESSION_SECRET && {
        SESSION_SECRET: process.env.SESSION_SECRET,
      }),
      ...(process.env.MODE && { MODE: process.env.MODE }),
      ...(process.env.DATA_DIR && { DATA_DIR: process.env.DATA_DIR }),
      ...(process.env.NODE_ENV && { NODE_ENV: process.env.NODE_ENV }),
      ...(process.env.PORT && { PORT: process.env.PORT }),
      // Ensure standalone server listens on all interfaces in CI
      ...(process.env.CI && { HOSTNAME: '0.0.0.0' }),
    },
  },

  // Output directory for test artifacts
  outputDir: 'test-results/',
});
```

### Verification Steps

#### Local Verification

```bash
# 1. Test with dev server (default)
npm run test:smoke
# Should use 'npm run dev' command
# Should run smoke tests

# 2. Simulate CI environment
CI=true npm run test:smoke
# Should use 'npm run start' command (standalone server)
# Should capture stdout/stderr
# Should use GitHub reporter

# 3. Test specific configuration
npm run test:e2e:debug -- e2e/smoke/critical-paths.spec.ts -g "health endpoint"
# Should work with both dev and production modes
```

#### CI Verification

After pushing changes:

```bash
# Check GitHub Actions logs for:
# 1. "[WebServer] Ready on http://0.0.0.0:3000" (or similar)
# 2. No "next start does not work with standalone" warnings
# 3. Tests connecting successfully to server
# 4. GitHub Actions reporter formatting in logs
```

### CI-Specific Considerations

#### Environment Variables

All required variables already configured in `ci.yml`:

```yaml
DATABASE_URL: postgresql://postgres:postgres@127.0.0.1:5432/streamline_test
MODE: single-tenant
SESSION_SECRET: test-secret-for-ci-only-do-not-use-in-production
DATA_DIR: /tmp/streamline-data
NODE_ENV: production
```

#### Server Output Capture

With `stdout: 'pipe'` and `stderr: 'pipe'`, CI logs will include:

- Server startup messages
- Error messages (if any)
- Request logs (from Pino logger)

This helps debug test failures.

#### GitHub Actions Reporter

The `github` reporter provides:

- Annotations on failed tests
- Grouped output by test file
- Better integration with GitHub UI
- Links to line numbers for failures

### Expected Outcome

After this configuration update:

1. Server starts with correct command in CI
2. Server output captured for debugging
3. Tests run with appropriate timeouts
4. Better CI error reporting
5. No configuration warnings in logs

## Testing Strategy

### Configuration Validation

```bash
# Test 1: Verify dev mode (local)
npm run test:smoke
# Expected: Uses 'npm run dev', tests pass

# Test 2: Verify CI mode (simulated)
CI=true npm run build
CI=true npm run test:smoke
# Expected: Uses 'npm run start', tests pass

# Test 3: Check server output
CI=true npm run test:e2e 2>&1 | grep -i "ready"
# Expected: See server ready message in output
```

### Integration Testing

Run full test suite after configuration changes:

```bash
npm run test:e2e
```

Expected results:

- All infrastructure tests pass
- No timeout errors
- Server starts within 120s
- Tests complete within reasonable time

## Dependencies

### Blocked By

- Plan 01 (Infrastructure) - MUST complete first
  - Requires `npm run start` to use standalone server

### Blocks

- Plan 03 (WCAG Tests)
- Plan 04 (tRPC Tests)
- Plan 05 (Auth Tests)
- Plan 06 (Remaining Tests)

While these plans don't strictly depend on Plan 02, running them before fixing the configuration may result in false failures or inconsistent results.

## Success Criteria

- [ ] `playwright.config.ts` uses correct CI detection
- [ ] Web server starts with `npm run start` in CI
- [ ] Server output captured in CI logs
- [ ] GitHub Actions reporter used in CI
- [ ] All timeout values appropriate for CI
- [ ] No configuration warnings in CI logs
- [ ] At least 1 test passes end-to-end in CI

## Risk Assessment

### Risk Level: MEDIUM

This change affects test configuration but not application code.

### Mitigation

1. Test locally with CI environment simulation
2. Verify each configuration option independently
3. Keep rollback plan ready
4. Monitor first CI run carefully

### Impact Analysis

- **Positive**: Better CI integration, improved debugging, correct timeouts
- **Negative**: None expected
- **Neutral**: Changes only test infrastructure, not application

## Rollback Plan

If configuration causes issues, revert specific sections:

### Revert webServer changes

```typescript
webServer: {
  command: process.env.CI ? 'npm run start' : 'npm run dev',
  url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  reuseExistingServer: !process.env.CI && !process.env.PLAYWRIGHT_NO_REUSE,
  timeout: 120000,
  env: { /* previous env config */ },
  // Remove: stdout, stderr, HOSTNAME
}
```

### Revert reporter changes

```typescript
reporter: [
  ['html', { outputFolder: 'playwright-report' }],
  ['json', { outputFile: 'playwright-results.json' }],
  ['list'], // Back to simple list
],
```

## References

### Documentation

- [Playwright Configuration](https://playwright.dev/docs/test-configuration)
- [Playwright Web Server](https://playwright.dev/docs/test-webserver)
- [Playwright Reporters](https://playwright.dev/docs/test-reporters)
- [GitHub Actions Reporter](https://playwright.dev/docs/test-reporters#github-actions-annotations)

### Best Practices

- [Playwright CI Best Practices](https://playwright.dev/docs/ci)
- [GitHub Actions with Playwright](https://playwright.dev/docs/ci-intro#github-actions)

### Related Files

- `/playwright.config.ts` - This file
- `/.github/workflows/ci.yml` - CI workflow
- `/package.json` - Script definitions (updated in Plan 01)

---

**Last Updated**: 2025-12-12
**Status**: Ready for implementation
**Priority**: P1 - HIGH
**Estimated Time**: 10 minutes
**Owner**: Senior Developer
