/**
 * E2E Test Fixtures
 *
 * Provides fixtures and test data for E2E tests.
 *
 * @see /docs/adrs/005-testing-strategy.md
 */

/* eslint-disable react-hooks/rules-of-hooks -- Playwright fixtures use a 'use' function that triggers false positives */

import {
  test as base,
  type Page,
  type APIRequestContext,
} from '@playwright/test';
import { TEST_USER, registerAsUser } from './auth';

/**
 * Extended test fixtures
 */
export const test = base.extend<{
  /** Page with an authenticated user */
  authenticatedPage: Page;
  /** API request context with authentication */
  authenticatedRequest: APIRequestContext;
}>({
  /**
   * Fixture that provides a page with an authenticated user
   *
   * Usage:
   * ```typescript
   * test('authenticated test', async ({ authenticatedPage }) => {
   *   await authenticatedPage.goto('/dashboard');
   *   // User is already logged in
   * });
   * ```
   */

  authenticatedPage: async ({ page }, use) => {
    // Create a unique email for this test to avoid conflicts
    // Using timestamp + random suffix to prevent collisions in parallel tests
    const uniqueEmail = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

    // Register and login (registerAsUser already waits for redirect)
    await registerAsUser(page, {
      email: uniqueEmail,
      password: TEST_USER.password,
      name: TEST_USER.name,
    });

    // Provide the authenticated page to the test
    await use(page);
  },

  /**
   * Fixture that provides an authenticated API request context
   */

  authenticatedRequest: async ({ page, request }, use) => {
    // Create a unique email for this test
    // Using timestamp + random suffix to prevent collisions in parallel tests
    const uniqueEmail = `e2e-api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

    // Register user via UI to get cookies set
    await registerAsUser(page, {
      email: uniqueEmail,
      password: TEST_USER.password,
      name: TEST_USER.name,
    });

    // The cookies are now set in the context
    // Provide the request context to the test
    await use(request);
  },
});

export { expect } from '@playwright/test';

/**
 * Test data generators
 */
export const testData = {
  /**
   * Generate a unique email address
   */
  uniqueEmail: () =>
    `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,

  /**
   * Generate a unique channel name
   */
  uniqueChannelName: () =>
    `Test Channel ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,

  /**
   * Generate a random video title
   */
  videoTitle: () => `Test Video ${Date.now()}`,

  /**
   * Generate a random category name
   */
  categoryName: () => `Category ${Date.now()}`,

  /**
   * Sample video data
   */
  sampleVideo: () => ({
    title: `Sample Video ${Date.now()}`,
    description: 'This is a sample video for testing purposes.',
    status: 'idea' as const,
  }),

  /**
   * Sample category data
   */
  sampleCategory: () => ({
    name: `Sample Category ${Date.now()}`,
    color: '#3498DB',
  }),

  /**
   * Sample document content
   */
  sampleScript: () =>
    `
# Video Script

## Introduction
Welcome to this test video.

## Main Content
Here is the main content of the script.

## Conclusion
Thank you for watching!
  `.trim(),
};

/**
 * Wait utilities
 */
export const wait = {
  /**
   * Wait for a specific duration
   */
  ms: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),

  /**
   * Wait for network to be idle
   */
  forNetworkIdle: async (page: Page) => {
    await page.waitForLoadState('networkidle');
  },

  /**
   * Wait for a toast notification to appear
   */
  forToast: async (page: Page, text: string | RegExp) => {
    await page.getByRole('alert').filter({ hasText: text }).waitFor();
  },

  /**
   * Wait for a dialog to appear
   */
  forDialog: async (page: Page) => {
    await page.getByRole('dialog').waitFor();
  },
};

/**
 * Common page interactions
 */
export const interactions = {
  /**
   * Fill a form field by label
   */
  fillField: async (page: Page, label: string | RegExp, value: string) => {
    await page.getByLabel(label).fill(value);
  },

  /**
   * Click a button by name
   */
  clickButton: async (page: Page, name: string | RegExp) => {
    await page.getByRole('button', { name }).click();
  },

  /**
   * Select an option from a dropdown
   */
  selectOption: async (page: Page, label: string | RegExp, value: string) => {
    await page.getByLabel(label).selectOption(value);
  },

  /**
   * Check a checkbox
   */
  checkBox: async (page: Page, label: string | RegExp) => {
    await page.getByLabel(label).check();
  },

  /**
   * Uncheck a checkbox
   */
  uncheckBox: async (page: Page, label: string | RegExp) => {
    await page.getByLabel(label).uncheck();
  },
};
