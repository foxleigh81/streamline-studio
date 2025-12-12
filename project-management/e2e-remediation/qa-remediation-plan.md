# E2E Test Remediation Plan

**Date:** 2025-12-12
**Author:** QA Architect
**Status:** Active
**Scope:** Full E2E test suite remediation (88 tests, ~70+ failing)

---

## Executive Summary

The E2E test suite is experiencing widespread failures primarily caused by server infrastructure issues in the CI environment. This plan provides a prioritised remediation strategy addressing root causes first, then systematically fixing test categories in order of dependency.

### Current Test Count by Category

| Category             | File                                    | Tests  | Status            |
| -------------------- | --------------------------------------- | ------ | ----------------- |
| Smoke                | `smoke/critical-paths.spec.ts`          | 16     | Blocking          |
| Basic App            | `app.spec.ts`                           | 3      | Partially Working |
| Auth - Login         | `auth/login.spec.ts`                    | 17     | Failing           |
| Auth - Registration  | `auth/registration.spec.ts`             | 16     | Failing           |
| Auth - Rate Limiting | `auth/rate-limiting.spec.ts`            | 5      | Failing           |
| Accessibility        | `accessibility/wcag-compliance.spec.ts` | 23     | Failing           |
| Document Conflicts   | `document/conflict-resolution.spec.ts`  | 4      | Skipped           |
| **TOTAL**            |                                         | **88** | **~70+ Failing**  |

---

## Root Cause Analysis

### Primary Issue: Server Infrastructure

The standalone build in CI is not starting correctly, causing all page-dependent tests to fail. Evidence:

1. All tests that navigate to pages are timing out
2. API endpoint tests (health checks) have response format mismatches
3. Form elements are not found because pages do not render

### Secondary Issues

1. **Database State**: No cleanup between test runs
2. **Rate Limiting State**: Persists across tests causing cascade failures
3. **Hardcoded Timeouts**: Fixed `waitForTimeout` calls instead of condition-based waits
4. **CI Environment Differences**: Focus and timing behaviour differs from local

---

## Test Dependency Graph

```
Infrastructure (Server Start)
    |
    +-- app.spec.ts (Health endpoints)
    |       |
    |       +-- smoke/critical-paths.spec.ts
    |               |
    |               +-- auth/login.spec.ts
    |               |       |
    |               |       +-- auth/rate-limiting.spec.ts
    |               |
    |               +-- auth/registration.spec.ts
    |                       |
    |                       +-- document/conflict-resolution.spec.ts
    |
    +-- accessibility/wcag-compliance.spec.ts (depends on pages rendering)
```

**Key Insight:** Until `app.spec.ts` passes, all other tests will fail.

---

## Prioritised Remediation Order

### Phase 1: Infrastructure Verification (CRITICAL)

**Goal:** Server must start and respond correctly

**Tests to Run First:**

1. `app.spec.ts` - `health endpoint returns ok`
2. `app.spec.ts` - `tRPC health endpoint works`
3. `app.spec.ts` - `homepage loads successfully`

**Actions Required:**

1. Verify `npm run start` works in CI environment
2. Ensure `DATABASE_URL` is correctly passed to the server process
3. Verify `.setup-complete` flag is created before tests run
4. Check standalone build output directory exists and is complete

**CI Configuration Check:**

```yaml
# Current CI uses:
env:
  DATABASE_URL: postgresql://postgres:postgres@127.0.0.1:5432/streamline_test
  NODE_ENV: production
```

**Issue Identified:** The CI builds with `npm run build` but then runs `npm run start`. Verify that the standalone server mode is working.

---

### Phase 2: Smoke Tests (HIGH PRIORITY)

**Depends On:** Phase 1 complete

**Tests:**

1. Homepage loads
2. Health endpoints respond
3. Navigation works
4. Login form renders
5. Registration form renders
6. Basic form validation works
7. Keyboard navigation works

**Known Issues in `/e2e/smoke/critical-paths.spec.ts`:**

1. **Lines 290, 301, 309**: Hardcoded `waitForTimeout` delays
   - These are band-aids for CI timing issues
   - Replace with condition-based waits where possible

2. **Extended Timeouts**: Many elements have 15-20 second timeouts
   - Indicates underlying performance or hydration issues
   - Acceptable for CI but should investigate root cause

