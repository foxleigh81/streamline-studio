# Plan 03: WCAG Accessibility Tests - Fix AAA to AA Mismatch

## Priority: P1 (HIGH - AFFECTS ~14 TESTS)

## Status: Ready for Implementation

## Problem Statement

The WCAG accessibility tests are configured to check for **WCAG 2.1 AAA** compliance (7:1 contrast ratio) when the project requirement is **WCAG 2.1 AA** compliance (4.5:1 contrast ratio). This causes valid AA-compliant UI elements to fail the tests.

### Current Issues

1. Tests use `wcag2aaa` and `wcag21aaa` tags in axe-core
2. These tags include `color-contrast-enhanced` rule (7:1 ratio requirement)
3. Project UI meets AA standards (4.5:1 ratio) but fails AAA tests
4. Approximately 14 accessibility tests failing due to this mismatch

### Evidence from Test Failures

```
color-contrast-enhanced: Ensure the contrast between foreground
and background colors meets WCAG 2 AAA enhanced contrast ratio thresholds
```

### Project Requirements

From `CLAUDE.md` and ADR documentation:

- Target: **WCAG 2.1 Level AA** conformance
- Standard contrast ratio: 4.5:1 for normal text, 3:1 for large text
- AAA compliance (7:1) is NOT a project requirement

## Solution Design

### Root Cause

The `wcag-compliance.spec.ts` file (line 16) defines:

```typescript
const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
```

While this looks correct, axe-core's `withTags()` is **additive**, not restrictive. The test configuration needs to explicitly disable AAA rules.

### Correct Approach

Use axe-core's `disableRules()` method to explicitly disable AAA-specific rules:

```typescript
.disableRules(['color-contrast-enhanced']) // AAA only
```

## Implementation Plan

### Files to Modify

1. **`/e2e/accessibility/wcag-compliance.spec.ts`** (Required)
   - Remove AAA tags from wcagTags array
   - Add explicit rule disabling for AAA-only rules
   - Update test descriptions to clarify AA compliance
   - Fix keyboard navigation tests (additional issues found)

### Changes Required

#### 1. Update wcag-compliance.spec.ts

**Section: Configuration (lines 12-16)**

**Current**:

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Configure axe to check WCAG 2.1 AA
const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
```

**Updated**:

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Configure axe to check WCAG 2.1 Level AA compliance only
// Explicitly exclude AAA-level rules
const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// AAA-only rules to disable (not project requirements)
const disabledRules = [
  'color-contrast-enhanced', // AAA 7:1 contrast (we target AA 4.5:1)
];
```

**Section: All AxeBuilder instances**

Update every `new AxeBuilder({ page })` call to include disabled rules.

**Pattern to Replace**:

```typescript
const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
```

**Replace With**:

```typescript
const results = await new AxeBuilder({ page })
  .withTags(wcagTags)
  .disableRules(disabledRules)
  .analyze();
```

**Affected Lines**:

- Line 24 (homepage test)
- Line 46 (login page test)
- Line 64 (registration page test)
- Line 92 (login form with errors test)
- Line 120 (registration form with errors test)
- Line 270 (homepage color contrast test)
- Line 288 (login page color contrast test)
- Line 313 (homepage heading structure test)
- Line 327 (login page form labels test)
- Line 390 (mobile login page test)

**Section: Test Descriptions**

Update test descriptions to clarify AA compliance:

**Line 18**:

```typescript
test.describe('WCAG 2.1 AA Accessibility Compliance', () => {
```

Keep as-is (already correct).

**Line 265**:

```typescript
test.describe('Color Contrast', () => {
  test('homepage meets color contrast requirements', async ({ page }) => {
```

Update to:

```typescript
test.describe('Color Contrast (WCAG AA)', () => {
  test('homepage meets AA color contrast requirements', async ({ page }) => {
```

**Line 284**:

```typescript
  test('login page meets color contrast requirements', async ({ page }) => {
```

Update to:

```typescript
  test('login page meets AA color contrast requirements', async ({ page }) => {
```

#### 2. Fix Keyboard Navigation Test Issues

Several keyboard navigation tests have issues unrelated to WCAG level:

**Line 187 (registration form keyboard navigation)**

