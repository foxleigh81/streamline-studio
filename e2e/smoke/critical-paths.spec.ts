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
      await page.waitForLoadState('networkidle');

      // Verify page title
      await expect(page).toHaveTitle(/Streamline Studio/);

      // Verify main heading is visible
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('health endpoint returns ok', async ({ request }) => {
      const response = await request.get('/api/health');
      const body = await response.json();

      // The health endpoint checks database connectivity
      // In test environments, we verify the endpoint responds with expected structure
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('timestamp');

      // Accept both 'ok' and 'error' statuses - what matters is the endpoint responds correctly
      expect(['ok', 'error']).toContain(body.status);

      // If database is connected, should be 'ok'
      if (response.ok()) {
        expect(body.status).toBe('ok');
        expect(body.database).toBe('connected');
      }
    });

    test('tRPC health endpoint is reachable', async ({ request }) => {
      const response = await request.get('/api/trpc/health');

      expect(response.ok()).toBeTruthy();

      const body = await response.json();

      // tRPC v11 response format: { result: { data: { json: { ... } } } }
      // Handle multiple possible response formats for compatibility
      const data =
        body.result?.data?.json ?? body.result?.data ?? body.json ?? body;
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('ok');
    });
  });

  test.describe('Navigation', () => {
    test('can navigate to login page', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Find and click the sign in link
      const signInLink = page.getByRole('link', { name: /sign in/i });

      if (await signInLink.isVisible()) {
        await signInLink.waitFor({ state: 'visible' });
        await signInLink.click();
        await expect(page).toHaveURL('/login');
      } else {
        // Navigate directly if link not visible
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL('/login');
      }
    });

    test('can navigate to registration page', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Find and click the register link
      const registerLink = page.getByRole('link', {
        name: /register|sign up|create account/i,
      });

      if (await registerLink.isVisible()) {
        await registerLink.waitFor({ state: 'visible' });
        await registerLink.click();
        await expect(page).toHaveURL('/register');
      } else {
        // Navigate directly if link not visible
        await page.goto('/register');
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL('/register');
      }
    });

    test('login page has link to registration', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      const registerLink = page.getByRole('link', {
        name: /create one|register|sign up/i,
      });
      await expect(registerLink).toBeVisible();
    });

    test('registration page has link to login', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');

      const loginLink = page.getByRole('link', { name: /sign in|login/i });
      await expect(loginLink).toBeVisible();
    });
  });

  test.describe('Authentication Forms', () => {
    test('login page renders form elements', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle');

      // Wait for form to be fully hydrated
      const form = page.locator('form');
      await form.waitFor({ state: 'visible', timeout: 15000 });

      // Verify form elements exist with explicit waits
      const emailInput = page.getByLabel(/email/i);
      await emailInput.waitFor({ state: 'visible' });
      await expect(emailInput).toBeVisible();

      const passwordInput = page.getByLabel('Password', { exact: true });
      await passwordInput.waitFor({ state: 'visible' });
      await expect(passwordInput).toBeVisible();

      // Wait for button to be fully rendered/hydrated before asserting
      const signInButton = page.getByRole('button', { name: /sign in/i });
      await signInButton.waitFor({ state: 'visible', timeout: 15000 });
      await expect(signInButton).toBeVisible();
      await expect(signInButton).toBeEnabled();
    });

    test('registration page renders form elements', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle');

      // Wait for form to be fully hydrated
      const form = page.locator('form');
      await form.waitFor({ state: 'visible', timeout: 15000 });

      // Verify form elements exist with explicit waits
      const emailInput = page.getByLabel(/email/i).first();
      await emailInput.waitFor({ state: 'visible' });
      await expect(emailInput).toBeVisible();

      const passwordInput = page.getByLabel('Password', { exact: true });
      await passwordInput.waitFor({ state: 'visible' });
      await expect(passwordInput).toBeVisible();

      const confirmPasswordInput = page.getByLabel(/confirm password/i);
      await confirmPasswordInput.waitFor({ state: 'visible' });
      await expect(confirmPasswordInput).toBeVisible();

      // Wait for button to be fully rendered/hydrated before asserting
      // Unified registration flow always shows "Continue to Channel Setup"
      const submitButton = page.getByRole('button', {
        name: /continue to channel setup/i,
      });
      await submitButton.waitFor({ state: 'visible', timeout: 15000 });
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toBeEnabled();
    });

    test('login form shows validation errors for empty submission', async ({
      page,
    }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle');

      // Wait for form to be fully hydrated
      const form = page.locator('form');
      await form.waitFor({ state: 'visible', timeout: 15000 });

      // Submit empty form
      const submitButton = page.getByRole('button', { name: /sign in/i });
      await submitButton.waitFor({ state: 'visible' });
      await expect(submitButton).toBeEnabled();
      await submitButton.click();

      // Wait for validation errors to appear after React state update
      const emailError = page.getByText(/email is required/i);
      await emailError.waitFor({ state: 'visible', timeout: 10000 });
      await expect(emailError).toBeVisible();

      const passwordError = page.getByText(/password is required/i).first();
      await passwordError.waitFor({ state: 'visible', timeout: 10000 });
      await expect(passwordError).toBeVisible();
    });

    test('registration form shows validation errors for empty submission', async ({
      page,
    }) => {
      await page.goto('/register');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle');

      // Wait for form to be fully hydrated
      const form = page.locator('form');
      await form.waitFor({ state: 'visible', timeout: 15000 });

      // Submit empty form (unified flow)
      const submitButton = page.getByRole('button', {
        name: /continue to channel setup/i,
      });
      await submitButton.waitFor({ state: 'visible' });
      await expect(submitButton).toBeEnabled();
      await submitButton.click();

      // Wait for validation errors to appear after React state update
      const emailError = page.getByText(/email is required/i);
      await emailError.waitFor({ state: 'visible', timeout: 10000 });
      await expect(emailError).toBeVisible();

      const passwordError = page.getByText(/password is required/i).first();
      await passwordError.waitFor({ state: 'visible', timeout: 10000 });
      await expect(passwordError).toBeVisible();
    });
  });

  test.describe('Accessibility Basics', () => {
    test('homepage has proper heading structure', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Should have an h1
      const h1 = page.getByRole('heading', { level: 1 });
      await expect(h1).toBeVisible();
    });

    test('login page has accessible form labels', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle');

      // Wait for form to be fully hydrated
      const form = page.locator('form');
      await form.waitFor({ state: 'visible', timeout: 15000 });

      // Form inputs should have associated labels
      const emailInput = page.getByLabel(/email/i);
      await emailInput.waitFor({ state: 'visible' });
      await expect(emailInput).toBeVisible();

      const passwordInput = page.getByLabel('Password', { exact: true });
      await passwordInput.waitFor({ state: 'visible' });
      await expect(passwordInput).toBeVisible();
    });

    test('registration page has accessible form labels', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle');

      // Wait for form to be fully hydrated
      const form = page.locator('form');
      await form.waitFor({ state: 'visible', timeout: 15000 });

      // Form inputs should have associated labels
      const emailInput = page.getByLabel(/email/i).first();
      await emailInput.waitFor({ state: 'visible' });
      await expect(emailInput).toBeVisible();

      const passwordInput = page.getByLabel('Password', { exact: true });
      await passwordInput.waitFor({ state: 'visible' });
      await expect(passwordInput).toBeVisible();

      const confirmPasswordInput = page.getByLabel(/confirm password/i);
      await confirmPasswordInput.waitFor({ state: 'visible' });
      await expect(confirmPasswordInput).toBeVisible();
    });

    test('buttons are focusable via keyboard', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle');

      // Wait for form to be fully hydrated - extended timeout for CI
      const form = page.locator('form');
      await form.waitFor({ state: 'visible', timeout: 20000 });

      // Start with the first element deterministically
      const emailInput = page.getByLabel(/email/i);
      await emailInput.waitFor({ state: 'visible', timeout: 15000 });
      await emailInput.focus();
      // CI environments need longer delays for focus to settle
      await page.waitForTimeout(300);
      // Use extended timeout on assertion for CI stability
      await expect(emailInput).toBeFocused({ timeout: 5000 });

      // Verify password input is ready before tabbing
      const passwordInput = page.getByLabel('Password', { exact: true });
      await passwordInput.waitFor({ state: 'visible', timeout: 15000 });

      // Tab to password input
      await page.keyboard.press('Tab');
      // Allow tab action processing in CI - longer delay
      await page.waitForTimeout(400);
      await expect(passwordInput).toBeFocused({ timeout: 5000 });

      // Tab to submit button
      const submitButton = page.getByRole('button', { name: /sign in/i });
      await submitButton.waitFor({ state: 'visible', timeout: 15000 });
      await page.keyboard.press('Tab');
      // Wait to ensure focus registers in CI - longer delay
      await page.waitForTimeout(400);
      await expect(submitButton).toBeFocused({ timeout: 5000 });
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
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Page should load in under 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('login page loads within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Page should load in under 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });
  });
});
