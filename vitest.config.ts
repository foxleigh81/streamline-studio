import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vitest Configuration
 *
 * ADR-005 Requirements:
 * - JSdom environment for React components
 * - Coverage reporting with v8
 * - TypeScript path aliases support
 *
 * @see /docs/adrs/005-testing-strategy.md
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'e2e', '.next', 'storybook-static'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'src/test',
        '**/*.stories.tsx',
        '**/*.d.ts',
        '.next',
        'storybook-static',
        '**/*.config.{ts,js,mjs}',
      ],
      thresholds: {
        // ADR-005: 80% unit test coverage target
        // Start with lower threshold, increase as codebase grows
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,
      },
    },
    // Test isolation
    isolate: true,
    // Timeout for async operations
    testTimeout: 10000,
    // Pool for parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
});