**Recommendations:**

- Keep the extended timeouts for CI stability
- Monitor whether they can be reduced after infrastructure fix

---

### Phase 3: Authentication Tests (HIGH PRIORITY)

**Depends On:** Phases 1-2 complete

#### 3a. Login Tests (`/e2e/auth/login.spec.ts`)

**Test Groups:**

1. Page Rendering (2 tests)
2. Form Validation (3 tests)
3. Login Errors (2 tests)
4. Successful Login (2 tests)
5. Navigation (1 test)
6. Accessibility (4 tests)
7. Security (2 tests)
8. UX (2 tests)

**Selector Audit Status:** PASSED - All selectors verified correct

**Known Issues:**

- None identified in selectors
- Failures are due to server not starting

#### 3b. Registration Tests (`/e2e/auth/registration.spec.ts`)

**Test Groups:**

1. Page Rendering (2 tests)
2. Form Validation (5 tests)
3. Successful Registration (3 tests)
4. Navigation (1 test)
5. Accessibility (3 tests)
6. Security (3 tests)

**Selector Audit Status:** PASSED (with optional improvement)

**Optional Improvement:**

- Change `/^password$/i` to `'Password', { exact: true }` for consistency
- Not blocking, just cleaner

#### 3c. Rate Limiting Tests (`/e2e/auth/rate-limiting.spec.ts`)

**CRITICAL FIXES ALREADY APPLIED:**

- 16 instances of incorrect password selector fixed
- Changed from `/password/i` to `'Password', { exact: true }`

**Test Groups:**

1. Login Rate Limiting (3 tests)
2. Registration Rate Limiting (1 test)
3. Rate Limit Security (1 test)

**Special Considerations:**

- These tests exhaust rate limits intentionally
- Database state must be reset between test runs
- May require test isolation (separate browser contexts)

**Recommendation:** Add database cleanup in `test.beforeEach`:

```typescript
test.beforeEach(async ({ page }) => {
  // Clear rate limit state for the test IP
  // This requires an admin endpoint or database access
});
```

---

### Phase 4: tRPC Endpoint Tests (MEDIUM PRIORITY)

**Depends On:** Phase 1 complete

**Tests in `app.spec.ts`:**

1. `tRPC health endpoint works`
2. `tRPC hello endpoint works with input`

**Known Issue:** Response format mismatch

**Root Cause Analysis:**

The test expects:

```typescript
expect(body.result?.data?.status).toBe('ok');
```

tRPC v11 response format may vary. The test already handles this:

```typescript
// smoke/critical-paths.spec.ts line 44-46
const status = body.result?.data?.status ?? body.result?.data?.json?.status;
```

**Recommendation:** Update `app.spec.ts` to match the pattern in `critical-paths.spec.ts`:

```typescript
// app.spec.ts line 39-40
const body = await response.json();
const status = body.result?.data?.status ?? body.result?.data?.json?.status;
expect(status).toBe('ok');
```

---

### Phase 5: WCAG Accessibility Tests (MEDIUM PRIORITY)

**Depends On:** Phases 1-3 complete (pages must render)

**Test Categories:**

1. Public Pages (3 tests) - axe-core scans
2. Form Accessibility (2 tests)
3. Keyboard Navigation (4 tests)
4. Focus Management (2 tests)
5. Color Contrast (2 tests)
6. Screen Reader Support (4 tests)
7. ARIA Landmarks (2 tests)
8. Mobile Accessibility (2 tests)

**Compliance Level Analysis:**

The tests correctly target **WCAG 2.1 Level AA**:

```typescript
// Line 16
const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
```

This is correct. The tests do NOT test AAA (7:1 contrast ratio). They test:

- wcag2a: Level A (basic)
- wcag2aa: Level AA (4.5:1 contrast for normal text, 3:1 for large text)
- wcag21a: WCAG 2.1 Level A additions
- wcag21aa: WCAG 2.1 Level AA additions

**Selector Audit Status:** PASSED - All selectors verified correct

**Color Contrast Tests:**

- Line 271: Uses `['cat.color']` tag which checks AA compliance
- This is correct - AA requires 4.5:1, not AAA's 7:1

**Keyboard Navigation Tests - Known CI Issues:**

