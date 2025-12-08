/**
 * E2E Auth Helpers
 *
 * Provides utilities for authentication in E2E tests.
 *
 * @see /docs/adrs/005-testing-strategy.md
 */

import type { Page, APIRequestContext } from '@playwright/test';

/**
 * Default test user credentials
 */
export const TEST_USER = {
  email: 'e2e-test@example.com',
  password: 'testpassword123',
  name: 'E2E Test User',
};

/**
 * Register a new test user via the API
 */
export async function registerUser(
  request: APIRequestContext,
  options: {
    email?: string;
    password?: string;
    name?: string;
  } = {}
) {
  const input = {
    email: options.email ?? TEST_USER.email,
    password: options.password ?? TEST_USER.password,
    name: options.name ?? TEST_USER.name,
  };

  const response = await request.post('/api/trpc/auth.register', {
    data: {
      '0': {
        json: input,
      },
    },
  });

  return response;
}

/**
 * Login a user via the API
 */
export async function loginUser(
  request: APIRequestContext,
  options: {
    email?: string;
    password?: string;
  } = {}
) {
  const input = {
    email: options.email ?? TEST_USER.email,
    password: options.password ?? TEST_USER.password,
  };

  const response = await request.post('/api/trpc/auth.register', {
    data: {
      '0': {
        json: input,
      },
    },
  });

  return response;
}

/**
 * Login as a user via the UI
 */
export async function loginAsUser(
  page: Page,
  email: string = TEST_USER.email,
  password: string = TEST_USER.password
) {
  await page.goto('/login');

  // Fill in login form
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);

  // Submit form
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL('/');
}

/**
 * Register a new user via the UI
 */
export async function registerAsUser(
  page: Page,
  options: {
    email?: string;
    password?: string;
    name?: string;
  } = {}
) {
  const email = options.email ?? TEST_USER.email;
  const password = options.password ?? TEST_USER.password;
  const name = options.name ?? TEST_USER.name;

  await page.goto('/register');

  // Fill in registration form
  if (name) {
    await page.getByLabel(/name/i).fill(name);
  }
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByLabel(/confirm password/i).fill(password);

  // Submit form
  await page.getByRole('button', { name: /create account/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL('/');
}

/**
 * Logout the current user
 */
export async function logout(page: Page) {
  // Look for logout button/link and click it
  const logoutButton = page.getByRole('button', { name: /logout|sign out/i });

  if (await logoutButton.isVisible()) {
    await logoutButton.click();
  } else {
    // Fallback: navigate directly to a logout endpoint or clear cookies
    await page.context().clearCookies();
    await page.goto('/login');
  }
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  // Check for elements that indicate logged-in state
  const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
  const loginLink = page.getByRole('link', { name: /sign in|login/i });

  const isLoggedIn = await logoutButton.isVisible().catch(() => false);
  const isLoggedOut = await loginLink.isVisible().catch(() => false);

  return isLoggedIn && !isLoggedOut;
}

/**
 * Get current user info from the API
 */
export async function getCurrentUser(request: APIRequestContext) {
  const response = await request.get('/api/trpc/auth.me');

  if (!response.ok()) {
    return null;
  }

  const body = await response.json();
  return body.result?.data ?? null;
}
