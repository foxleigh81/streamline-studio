import { test, expect } from '@playwright/test';

/**
 * Basic Application E2E Tests
 *
 * Smoke tests to verify the application loads correctly.
 *
 * @see /docs/adrs/005-testing-strategy.md
 */

test.describe('Application', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify page title
    await expect(page).toHaveTitle('Streamline Studio');

    // Verify main heading is visible
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Streamline Studio'
    );
  });

  test('health endpoint returns ok', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('tRPC health endpoint works', async ({ request }) => {
    const response = await request.get('/api/trpc/health');

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.result?.data?.status).toBe('ok');
  });

  test('tRPC hello endpoint works with input', async ({ request }) => {
    // URL encode the input parameter
    const input = encodeURIComponent(JSON.stringify({ name: 'Playwright' }));
    const response = await request.get(`/api/trpc/hello?input=${input}`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.result?.data?.greeting).toBe('Hello, Playwright!');
  });
});
