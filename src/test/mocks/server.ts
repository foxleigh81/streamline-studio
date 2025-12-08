/**
 * MSW Server Setup
 *
 * Configures the Mock Service Worker server for Node.js tests.
 * Used by Vitest to intercept and mock network requests.
 *
 * @see /docs/adrs/005-testing-strategy.md
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW server instance
 *
 * This server intercepts all network requests during tests
 * and returns mock responses defined in handlers.
 */
export const server = setupServer(...handlers);

/**
 * Setup functions for test lifecycle
 */
export const mswSetup = {
  /**
   * Start the MSW server before all tests
   */
  beforeAll: () => {
    server.listen({
      onUnhandledRequest: 'warn',
    });
  },

  /**
   * Reset handlers after each test to ensure test isolation
   */
  afterEach: () => {
    server.resetHandlers();
  },

  /**
   * Close the server after all tests
   */
  afterAll: () => {
    server.close();
  },
};
