import type { StorybookConfig } from '@storybook/react-vite';
import path from 'path';

/**
 * Storybook Configuration
 *
 * ADR-003 Requirements:
 * - @storybook/react-vite framework for Vite-based builds
 * - Addon-a11y for accessibility testing
 * - Addon-interactions for component testing
 *
 * Note: Using react-vite instead of nextjs framework due to
 * Next.js 15.5 compatibility issues. This works because our
 * UI components don't use Next.js-specific features.
 *
 * @see /docs/adrs/003-storybook-integration.md
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],

  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
  ],

  framework: {
    name: '@storybook/react-vite',
    options: {},
  },

  core: {
    disableTelemetry: true,
  },

  docs: {
    autodocs: 'tag',
  },

  staticDirs: ['../public'],

  // TypeScript configuration
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
  },

  // Vite configuration for path aliases, SCSS, and Next.js mocks
  viteFinal: async (config) => {
    config.resolve = config.resolve ?? {};

    // Mock next/link with a simple <a> tag for Storybook
    // This is needed because we use @storybook/react-vite instead of @storybook/nextjs
    // Place next mocks first to ensure they take priority
    const nextLinkMockPath = path.resolve(__dirname, './mocks/next-link.tsx');
    const nextNavigationMockPath = path.resolve(
      __dirname,
      './mocks/next-navigation.tsx'
    );

    config.resolve.alias = {
      'next/link': nextLinkMockPath,
      'next/navigation': nextNavigationMockPath,
      ...config.resolve.alias,
      '@': path.resolve(__dirname, '../src'),
    };

    return config;
  },
};

export default config;