The tests have been updated with explicit focus management:

```typescript
// Line 168-171 - Explicitly focus first element
const email = page.getByLabel(/email/i);
await email.waitFor({ state: 'visible' });
await email.focus();
await expect(email).toBeFocused();
```

This pattern is correct for CI reliability.

---

### Phase 6: Document Conflict Resolution (LOW PRIORITY)

**Depends On:** All previous phases complete

**Tests:**

1. Detects conflict when document is edited in two tabs
2. Reload option discards local changes
3. Force save option preserves local changes
4. Conflict modal is accessible via keyboard

**Configuration:**

```typescript
test.describe.configure({ mode: 'serial' });
```

These tests MUST run serially due to shared state.

**CRITICAL FIXES ALREADY APPLIED:**

- 3 instances of button selector fixed
- Changed from `/save.*anyway|force save/i` to `/keep my changes/i`

**Known Issues:**

1. **Lines 144, 217, 285, 354**: Hardcoded `waitForTimeout(3000)`
   - Waiting for auto-save to trigger
   - Better approach: Wait for save indicator or network request

**Recommendation:**

```typescript
// Instead of:
await page2.waitForTimeout(3000);

// Use:
await page2.waitForFunction(() => {
  // Check for save indicator or network activity
});
// OR
await page2.waitForResponse(
  (response) =>
    response.url().includes('/api/trpc/document') &&
    response.request().method() === 'POST'
);
```

---

## CI-Specific Concerns

### GitHub Actions Environment Differences

| Aspect          | Local          | CI                         |
| --------------- | -------------- | -------------------------- |
| OS              | macOS (darwin) | Ubuntu Linux               |
| Performance     | Fast           | Slower (shared resources)  |
| Focus behaviour | Predictable    | May require explicit focus |
| Network         | Fast localhost | Container networking       |
| Database        | Persistent     | Fresh per job              |

### Database State Management

**Current Issue:** No cleanup between test files

**Recommendation:** Add global setup/teardown:

```typescript
// playwright.config.ts
export default defineConfig({
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
});

// e2e/global-setup.ts
export default async function globalSetup() {
  // Reset database to clean state
  // Clear rate limit keys
  // Seed required data
}
```

### Environment Variable Requirements

**Required:**

- `DATABASE_URL` - Must be accessible from server process
- `SESSION_SECRET` - Required for auth
- `MODE` - Should be `single-tenant` for tests
- `DATA_DIR` - For `.setup-complete` flag

**CI Config Verified:** All variables are correctly set in `.github/workflows/ci.yml`

---

## Flaky Test Patterns Identified

### Pattern 1: Hardcoded Timeouts

**Location:** Multiple files
**Risk:** Tests pass/fail randomly based on system load

**Files Affected:**

- `smoke/critical-paths.spec.ts`: Lines 290, 301, 309
- `document/conflict-resolution.spec.ts`: Lines 144, 217, 285, 354

### Pattern 2: Race Conditions in Focus

**Location:** Keyboard navigation tests
**Risk:** Focus may not have settled before assertion

**Mitigation Applied:**

```typescript
await emailInput.focus();
await page.waitForTimeout(300); // Allow focus to settle
await expect(emailInput).toBeFocused({ timeout: 5000 });
```

### Pattern 3: Network State Assumptions

**Location:** Rate limiting tests
**Risk:** Previous test's rate limit state affects next test

**Mitigation Needed:**

- Database cleanup between tests
- Or use unique IPs/emails per test

---

## Recommended Test Execution Order

After infrastructure fix, run tests in this order:

```bash
# 1. Verify infrastructure
npx playwright test e2e/app.spec.ts

# 2. Run smoke tests
npx playwright test e2e/smoke/critical-paths.spec.ts

# 3. Run auth tests (login first, then registration)
npx playwright test e2e/auth/login.spec.ts
npx playwright test e2e/auth/registration.spec.ts

# 4. Run accessibility tests
npx playwright test e2e/accessibility/wcag-compliance.spec.ts

# 5. Run rate limiting (after fresh DB)
npx playwright test e2e/auth/rate-limiting.spec.ts

# 6. Run document tests last (most complex)
npx playwright test e2e/document/conflict-resolution.spec.ts
```

---