**Current**:

```typescript
test('registration form is keyboard navigable', async ({ page }) => {
  await page.goto('/register');
  await page.waitForLoadState('networkidle');

  // Explicitly focus the first form element for deterministic behavior
  const nameField = page.getByLabel(/name/i);
  await nameField.waitFor({ state: 'visible' });
  await nameField.focus();

  // Tab through form from the known starting point
  await page.keyboard.press('Tab'); // Email
  await page.keyboard.press('Tab'); // Password
  await page.keyboard.press('Tab'); // Confirm password
  await page.keyboard.press('Tab'); // Submit button

  const submit = page.getByRole('button', { name: /create account/i });
  await expect(submit).toBeFocused();
});
```

**Issue**: Registration form doesn't have a "name" field - it has email, password, and confirm password.

**Updated**:

```typescript
test('registration form is keyboard navigable', async ({ page }) => {
  await page.goto('/register');
  await page.waitForLoadState('networkidle');

  // Explicitly focus the first form element for deterministic behavior
  const emailField = page.getByLabel(/email/i).first();
  await emailField.waitFor({ state: 'visible' });
  await emailField.focus();
  await expect(emailField).toBeFocused();

  // Tab through form from the known starting point
  await page.keyboard.press('Tab'); // Password
  const passwordField = page.getByLabel('Password', { exact: true });
  await expect(passwordField).toBeFocused();

  await page.keyboard.press('Tab'); // Confirm password
  const confirmField = page.getByLabel(/confirm password/i);
  await expect(confirmField).toBeFocused();

  await page.keyboard.press('Tab'); // Submit button
  const submit = page.getByRole('button', { name: /create account/i });
  await expect(submit).toBeFocused();
});
```

### Complete Updated wcag-compliance.spec.ts (Key Sections)

**Top of file**:

```typescript
/**
 * WCAG 2.1 AA Accessibility Compliance Tests
 *
 * Tests pages for accessibility compliance using axe-core.
 * These tests verify WCAG 2.1 Level AA conformance.
 *
 * @see /docs/adrs/005-testing-strategy.md
 */

/* eslint-disable no-console -- Console output is intentional for debugging accessibility violations */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Configure axe to check WCAG 2.1 Level AA compliance only
const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// AAA-only rules to disable (not project requirements)
const disabledRules = [
  'color-contrast-enhanced', // AAA 7:1 contrast (we target AA 4.5:1)
];
```

**Example test update (homepage)**:

```typescript
test('homepage is accessible', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page })
    .withTags(wcagTags)
    .disableRules(disabledRules) // ADDED
    .analyze();

  // Log violations for debugging
  if (results.violations.length > 0) {
    console.log('Homepage accessibility violations:');
    results.violations.forEach((violation) => {
      console.log(`- ${violation.id}: ${violation.description}`);
      violation.nodes.forEach((node) => {
        console.log(`  Target: ${node.target}`);
      });
    });
  }

  expect(results.violations).toHaveLength(0);
});
```

**Apply this pattern to all 10 AxeBuilder instances in the file.**

### Verification Steps

#### Local Verification

```bash
# 1. Run all accessibility tests
npm run test:a11y
# Expected: All tests pass (no AAA contrast violations)

# 2. Run specific test groups
npm run test:e2e -- e2e/accessibility/wcag-compliance.spec.ts -g "Color Contrast"
# Expected: Both color contrast tests pass

# 3. Run keyboard navigation tests
npm run test:e2e -- e2e/accessibility/wcag-compliance.spec.ts -g "Keyboard Navigation"
# Expected: All keyboard tests pass with correct field focusing

# 4. Check for AAA violations in output
npm run test:a11y 2>&1 | grep -i "color-contrast-enhanced"
# Expected: No matches (AAA rule disabled)
```

#### Manual Verification

Test that AA compliance is still enforced:

```bash
# Temporarily break AA contrast (reduce a color value)
# Run tests - should fail
# Revert change - tests should pass
```

#### CI Verification

After pushing changes:

```bash
# Check GitHub Actions logs for:
# 1. All accessibility tests passing
# 2. No "color-contrast-enhanced" violations
# 3. Keyboard navigation tests passing
```

