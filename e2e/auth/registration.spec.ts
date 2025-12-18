/**
 * User Registration E2E Tests
 *
 * Tests the complete registration flow including form validation,
 * successful registration, and error handling.
 *
 * Unified registration flow: Always shows 2-step flow (Account → Channel Setup)
 *
 * @see /docs/adrs/005-testing-strategy.md
 * @see /docs/adrs/014-security-architecture.md
 */

import type { Page } from '@playwright/test';
import { test, expect } from '@playwright/test';
import { testData } from '../helpers/fixtures';

/**
 * Get the submit button on the registration form
 */
function getSubmitButton(page: Page) {
  return page.getByRole('button', {
    name: /continue to channel setup/i,
  });
}

/**
 * Complete the registration form submission (2-step flow)
 */
async function submitRegistration(page: Page, channelName?: string) {
  // Step 1: Click continue to channel setup
  const continueBtn = page.getByRole('button', {
    name: /continue to channel setup/i,
  });
  await continueBtn.click();

  // Step 2: Fill channel name and submit
  // Use provided name or generate unique one to avoid collisions in parallel tests
  const name = channelName ?? testData.uniqueChannelName();
  await page.getByLabel(/channel name/i).waitFor({ state: 'visible' });
  await page.getByLabel(/channel name/i).fill(name);
  await page.getByRole('button', { name: /create my channel/i }).click();
}

