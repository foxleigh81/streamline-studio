# E2E Test Robustness Fixes

**Priority:** CRITICAL
**Status:** IN PROGRESS
**Started:** December 11, 2025
**Coordinator:** Project Orchestrator
**Assignee:** QA Architect + Senior Developer

## Problem Statement

E2E tests are failing with "locator.click: Test timeout of 30000ms exceeded" errors due to race conditions. Tests are not waiting for the page to be fully loaded before interacting with elements, causing intermittent failures in CI where the server may be slower.

## Root Cause Analysis

### Primary Issues

1. **Missing Load State Waits**: Tests use `page.goto()` without waiting for the page to finish loading
2. **Missing Element Visibility Waits**: Tests click elements without verifying they are visible and ready
3. **Non-Deterministic Keyboard Tests**: Keyboard navigation tests depend on initial focus state which varies

### Affected Files

- `/e2e/smoke/critical-paths.spec.ts` - Main failing file
- `/e2e/auth/login.spec.ts`
- `/e2e/auth/registration.spec.ts`
- `/e2e/accessibility/wcag-compliance.spec.ts`
- `/e2e/app.spec.ts`
- `/e2e/auth/rate-limiting.spec.ts`
- `/e2e/document/conflict-resolution.spec.ts`

## Solution Strategy

### IMPORTANT: Do NOT Just Increase Timeouts

The goal is to make tests **ROBUST**, not just slower. We need to fix the underlying race conditions, not mask them with longer timeouts.

### Required Patterns

#### 1. Add `waitForLoadState` After Every `page.goto()`

```typescript
// BEFORE (race condition)
await page.goto('/login');
await page.getByRole('button', { name: /sign in/i }).click();

// AFTER (robust)
await page.goto('/login');
await page.waitForLoadState('networkidle');
await page.getByRole('button', { name: /sign in/i }).click();
```

#### 2. Wait for Element Visibility Before Interaction

```typescript
// BEFORE (race condition)
await page.getByRole('button', { name: /sign in/i }).click();

// AFTER (robust)
const signInButton = page.getByRole('button', { name: /sign in/i });
await signInButton.waitFor({ state: 'visible' });
await signInButton.click();
```

#### 3. Make Keyboard Tests Deterministic

```typescript
// BEFORE (brittle - depends on initial focus state)
await page.keyboard.press('Tab'); // Email
await page.keyboard.press('Tab'); // Password
await page.keyboard.press('Tab'); // Submit button
await expect(submitButton).toBeFocused();

// AFTER (deterministic - explicitly set starting point)
const emailInput = page.getByLabel(/email/i);
await emailInput.waitFor({ state: 'visible' });
await emailInput.focus(); // Explicitly focus starting element
await page.keyboard.press('Tab'); // Password
await page.keyboard.press('Tab'); // Submit button
await expect(submitButton).toBeFocused();
```

## Implementation Tasks

### Task 1: Fix critical-paths.spec.ts (PRIORITY 1)

**Lines requiring fixes:**

- **Line 17**: Add `waitForLoadState` after `page.goto('/')`
- **Line 47**: Add `waitForLoadState` after `page.goto('/')`
- **Line 50**: Add visibility wait before `signInLink.click()`
- **Line 62**: Add `waitForLoadState` after `page.goto('/')`
- **Line 66**: Add visibility wait before `registerLink.click()`
- **Line 80-86**: Add `waitForLoadState` and visibility waits
- **Line 89-93**: Add `waitForLoadState` and visibility waits
- **Line 99**: Add `waitForLoadState` after `page.goto('/login')`
- **Line 109**: Add `waitForLoadState` after `page.goto('/register')`
- **Line 124**: Add `waitForLoadState` after `page.goto('/login')`
- **Line 127**: Add visibility wait before button click
- **Line 139**: Add `waitForLoadState` after `page.goto('/register')`
- **Line 142**: Add visibility wait before button click
- **Line 154**: Add `waitForLoadState` after `page.goto('/')`
- **Line 162**: Add `waitForLoadState` after `page.goto('/login')`
- **Line 173**: Add `waitForLoadState` after `page.goto('/register')`
- **Lines 186-196**: **CRITICAL** - Fix keyboard navigation test to be deterministic
- **Line 232**: Add `waitForLoadState` after `page.goto('/login')`

### Task 2: Fix login.spec.ts

**Lines requiring fixes:**

