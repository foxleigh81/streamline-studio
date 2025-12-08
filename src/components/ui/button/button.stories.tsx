import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { Button } from './button';

/**
 * Button Component Stories
 *
 * Demonstrates all button variants, sizes, and states.
 * Includes interaction tests for accessibility verification.
 *
 * @see /docs/adrs/003-storybook-integration.md
 */
const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'destructive', 'outline', 'ghost'],
      description: 'Visual style of the button',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the button',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Whether button takes full width',
    },
    isLoading: {
      control: 'boolean',
      description: 'Whether button is in loading state',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether button is disabled',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// =============================================================================
// VARIANT STORIES
// =============================================================================

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline Button',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost Button',
  },
};

// =============================================================================
// SIZE STORIES
// =============================================================================

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small',
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
    children: 'Medium',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large',
  },
};

// =============================================================================
// STATE STORIES
// =============================================================================

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
    children: 'Loading...',
  },
};

export const FullWidth: Story = {
  args: {
    fullWidth: true,
    children: 'Full Width Button',
  },
  parameters: {
    layout: 'padded',
  },
};

// =============================================================================
// INTERACTION TESTS
// =============================================================================

/**
 * Test that button can be focused with keyboard
 */
export const KeyboardFocusable: Story = {
  args: {
    children: 'Focusable Button',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');

    // Tab to focus the button
    await userEvent.tab();

    // Verify button has focus
    await expect(button).toHaveFocus();
  },
};

/**
 * Test click interaction
 */
export const ClickInteraction: Story = {
  args: {
    children: 'Click Me',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');

    // Click the button
    await userEvent.click(button);

    // Button should still be visible and not disabled
    await expect(button).toBeEnabled();
  },
};

/**
 * Test disabled button cannot be clicked
 */
export const DisabledInteraction: Story = {
  args: {
    disabled: true,
    children: 'Cannot Click',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');

    // Verify button is disabled
    await expect(button).toBeDisabled();
  },
};
