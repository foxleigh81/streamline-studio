/**
 * Rate Limiting E2E Tests
 *
 * Tests that rate limiting properly blocks excessive login attempts.
 * This is a critical security requirement from ADR-014.
 *
 * @see /docs/adrs/005-testing-strategy.md
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/014-security-architecture.md
 */

import { test, expect } from '@playwright/test';
import { testData } from '../helpers/fixtures';

test.describe('Rate Limiting', () => {
  test.describe('Login Rate Limiting', () => {
    test('should block 6th login attempt within 60 seconds', async ({
      page,
    }) => {
      await page.goto('/login');

      const email = testData.uniqueEmail();
      const password = 'wrongpassword';

      // Attempt 1-5: Should all fail with "Invalid email or password"
      for (let i = 1; i <= 5; i++) {
        await page.getByLabel(/email/i).fill(email);
        await page.getByLabel(/password/i).fill(password);
        await page.getByRole('button', { name: /sign in/i }).click();

        // Wait for error message
        await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('alert')).toContainText(
          /invalid email or password/i
        );

        // Clear form for next attempt
        if (i < 5) {
          await page.getByLabel(/email/i).clear();
          await page.getByLabel(/password/i).clear();
        }
      }

      // Attempt 6: Should be rate limited
      await page.getByLabel(/email/i).clear();
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/password/i).clear();
      await page.getByLabel(/password/i).fill(password);
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should show rate limit error
      await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('alert')).toContainText(/too many/i);
    });

    test('rate limit is per IP + email combination', async ({
      page,
      context,
    }) => {
      // Create a new user to ensure we have a valid account
      const validEmail = testData.uniqueEmail();
      const validPassword = 'testpassword123';

      // Register user first
      await page.goto('/register');
      await page.getByLabel(/email/i).first().fill(validEmail);
      await page.getByLabel(/^password$/i).fill(validPassword);
      await page.getByLabel(/confirm password/i).fill(validPassword);
      await page.getByRole('button', { name: /create account/i }).click();

      // Wait for registration to complete
      await expect(page).toHaveURL('/', { timeout: 10000 });

      // Logout
      await context.clearCookies();

      // Try different email - should have separate rate limit
      await page.goto('/login');
      const differentEmail = testData.uniqueEmail();

      // Exhaust rate limit for first email
      for (let i = 1; i <= 5; i++) {
        await page.getByLabel(/email/i).fill(differentEmail);
        await page.getByLabel(/password/i).fill('wrongpassword');
        await page.getByRole('button', { name: /sign in/i }).click();
        await expect(page.getByRole('alert')).toBeVisible();
        await page.getByLabel(/email/i).clear();
        await page.getByLabel(/password/i).clear();
      }

      // Should be rate limited for first email
      await page.getByLabel(/email/i).fill(differentEmail);
      await page.getByLabel(/password/i).fill('wrongpassword');
      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page.getByRole('alert')).toContainText(/too many/i);

      // Clear form
      await page.getByLabel(/email/i).clear();
      await page.getByLabel(/password/i).clear();

      // But second email should still work (different rate limit key)
      await page.getByLabel(/email/i).fill(validEmail);
      await page.getByLabel(/password/i).fill(validPassword);
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should succeed (or at least not show rate limit error)
      await page.waitForLoadState('networkidle');
      const alert = page.getByRole('alert');
      const alertVisible = await alert.isVisible().catch(() => false);

      if (alertVisible) {
        const text = await alert.textContent();
        expect(text?.toLowerCase()).not.toContain('too many');
      } else {
        // Successfully logged in - redirected to dashboard
        await expect(page).toHaveURL('/', { timeout: 5000 });
      }
    });

    test('error message for rate limit does not reveal timing', async ({
      page,
    }) => {
      await page.goto('/login');

      const email = testData.uniqueEmail();
      const password = 'testpassword';

      // Exhaust rate limit
      for (let i = 1; i <= 6; i++) {
        await page.getByLabel(/email/i).fill(email);
        await page.getByLabel(/password/i).fill(password);
        await page.getByRole('button', { name: /sign in/i }).click();

        await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });

        if (i < 6) {
          await page.getByLabel(/email/i).clear();
          await page.getByLabel(/password/i).clear();
        }
      }

      // Check the error message doesn't reveal "how long to wait"
      const alertText = await page.getByRole('alert').textContent();

      // Should contain generic rate limit message
      expect(alertText?.toLowerCase()).toContain('too many');

      // Should not reveal exact timing like "57 seconds"
      // (this is debatable - we might want to show retry-after)
      // But definitely shouldn't reveal internal details
      expect(alertText).not.toContain('retry-after');
      expect(alertText).not.toContain('window');
    });
  });

  test.describe('Registration Rate Limiting', () => {
    test('should rate limit registration attempts', async ({ page }) => {
      await page.goto('/register');

      // Attempt multiple registrations with same email
      const email = testData.uniqueEmail();
      const password = 'testpassword123';

      // First attempt should succeed or show "already exists"
      await page.getByLabel(/email/i).first().fill(email);
      await page.getByLabel(/^password$/i).fill(password);
      await page.getByLabel(/confirm password/i).fill(password);
      await page.getByRole('button', { name: /create account/i }).click();

      // Wait for response (success or generic message)
      await page.waitForLoadState('networkidle');

      // Try registering again immediately with different emails
      for (let i = 1; i <= 3; i++) {
        await page.goto('/register');
        await page.getByLabel(/email/i).first().fill(testData.uniqueEmail());
        await page.getByLabel(/^password$/i).fill(password);
        await page.getByLabel(/confirm password/i).fill(password);
        await page.getByRole('button', { name: /create account/i }).click();

        await page.waitForLoadState('networkidle');
      }

      // 4th attempt should be rate limited
      await page.goto('/register');
      await page.getByLabel(/email/i).first().fill(testData.uniqueEmail());
      await page.getByLabel(/^password$/i).fill(password);
      await page.getByLabel(/confirm password/i).fill(password);
      await page.getByRole('button', { name: /create account/i }).click();

      // Should show rate limit error (registration limit is 3 per hour)
      await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
      const alertText = await page.getByRole('alert').textContent();
      expect(alertText?.toLowerCase()).toContain('too many');
    });
  });

  test.describe('Rate Limit Security', () => {
    test('should not reveal whether email exists via rate limiting', async ({
      page,
    }) => {
      // Create a real user
      const realEmail = testData.uniqueEmail();
      const password = 'testpassword123';

      await page.goto('/register');
      await page.getByLabel(/email/i).first().fill(realEmail);
      await page.getByLabel(/^password$/i).fill(password);
      await page.getByLabel(/confirm password/i).fill(password);
      await page.getByRole('button', { name: /create account/i }).click();
      await expect(page).toHaveURL('/', { timeout: 10000 });

      // Logout
      await page.context().clearCookies();

      // Try to brute force real account
      await page.goto('/login');
      for (let i = 1; i <= 6; i++) {
        await page.getByLabel(/email/i).fill(realEmail);
        await page.getByLabel(/password/i).fill('wrongpassword');
        await page.getByRole('button', { name: /sign in/i }).click();
        await expect(page.getByRole('alert')).toBeVisible();

        if (i < 6) {
          await page.getByLabel(/email/i).clear();
          await page.getByLabel(/password/i).clear();
        }
      }

      const realAccountError = await page.getByRole('alert').textContent();

      // Clear state
      await page.getByLabel(/email/i).clear();
      await page.getByLabel(/password/i).clear();
      await page.reload();

      // Try to brute force non-existent account
      const fakeEmail = testData.uniqueEmail();
      for (let i = 1; i <= 6; i++) {
        await page.getByLabel(/email/i).fill(fakeEmail);
        await page.getByLabel(/password/i).fill('wrongpassword');
        await page.getByRole('button', { name: /sign in/i }).click();
        await expect(page.getByRole('alert')).toBeVisible();

        if (i < 6) {
          await page.getByLabel(/email/i).clear();
          await page.getByLabel(/password/i).clear();
        }
      }

      const fakeAccountError = await page.getByRole('alert').textContent();

      // Both should show same rate limit message
      expect(realAccountError?.toLowerCase()).toContain('too many');
      expect(fakeAccountError?.toLowerCase()).toContain('too many');
    });
  });
});