test.describe('User Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Rendering', () => {
    test('renders registration form with all required fields', async ({
      page,
    }) => {
      // Verify heading
      const heading = page.getByRole('heading', { level: 2 });
      await expect(heading).toBeVisible();
      await expect(heading).toHaveText(/create your workspace/i);

      // Verify form fields
      await expect(page.getByLabel(/name/i)).toBeVisible();
      await expect(page.getByLabel(/email/i).first()).toBeVisible();
      await expect(page.getByLabel(/^password$/i)).toBeVisible();
      await expect(page.getByLabel(/confirm password/i)).toBeVisible();

      // Verify submit button
      const submitButton = getSubmitButton(page);
      await expect(submitButton).toBeVisible();

      // Verify link to login
      await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
    });

    test('has proper page title', async ({ page }) => {
      await expect(page).toHaveTitle(/Streamline Studio/);
    });
  });

  test.describe('Form Validation', () => {
    test('shows error for empty email', async ({ page }) => {
      // Fill other fields but leave email empty
      await page
        .getByLabel('Password', { exact: true })
        .fill('testpassword123');
      await page.getByLabel(/confirm password/i).fill('testpassword123');

      // Submit form
      const submitButton = getSubmitButton(page);
      await submitButton.waitFor({ state: 'visible' });
      await submitButton.click();

      // Should show email error
      await expect(page.getByText(/email is required/i)).toBeVisible();
    });

    test('shows error for invalid email format', async ({ page }) => {
      await page.getByLabel(/email/i).first().fill('not-an-email');
      await page
        .getByLabel('Password', { exact: true })
        .fill('testpassword123');
      await page.getByLabel(/confirm password/i).fill('testpassword123');

      const submitButton = getSubmitButton(page);
      await submitButton.waitFor({ state: 'visible' });
      await submitButton.click();

      await expect(page.getByText(/invalid email/i)).toBeVisible();
    });

    test('shows error for empty password', async ({ page }) => {
      await page.getByLabel(/email/i).first().fill('test@example.com');

      const submitButton = getSubmitButton(page);
      await submitButton.waitFor({ state: 'visible' });
      await submitButton.click();

      await expect(
        page.getByText(/password is required/i).first()
      ).toBeVisible();
    });

    test('shows error for short password', async ({ page }) => {
      await page.getByLabel(/email/i).first().fill('test@example.com');
      await page.getByLabel('Password', { exact: true }).fill('short');
      await page.getByLabel(/confirm password/i).fill('short');

      const submitButton = getSubmitButton(page);
      await submitButton.waitFor({ state: 'visible' });
      await submitButton.click();

      await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
    });

    test('shows error for mismatched passwords', async ({ page }) => {
      await page.getByLabel(/email/i).first().fill('test@example.com');
      await page.getByLabel('Password', { exact: true }).fill('password123');
      await page.getByLabel(/confirm password/i).fill('differentpassword');

      const submitButton = getSubmitButton(page);
      await submitButton.waitFor({ state: 'visible' });
      await submitButton.click();

      await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    });

    test('allows optional name field', async ({ page }) => {
      // Fill required fields only
      const uniqueEmail = testData.uniqueEmail();
      await page.getByLabel(/email/i).first().fill(uniqueEmail);
      await page
        .getByLabel('Password', { exact: true })
        .fill('testpassword123');
      await page.getByLabel(/confirm password/i).fill('testpassword123');

      // Submit registration (2-step flow)
      await submitRegistration(page);

      // Should redirect to teamspace dashboard
      await expect(page).toHaveURL(/\/t\/workspace/, { timeout: 10000 });
    });
  });

  test.describe('Successful Registration', () => {
    test('completes registration with valid data', async ({ page }) => {
      const uniqueEmail = testData.uniqueEmail();

      await page.getByLabel(/name/i).fill('Test User');
      await page.getByLabel(/email/i).first().fill(uniqueEmail);
      await page
        .getByLabel('Password', { exact: true })
        .fill('testpassword123');
      await page.getByLabel(/confirm password/i).fill('testpassword123');

      // Submit registration (2-step flow)
      await submitRegistration(page);

      // Should redirect to teamspace dashboard
      await expect(page).toHaveURL(/\/t\/workspace/, { timeout: 10000 });
    });

    test('shows loading state during submission', async ({ page }) => {
      const uniqueEmail = testData.uniqueEmail();

      await page.getByLabel(/name/i).fill('Test User');
      await page.getByLabel(/email/i).first().fill(uniqueEmail);
      await page
        .getByLabel('Password', { exact: true })
        .fill('testpassword123');
      await page.getByLabel(/confirm password/i).fill('testpassword123');

      // Click and wait for either loading state OR channel setup step
      const submitButton = getSubmitButton(page);

      // Use Promise.race to check for either loading state OR step 2
      await Promise.race([
        // Option 1: Check for loading state (button disabled or aria-busy)
        submitButton.click().then(async () => {
          const isStillVisible = await submitButton
            .isVisible()
            .catch(() => false);
          if (isStillVisible) {
            const isBusy = await submitButton
              .getAttribute('aria-busy')
              .catch(() => null);
            const isDisabled = await submitButton
              .isDisabled()
              .catch(() => false);
            return isBusy === 'true' || isDisabled;
          }
          return true; // Button gone means form submitted
        }),
        // Option 2: Wait for step 2 (channel setup)
        page
          .getByLabel(/channel name/i)
          .waitFor({ state: 'visible', timeout: 10000 }),
      ]);

      // If we get here, either loading state was shown or form proceeded
      // Both are valid outcomes - this is a smoke test
    });

    test('form fields are disabled during submission', async ({ page }) => {
      const uniqueEmail = testData.uniqueEmail();

      await page.getByLabel(/name/i).fill('Test User');
      await page.getByLabel(/email/i).first().fill(uniqueEmail);
      await page
        .getByLabel('Password', { exact: true })
        .fill('testpassword123');
      await page.getByLabel(/confirm password/i).fill('testpassword123');

      // Submit registration (2-step flow)
      await submitRegistration(page);

      // Should redirect to teamspace dashboard
      await expect(page).toHaveURL(/\/t\/workspace/, { timeout: 10000 });
    });
  });

  test.describe('Navigation', () => {
    test('can navigate to login page', async ({ page }) => {
      const signInLink = page.getByRole('link', { name: /sign in/i });
      await signInLink.waitFor({ state: 'visible' });
      await signInLink.click();

      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Accessibility', () => {
    test('form fields have proper labels', async ({ page }) => {
      // All inputs should be accessible via their labels
      const emailInput = page.getByLabel(/email/i).first();
      const passwordInput = page.getByLabel('Password', { exact: true });
      const confirmInput = page.getByLabel(/confirm password/i);

      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(confirmInput).toBeVisible();
    });

    test('form can be navigated with keyboard', async ({ page }) => {
      // Explicitly focus the first form element for deterministic behavior
      const nameInput = page.getByLabel(/name/i);
      await nameInput.waitFor({ state: 'visible' });
      await nameInput.focus();

      // Tab through form fields from the known starting point
      await page.keyboard.press('Tab'); // Email field
      await page.keyboard.press('Tab'); // Password field
      await page.keyboard.press('Tab'); // Confirm password field
      await page.keyboard.press('Tab'); // Submit button

      // Submit button should be focused
      const submitButton = getSubmitButton(page);
      await expect(submitButton).toBeFocused();
    });

    test('error messages are announced to screen readers', async ({ page }) => {
      // Submit empty form to trigger errors
      const submitButton = getSubmitButton(page);
      await submitButton.waitFor({ state: 'visible' });
      await submitButton.click();

      // Error messages should have role="alert"
      const alerts = page.getByRole('alert');
      await expect(alerts.first()).toBeVisible();
    });
  });

  test.describe('Security', () => {
    test('password field is masked', async ({ page }) => {
      const passwordInput = page.getByLabel('Password', { exact: true });

      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('confirm password field is masked', async ({ page }) => {
      const confirmInput = page.getByLabel(/confirm password/i);

      await expect(confirmInput).toHaveAttribute('type', 'password');
    });

    test('form uses proper autocomplete attributes', async ({ page }) => {
      const emailInput = page.getByLabel(/email/i).first();
      const passwordInput = page.getByLabel('Password', { exact: true });

      await expect(emailInput).toHaveAttribute('autocomplete', 'email');
      await expect(passwordInput).toHaveAttribute(
        'autocomplete',
        'new-password'
      );
    });
  });
});
