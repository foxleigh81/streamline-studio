import type { TestRunnerConfig } from '@storybook/test-runner';

/**
 * Storybook Test Runner Configuration
 *
 * Configures the test runner to properly handle React imports and
 * set up the test environment for stories.
 *
 * Note: React is made available globally in preview.tsx, so no
 * preVisit hook is needed here.
 *
 * @see https://storybook.js.org/docs/react/writing-tests/test-runner
 * @see /docs/adrs/003-storybook-integration.md
 */
const config: TestRunnerConfig = {
  /**
   * Tags to include/exclude from testing.
   * We run tests for all stories by default.
   */
  tags: {
    include: [],
    exclude: ['skip-test'],
  },
};

export default config;
