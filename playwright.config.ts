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
 * CI Parity (Dec 2025):
 * - Global setup validates environment before tests
 * - Use `npm run test:e2e:ci-mode` to replicate CI locally
 * - See .env.ci.example for exact CI environment variables
 *
 * @see /docs/adrs/005-testing-strategy.md
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,

  // Global setup validates environment before running tests
  globalSetup: './e2e/global-setup.ts',
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-results.json' }],
    ['list'],
  ],

  // Increased timeouts for CI environment
  timeout: 120000, // global test timeout (120s)
  expect: { timeout: 10000 }, // per-expect timeout

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000, // action timeout (30s)
    navigationTimeout: 60000, // navigation timeout (60s)
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
  // In CI, source the .env file before starting the standalone server
  webServer: {
    command: process.env.CI
      ? 'bash -c "set -a && source .next/standalone/.env && set +a && node .next/standalone/server.js"'
      : 'npm run dev',
    url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    // Let Playwright manage the server in CI for proper env var inheritance
    // Locally, reuse existing server unless explicitly disabled via PLAYWRIGHT_NO_REUSE
    reuseExistingServer: !process.env.CI && !process.env.PLAYWRIGHT_NO_REUSE,
    timeout: 120000,
    // CRITICAL: Pass environment variables to the server
    // DO NOT pass empty strings - Zod treats '' differently from undefined
    // Only pass defined values so Zod defaults can apply
    env: {
      ...(process.env.DATABASE_URL && {
        DATABASE_URL: process.env.DATABASE_URL,
      }),
      ...(process.env.SESSION_SECRET && {
        SESSION_SECRET: process.env.SESSION_SECRET,
      }),
      ...(process.env.MODE && { MODE: process.env.MODE }),
      ...(process.env.DATA_DIR && { DATA_DIR: process.env.DATA_DIR }),
      ...(process.env.NODE_ENV && { NODE_ENV: process.env.NODE_ENV }),
      ...(process.env.PORT && { PORT: process.env.PORT }),
      // Enable E2E test mode to increase rate limits
      E2E_TEST_MODE: 'true',
    },
  },

  // Output directory for test artifacts
  outputDir: 'test-results/',
});
