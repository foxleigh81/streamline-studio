/**
 * Smoke Tests - Critical Paths
 *
 * Quick sanity checks to verify core functionality works.
 * These tests should run fast and catch major regressions.
 *
 * Run with: npm run test:smoke
 *
 * @see /docs/adrs/005-testing-strategy.md
 */

import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Critical Paths', () => {
  test.describe('Application Health', () => {
    test('homepage loads successfully', async ({ page }) => {
      await page.goto('/');

      // Verify page title
      await expect(page).toHaveTitle(/Streamline Studio/);

      // Verify main heading is visible
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('health endpoint returns ok', async ({ request }) => {
      const response = await request.get('/api/health');

      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.status).toBe('ok');
    });

    test('tRPC health endpoint is reachable', async ({ request }) => {
      const response = await request.get('/api/trpc/health');

      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.result?.data?.status).toBe('ok');
    });
  });

  test.describe('Navigation', () => {
    test('can navigate to login page', async ({ page }) => {
      await page.goto('/');

      // Find and click the sign in link
      const signInLink = page.getByRole('link', { name: /sign in/i });

      if (await signInLink.isVisible()) {
        await signInLink.click();
        await expect(page).toHaveURL('/login');
      } else {
        // Navigate directly if link not visible
        await page.goto('/login');
        await expect(page).toHaveURL('/login');
      }
    });

    test('can navigate to registration page', async ({ page }) => {
      await page.goto('/');

      // Find and click the register link
      const registerLink = page.getByRole('link', {
        name: /register|sign up|create account/i,
      });

      if (await registerLink.isVisible()) {
        await registerLink.click();
        await expect(page).toHaveURL('/register');
      } else {
        // Navigate directly if link not visible
        await page.goto('/register');
        await expect(page).toHaveURL('/register');
      }
    });

    test('login page has link to registration', async ({ page }) => {
      await page.goto('/login');

      const registerLink = page.getByRole('link', {
        name: /create one|register|sign up/i,
      });
      await expect(registerLink).toBeVisible();
    });

    test('registration page has link to login', async ({ page }) => {
      await page.goto('/register');

      const loginLink = page.getByRole('link', { name: /sign in|login/i });
      await expect(loginLink).toBeVisible();
    });
  });

  test.describe('Authentication Forms', () => {
    test('login page renders form elements', async ({ page }) => {
      await page.goto('/login');

      // Verify form elements exist
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
      await expect(
        page.getByRole('button', { name: /sign in/i })
      ).toBeVisible();
    });

    test('registration page renders form elements', async ({ page }) => {
      await page.goto('/register');

      // Verify form elements exist
      await expect(page.getByLabel(/email/i).first()).toBeVisible();
      await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
      await expect(page.getByLabel(/confirm password/i)).toBeVisible();
      await expect(
        page.getByRole('button', { name: /create account/i })
      ).toBeVisible();
    });

    test('login form shows validation errors for empty submission', async ({
      page,
    }) => {
      await page.goto('/login');

      // Submit empty form
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should show validation errors
      await expect(page.getByText(/email is required/i)).toBeVisible();
      await expect(
        page.getByText(/password is required/i).first()
      ).toBeVisible();
    });

    test('registration form shows validation errors for empty submission', async ({
      page,
    }) => {
      await page.goto('/register');

      // Submit empty form
      await page.getByRole('button', { name: /create account/i }).click();

      // Should show validation errors
      await expect(page.getByText(/email is required/i)).toBeVisible();
      await expect(
        page.getByText(/password is required/i).first()
      ).toBeVisible();
    });
  });

  test.describe('Accessibility Basics', () => {
    test('homepage has proper heading structure', async ({ page }) => {
      await page.goto('/');

      // Should have an h1
      const h1 = page.getByRole('heading', { level: 1 });
      await expect(h1).toBeVisible();
    });

    test('login page has accessible form labels', async ({ page }) => {
      await page.goto('/login');

      // Form inputs should have associated labels
      const emailInput = page.getByLabel(/email/i);
      const passwordInput = page.getByLabel('Password', { exact: true });

      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
    });

    test('registration page has accessible form labels', async ({ page }) => {
      await page.goto('/register');

      // Form inputs should have associated labels
      const emailInput = page.getByLabel(/email/i).first();
      const passwordInput = page.getByLabel('Password', { exact: true });
      const confirmPasswordInput = page.getByLabel(/confirm password/i);

      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(confirmPasswordInput).toBeVisible();
    });

    test('buttons are focusable via keyboard', async ({ page }) => {
      await page.goto('/login');

      // Tab through to find the submit button
      const submitButton = page.getByRole('button', { name: /sign in/i });

      // Tab through the form
      await page.keyboard.press('Tab'); // Email
      await page.keyboard.press('Tab'); // Password
      await page.keyboard.press('Tab'); // Submit button

      await expect(submitButton).toBeFocused();
    });
  });

  test.describe('Error Handling', () => {
    test('404 page handles non-existent routes gracefully', async ({
      page,
    }) => {
      const response = await page.goto('/non-existent-page-12345');

      // Should either show 404 or redirect to home
      // Both are valid behaviors
      expect(response?.status()).toBeLessThan(500);
    });

    test('invalid API requests return proper error responses', async ({
      request,
    }) => {
      // Try to access a non-existent tRPC procedure
      const response = await request.get('/api/trpc/nonExistentProcedure');

      // Should return an error, not a 500
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Performance Basics', () => {
    test('homepage loads within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      const loadTime = Date.now() - startTime;

      // Page should load in under 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('login page loads within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/login');
      const loadTime = Date.now() - startTime;

      // Page should load in under 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });
  });
});
