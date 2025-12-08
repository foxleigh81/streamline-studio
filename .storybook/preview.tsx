import type { Preview } from '@storybook/react';
import React from 'react';

// Import theme CSS
import '../src/themes/default/index.css';

/**
 * Storybook Preview Configuration
 *
 * Global decorators and parameters for all stories.
 *
 * @see /docs/adrs/003-storybook-integration.md
 */
const preview: Preview = {
  parameters: {
    // Actions configuration
    actions: { argTypesRegex: '^on[A-Z].*' },

    // Controls configuration
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    // Accessibility configuration (ADR-003)
    a11y: {
      config: {
        rules: [
          {
            // Ensure color contrast meets WCAG 2.1 AA
            id: 'color-contrast',
            enabled: true,
          },
        ],
      },
    },

    // Backgrounds for light/dark mode testing
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: 'hsl(0 0% 100%)',
        },
        {
          name: 'dark',
          value: 'hsl(222 84% 4.9%)',
        },
      ],
    },

    // Layout options
    layout: 'centered',
  },

  // Global decorators
  decorators: [
    (Story) => (
      <div
        style={{
          fontFamily: 'var(--font-sans)',
        }}
      >
        <Story />
      </div>
    ),
  ],

  // Tags for autodocs
  tags: ['autodocs'],
};

export default preview;
