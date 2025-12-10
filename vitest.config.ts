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
        // Incremental approach to reaching target:
        // - Phase 8 (Current): 60% - Baseline established during remediation
        // - Future: 70% - Add tests for new features and critical paths
        // - Future: 80% - Meet ADR-005 target with comprehensive coverage
        //
        // Priority areas for additional coverage:
        // - WorkspaceRepository integration tests (when DB available)
        // - tRPC routers (auth, video, category)
        // - Complex UI components (DocumentEditor, VideoFormModal)
        // - Accessibility utilities (focus-trap, aria)
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
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
