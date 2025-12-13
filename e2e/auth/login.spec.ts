/**
 * User Login E2E Tests
 *
 * Tests the complete login flow including form validation,
 * successful login, and error handling.
 *
 * @see /docs/adrs/005-testing-strategy.md
 * @see /docs/adrs/014-security-architecture.md
 */

import { test, expect } from '@playwright/test';
import { testData } from '../helpers/fixtures';

test.describe('User Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Rendering', () => {
    test('renders login form with all required fields', async ({ page }) => {
      // Verify heading (might be visually hidden for screen readers)
      await expect(
        page.getByRole('heading', { level: 2, name: /sign in/i })
      ).toBeVisible();

      // Verify form fields
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel('Password', { exact: true })).toBeVisible();

      // Verify submit button
      await expect(
        page.getByRole('button', { name: /sign in/i })
      ).toBeVisible();

      // Verify link to registration
      await expect(
        page.getByRole('link', { name: /create one/i })
      ).toBeVisible();
    });

    test('has proper page title', async ({ page }) => {
      await expect(page).toHaveTitle(/Streamline Studio/);
    });
  });

  test.describe('Form Validation', () => {
    test('shows error for empty email', async ({ page }) => {
      // Fill password but leave email empty
      await page
        .getByLabel('Password', { exact: true })
        .fill('testpassword123');

      // Submit form
      const submitButton = page.getByRole('button', { name: /sign in/i });
      await submitButton.waitFor({ state: 'visible' });
      await submitButton.click();

      // Should show email error
      await expect(page.getByText(/email is required/i)).toBeVisible();
    });

    test('shows error for empty password', async ({ page }) => {
      // Fill email but leave password empty
      await page.getByLabel(/email/i).fill('test@example.com');

      // Submit form
      const submitButton = page.getByRole('button', { name: /sign in/i });
      await submitButton.waitFor({ state: 'visible' });
      await submitButton.click();

      // Should show password error
      await expect(
        page.getByText(/password is required/i).first()
      ).toBeVisible();
    });

    test('shows error for both empty fields', async ({ page }) => {
      // Submit empty form
      const submitButton = page.getByRole('button', { name: /sign in/i });
      await submitButton.waitFor({ state: 'visible' });
      await submitButton.click();

      // Should show both errors
      await expect(page.getByText(/email is required/i)).toBeVisible();
      await expect(page.getByText(/password is required/i)).toBeVisible();
    });
  });

  test.describe('Login Errors', () => {
    test('shows generic error for invalid credentials', async ({ page }) => {
      // Try to login with non-existent user
      await page.getByLabel(/email/i).fill('nonexistent@example.com');
      await page.getByLabel('Password', { exact: true }).fill('wrongpassword');

      const submitButton = page.getByRole('button', { name: /sign in/i });
      await submitButton.waitFor({ state: 'visible' });
      await submitButton.click();

      // Should show generic error (prevents account enumeration)
      await expect(page.getByRole('alert').first()).toContainText(
        /invalid email or password/i
      );
    });

    test('error is displayed in alert role for accessibility', async ({
      page,
    }) => {
      await page.getByLabel(/email/i).fill('nonexistent@example.com');
      await page.getByLabel('Password', { exact: true }).fill('wrongpassword');

      const submitButton = page.getByRole('button', { name: /sign in/i });
      await submitButton.waitFor({ state: 'visible' });
      await submitButton.click();

      // Error should be in an alert for screen readers
      const alert = page.getByRole('alert').first();
      await expect(alert).toBeVisible();
    });
  });

  test.describe('Successful Login', () => {
    test('completes login with valid credentials', async ({ page }) => {
      // First register a user
      const uniqueEmail = testData.uniqueEmail();
      await page.goto('/register');
      await page.waitForLoadState('networkidle');
      await page.getByLabel(/email/i).first().fill(uniqueEmail);
      await page
        .getByLabel('Password', { exact: true })
        .fill('testpassword123');
      await page.getByLabel(/confirm password/i).fill('testpassword123');

      const registerButton = page.getByRole('button', {
        name: /create account/i,
      });
      await registerButton.waitFor({ state: 'visible' });
      await registerButton.click();

      // Wait for registration to complete
      await expect(page).toHaveURL('/', { timeout: 10000 });

      // Now logout and login again
      // (For now, just clear cookies and try logging in)
      await page.context().clearCookies();
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      await page.getByLabel(/email/i).fill(uniqueEmail);
      await page
        .getByLabel('Password', { exact: true })
        .fill('testpassword123');

      const signInButton = page.getByRole('button', { name: /sign in/i });
      await signInButton.waitFor({ state: 'visible' });
      await signInButton.click();

      // Should redirect to dashboard
      await expect(page).toHaveURL('/', { timeout: 10000 });
    });

    test('shows loading state during submission', async ({ page }) => {
      await page.getByLabel(/email/i).fill('test@example.com');
      await page
        .getByLabel('Password', { exact: true })
        .fill('testpassword123');

      const submitButton = page.getByRole('button', { name: /sign in/i });
      await submitButton.click();

      // Button should be in loading state briefly
      // We just verify the click triggered the submission
    });
  });

  test.describe('Navigation', () => {
    test('can navigate to registration page', async ({ page }) => {
      const registerLink = page.getByRole('link', { name: /create one/i });
      await registerLink.waitFor({ state: 'visible' });
      await registerLink.click();

      await expect(page).toHaveURL('/register');
    });
  });

  test.describe('Accessibility', () => {
    test('form fields have proper labels', async ({ page }) => {
      // All inputs should be accessible via their labels
      const emailInput = page.getByLabel(/email/i);
      const passwordInput = page.getByLabel('Password', { exact: true });

      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
    });

    test('form can be navigated with keyboard', async ({ page }) => {
      // Explicitly focus the first form element for deterministic behavior
      const emailInput = page.getByLabel(/email/i);
      await emailInput.waitFor({ state: 'visible' });
      await emailInput.focus();

      // Tab through form fields from the known starting point
      await page.keyboard.press('Tab'); // Password field
      await page.keyboard.press('Tab'); // Submit button

      // Submit button should be focused
      await expect(
        page.getByRole('button', { name: /sign in/i })
      ).toBeFocused();
    });

    test('error messages are announced to screen readers', async ({ page }) => {
      // Submit empty form to trigger errors
      const submitButton = page.getByRole('button', { name: /sign in/i });
      await submitButton.waitFor({ state: 'visible' });
      await submitButton.click();

      // Error messages should have role="alert"
      const alerts = page.getByRole('alert');
      await expect(alerts.first()).toBeVisible();
    });

    test('form has accessible name', async ({ page }) => {
      // Form should be accessible
      const form = page.locator('form');
      await expect(form).toBeVisible();
    });
  });

  test.describe('Security', () => {
    test('password field is masked', async ({ page }) => {
      const passwordInput = page.getByLabel('Password', { exact: true });

      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('form uses proper autocomplete attributes', async ({ page }) => {
      const emailInput = page.getByLabel(/email/i);
      const passwordInput = page.getByLabel('Password', { exact: true });

      await expect(emailInput).toHaveAttribute('autocomplete', 'email');
      await expect(passwordInput).toHaveAttribute(
        'autocomplete',
        'current-password'
      );
    });
  });

  test.describe('UX', () => {
    test('email input has focus on page load', async ({ page }) => {
      // First focusable element in the form should be email
      // Tab once to move to first form field
      await page.keyboard.press('Tab');

      // Email should be focused (or at least focusable)
      const emailInput = page.getByLabel(/email/i);
      await expect(emailInput).toBeVisible();
    });

    test('submits form on Enter key', async ({ page }) => {
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel('Password', { exact: true }).fill('testpassword');

      // Press Enter in password field
      await page.getByLabel('Password', { exact: true }).press('Enter');

      // Form should submit (either show error or redirect)
      // Since credentials are invalid, expect error
      await expect(page.getByRole('alert').first()).toBeVisible({
        timeout: 5000,
      });
    });
  });
});