### CI-Specific Considerations

#### Browser Rendering

Axe-core tests run in actual browsers, so CI and local results should match. However:

- Linux rendering may differ slightly from macOS/Windows
- Font rendering can affect contrast calculations
- CI uses Chromium only (as configured)

#### Contrast Calculation

Axe-core calculates contrast ratios based on:

- Foreground color (text)
- Background color (including transparency)
- Font size and weight

Ensure CSS doesn't use platform-specific fonts that could affect ratios.

### Expected Outcome

After these fixes:

1. All WCAG AA tests pass
2. No AAA-specific violations reported
3. Color contrast tests pass for AA-compliant UI
4. Keyboard navigation tests pass with correct field order
5. Approximately 14 tests change from FAIL → PASS

## Testing Strategy

### Test Categories Affected

1. **Public Pages** (3 tests)
   - Homepage accessibility
   - Login page accessibility
   - Registration page accessibility

2. **Form Accessibility** (2 tests)
   - Login form with errors
   - Registration form with errors

3. **Keyboard Navigation** (5 tests)
   - Homepage navigation
   - Login form navigation
   - Registration form navigation (FIXED)
   - Login form submission
   - [Others in file]

4. **Color Contrast** (2 tests)
   - Homepage contrast (FIXED)
   - Login page contrast (FIXED)

5. **Screen Reader Support** (3 tests)
   - Heading structure
   - Form labels
   - Error message association

6. **Mobile Accessibility** (2 tests)
   - Mobile login page
   - Touch target size

### Test Validation

```bash
# Before fix: Count failures
npm run test:a11y 2>&1 | grep -c "Expected: 0, Received: [1-9]"
# Expected: ~14 failures

# After fix: Count failures
npm run test:a11y 2>&1 | grep -c "Expected: 0, Received: [1-9]"
# Expected: 0 failures
```

## Dependencies

### Blocked By

- Plan 01 (Infrastructure) - Server must start
- Plan 02 (Test Configuration) - Config must be correct

### Blocks

- None (can run in parallel with Plans 04-06)

## Success Criteria

- [ ] All WCAG AA tags enabled
- [ ] AAA-specific rules disabled
- [ ] No `color-contrast-enhanced` violations
- [ ] All 17 accessibility tests pass
- [ ] Keyboard navigation tests use correct selectors
- [ ] Color contrast tests explicitly check AA compliance
- [ ] Test descriptions accurately reflect AA target
- [ ] CI accessibility job passes

## Risk Assessment

### Risk Level: LOW

Changes only test expectations, not application code.

### Mitigation

1. Verify AA compliance is still enforced
2. Test locally before pushing to CI
3. Check that other accessibility rules still run

### Impact Analysis

- **Positive**: Tests align with project requirements, more accurate compliance checking
- **Negative**: None (AA compliance maintained)
- **Neutral**: Test configuration change only

## Rollback Plan

If issues arise, revert to original configuration:

```typescript
// Remove disabledRules
const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// Use without disableRules()
const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
```

**Note**: This will bring back AAA failures, but won't break anything.

## References

### Documentation

- [WCAG 2.1 Level AA Guidelines](https://www.w3.org/WAI/WCAG21/quickref/?versions=2.1&levels=aa)
- [WCAG Contrast Requirements](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [axe-core API - disableRules](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md#api-name-axeconfigure)

### Project Documentation

- `/CLAUDE.md` - Project accessibility requirements
- `/docs/adrs/005-testing-strategy.md` - Testing strategy (mentions WCAG 2.1 AA)
- `/README.md` - Project overview

### Contrast Ratios

- **WCAG AA**: 4.5:1 for normal text, 3:1 for large text
- **WCAG AAA**: 7:1 for normal text, 4.5:1 for large text
- Project targets **AA only**

### Related Files

- `/e2e/accessibility/wcag-compliance.spec.ts` - This file
- `/src/themes/default/` - Theme colors (used for contrast)
- `/src/components/ui/` - UI components (tested for accessibility)

---

**Last Updated**: 2025-12-12
**Status**: Ready for implementation
**Priority**: P1 - HIGH
**Estimated Time**: 20 minutes
**Owner**: QA Architect