## Retry Strategy Recommendations

### Current Config (playwright.config.ts)

```typescript
retries: process.env.CI ? 1 : 0,
```

**Analysis:** 1 retry is appropriate. More retries mask flaky tests.

### Per-Test Retry

For known flaky tests, use:

```typescript
test('known flaky test', async ({ page }) => {
  test.info().annotations.push({ type: 'flaky', description: 'Reason' });
  // test code
});
```

### Do NOT Add More Retries

Instead, fix the root cause:

1. Replace `waitForTimeout` with condition-based waits
2. Add explicit focus management
3. Clean database state between tests

---

## Test Isolation Recommendations

### Current State

- Tests share database state
- Rate limit state persists
- No cleanup between files

### Recommended Improvements

1. **Per-File Database Reset**

```typescript
// e2e/helpers/database.ts
export async function resetDatabase() {
  // Truncate test tables
  // Reset sequences
  // Clear rate limit keys
}
```

2. **Unique Test Data**

```typescript
// Already implemented in fixtures.ts
const testData = {
  uniqueEmail: () =>
    `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
};
```

3. **Browser Context Isolation**

```typescript
// Already used in conflict-resolution.spec.ts
const context1 = await browser.newContext();
const context2 = await browser.newContext();
```

---

## Specific File Recommendations

### `/e2e/app.spec.ts`

**Fix Required:** Update tRPC response handling

```typescript
// Line 39-40 - Change:
const body = await response.json();
expect(body.result?.data?.status).toBe('ok');

// To:
const body = await response.json();
const status = body.result?.data?.status ?? body.result?.data?.json?.status;
expect(status).toBe('ok');
```

### `/e2e/smoke/critical-paths.spec.ts`

**Status:** Well-structured, proper waits implemented

**Minor Improvement:** Document why timeouts exist

```typescript
// CI environments need longer delays for focus to settle
// See: https://github.com/microsoft/playwright/issues/XXXXX
await page.waitForTimeout(300);
```

### `/e2e/auth/login.spec.ts`

**Status:** All selectors correct, no changes needed

### `/e2e/auth/registration.spec.ts`

**Optional Cleanup:** Standardise password selectors

```typescript
// Change 12 instances of:
page.getByLabel(/^password$/i);
// To:
page.getByLabel('Password', { exact: true });
```

### `/e2e/auth/rate-limiting.spec.ts`

**Status:** FIXES ALREADY APPLIED

**Additional Recommendation:** Add database cleanup

```typescript
test.beforeEach(async () => {
  // Reset rate limit state
});
```

### `/e2e/accessibility/wcag-compliance.spec.ts`

**Status:** Correct compliance level (AA not AAA)

**No Changes Required**

### `/e2e/document/conflict-resolution.spec.ts`

**Status:** FIXES ALREADY APPLIED

**Additional Recommendations:**

1. Replace `waitForTimeout(3000)` with network request waits
2. Add cleanup for test videos/documents

---

## Summary of Required Actions

### Immediate (Blocking)

1. Fix server startup in CI (infrastructure issue)
2. Apply tRPC response format fix to `app.spec.ts`

### Already Applied

1. Rate limiting password selector fixes (16 instances)
2. Conflict resolution button selector fixes (3 instances)

### Recommended (Non-Blocking)

1. Add database cleanup between tests
2. Replace `waitForTimeout` with condition-based waits
3. Standardise password selectors in registration tests

### Future Improvements

1. Add global setup/teardown for database state
2. Create test helper functions for common selectors
3. Add visual regression tests for UI changes
4. Monitor test execution times after fixes

---

## Verification Checklist

After applying fixes, verify:

- [ ] `npm run test:e2e` completes in CI
- [ ] All 88 tests pass (or have documented reasons for skip)
- [ ] No test takes longer than 60 seconds
- [ ] Rate limiting tests do not affect each other
- [ ] Document conflict tests work with multiple browser contexts
- [ ] WCAG tests report actual accessibility issues (not false positives)

---

## Contact

For questions about this remediation plan, consult:

- `/project-management/e2e-audit-findings.md` - Detailed selector audit
- `/project-management/e2e-fix-summary.md` - Applied fixes
- `/docs/adrs/005-testing-strategy.md` - Testing architecture decisions