- **Line 16**: Add `waitForLoadState` in beforeEach
- **Lines 47-54**: Add visibility wait before button click
- **Lines 65**: Add visibility wait before button click
- **Lines 75**: Add visibility wait before button click
- **Lines 89**: Add visibility wait before button click
- **Lines 103**: Add visibility wait before button click
- **Line 115**: Add `waitForLoadState` after `page.goto('/register')`
- **Line 129**: Add `waitForLoadState` after `page.goto('/login')`
- **Lines 173-182**: **CRITICAL** - Fix keyboard navigation to be deterministic
- **Lines 186**: Add visibility wait before button click
- **Line 221**: Add `waitForLoadState` in focus test

### Task 3: Fix registration.spec.ts

**Lines requiring fixes:**

- **Line 16**: Add `waitForLoadState` in beforeEach
- **Lines 57, 70, 78, 90, 100, 114**: Add visibility waits before button clicks
- **Lines 204-215**: **CRITICAL** - Fix keyboard navigation to be deterministic
- **Lines 220**: Add visibility wait before button click

### Task 4: Fix wcag-compliance.spec.ts

**Lines requiring fixes:**

- **Line 21**: Add `waitForLoadState` after `page.goto('/')`
- **Line 42**: Add `waitForLoadState` after `page.goto('/login')`
- **Line 59**: Add `waitForLoadState` after `page.goto('/register')`
- **Line 78**: Add `waitForLoadState` after `page.goto('/login')`
- **Line 81**: Add visibility wait before button click
- **Line 101**: Add `waitForLoadState` after `page.goto('/register')`
- **Line 104**: Add visibility wait before button click
- **Lines 126-148**: Add `waitForLoadState` after `page.goto('/')`
- **Lines 152-165**: **CRITICAL** - Fix keyboard navigation to be deterministic
- **Lines 169-179**: **CRITICAL** - Fix keyboard navigation to be deterministic
- **Lines 183-196**: Add `waitForLoadState` and fix keyboard form submission
- **Line 202**: Add `waitForLoadState` after `page.goto('/login')`
- **Line 227**: Add `waitForLoadState` after `page.goto('/login')`
- **Line 229**: Add visibility wait before button click
- **Line 239**: Add `waitForLoadState` after `page.goto('/')`
- **Line 256**: Add `waitForLoadState` after `page.goto('/login')`
- **Line 275**: Add `waitForLoadState` after `page.goto('/')`
- **Line 292**: Add `waitForLoadState` after `page.goto('/login')`
- **Line 310**: Add `waitForLoadState` after `page.goto('/login')`
- **Line 313**: Add visibility wait before button click
- **Line 330**: Add `waitForLoadState` after `page.goto('/')`
- **Line 338**: Add `waitForLoadState` after `page.goto('/login')`
- **Line 350**: Add `waitForLoadState` after `page.goto('/login')`

### Task 5: Fix remaining E2E test files

- `/e2e/app.spec.ts`
- `/e2e/auth/rate-limiting.spec.ts`
- `/e2e/document/conflict-resolution.spec.ts`

Apply the same patterns as above.

## Exit Criteria

1. All E2E tests pass locally without timeout errors
2. All E2E tests pass in CI without timeout errors
3. No test timeout increased beyond 30000ms (fix race conditions, don't mask them)
4. All keyboard navigation tests are deterministic (explicitly set focus)
5. All element interactions wait for visibility first
6. All page navigations wait for load state

## Success Metrics

- **Before**: Tests timeout after 30000ms
- **After**: Tests complete in <10000ms per test
- **Flakiness**: 0% (currently experiencing intermittent failures)
- **CI Reliability**: 100% pass rate

## Notes

- This is a **QUALITY** fix, not a **PERFORMANCE** fix
- The goal is **ROBUSTNESS** and **DETERMINISM**
- Only increase timeouts as a last resort after fixing all race conditions
- Tests should work reliably in both fast (local) and slow (CI) environments

## Dependencies

None - This is a standalone task

## Assigned To

- **Lead**: QA Architect
- **Support**: Senior Developer
- **Reviewer**: Code Quality Enforcer

## Timeline Estimate

- **Task 1 (critical-paths.spec.ts)**: 45 minutes
- **Task 2 (login.spec.ts)**: 30 minutes
- **Task 3 (registration.spec.ts)**: 30 minutes
- **Task 4 (wcag-compliance.spec.ts)**: 45 minutes
- **Task 5 (remaining files)**: 30 minutes
- **Testing & Validation**: 30 minutes

**Total Estimated Duration**: ~3 hours
