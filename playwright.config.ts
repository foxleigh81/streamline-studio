import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * ADR-005 Requirements:
 * - Multi-browser testing (Chrome, Firefox, Safari)
 * - Mobile viewport testing
 * - Trace and screenshot on failure
 *
 * Performance Optimizations (Dec 2025):
 * - CI runs only Chromium to reduce test time from 90+ min to <15 min
 * - CI uses 2 workers for better parallelization
 * - CI retries reduced to 1 (from 2) to avoid excessive re-runs
 *
 * @see /docs/adrs/005-testing-strategy.md
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-results.json' }],
    ['list'],
  ],

  // Increased timeouts for CI environment
  timeout: 60000,
  expect: { timeout: 10000 },

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // CI: Run only Chromium for speed (5x faster)
  // Local: Run all browsers for comprehensive testing
  projects: process.env.CI
    ? [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
      ]
    : [
        // Desktop browsers
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
        {
          name: 'firefox',
          use: { ...devices['Desktop Firefox'] },
        },
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'] },
        },
        // Mobile viewports
        {
          name: 'mobile-chrome',
          use: { ...devices['Pixel 5'] },
        },
        {
          name: 'mobile-safari',
          use: { ...devices['iPhone 12'] },
        },
      ],

  // Local dev server (dev mode) / Production server (CI)
  webServer: {
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    // CRITICAL: Pass environment variables to the dev server
    // Without this, the server starts without DATABASE_URL and falls back to
    // libpq defaults (using system USER as database username, causing "role 'root' does not exist")
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? '',
      SESSION_SECRET: process.env.SESSION_SECRET ?? '',
      MODE: process.env.MODE ?? '',
    },
  },

  // Output directory for test artifacts
  outputDir: 'test-results/',
});
