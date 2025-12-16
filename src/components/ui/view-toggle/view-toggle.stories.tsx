import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { useState } from 'react';
import { ViewToggle, type ViewMode } from './view-toggle';

/**
 * ViewToggle Component Stories
 *
 * Demonstrates the view toggle component in all states and sizes.
 * Includes interaction tests for keyboard navigation and click handling.
 */
const meta: Meta<typeof ViewToggle> = {
  title: 'UI/ViewToggle',
  component: ViewToggle,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    value: {
      control: 'select',
      options: ['grid', 'table'],
      description: 'Current view mode',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the toggle',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ViewToggle>;

// =============================================================================
// INTERACTIVE WRAPPER FOR STATEFUL STORIES
// =============================================================================

/**
 * Wrapper component that manages state for interactive stories
 */
function InteractiveViewToggle({
  initialValue = 'grid',
  size = 'md',
}: {
  initialValue?: ViewMode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [value, setValue] = useState<ViewMode>(initialValue);
  return <ViewToggle value={value} onChange={setValue} size={size} />;
}

// =============================================================================
// VIEW MODE STORIES
// =============================================================================

export const GridView: Story = {
  args: {
    value: 'grid',
    onChange: () => {},
  },
};

export const TableView: Story = {
  args: {
    value: 'table',
    onChange: () => {},
  },
};

// =============================================================================
// SIZE STORIES
// =============================================================================

export const Small: Story = {
  args: {
    value: 'grid',
    size: 'sm',
    onChange: () => {},
  },
};

export const Medium: Story = {
  args: {
    value: 'grid',
    size: 'md',
    onChange: () => {},
  },
};

export const Large: Story = {
  args: {
    value: 'grid',
    size: 'lg',
    onChange: () => {},
  },
};

// =============================================================================
// INTERACTIVE STORIES
// =============================================================================

export const Interactive: Story = {
  render: () => <InteractiveViewToggle />,
  parameters: {
    docs: {
      description: {
        story:
          'Click the buttons to toggle between grid and table views. The component maintains its own state in this demo.',
      },
    },
  },
};

// =============================================================================
// INTERACTION TESTS
// =============================================================================

/**
 * Test clicking to toggle view modes
 */
export const ClickInteraction: Story = {
  render: () => <InteractiveViewToggle initialValue="grid" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Get both buttons
    const gridButton = canvas.getByLabelText('Grid view');
    const tableButton = canvas.getByLabelText('Table view');

    // Grid should start as active (pressed)
    await expect(gridButton).toHaveAttribute('aria-pressed', 'true');
    await expect(tableButton).toHaveAttribute('aria-pressed', 'false');

    // Click table button
    await userEvent.click(tableButton);

    // Table should now be active
    await expect(tableButton).toHaveAttribute('aria-pressed', 'true');
    await expect(gridButton).toHaveAttribute('aria-pressed', 'false');

    // Click grid button
    await userEvent.click(gridButton);

    // Grid should be active again
    await expect(gridButton).toHaveAttribute('aria-pressed', 'true');
    await expect(tableButton).toHaveAttribute('aria-pressed', 'false');
  },
};

/**
 * Test keyboard navigation with arrow keys
 */
export const KeyboardNavigation: Story = {
  render: () => <InteractiveViewToggle initialValue="grid" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const gridButton = canvas.getByLabelText('Grid view');
    const tableButton = canvas.getByLabelText('Table view');

    // Focus on grid button
    gridButton.focus();

    // Grid starts as active
    await expect(gridButton).toHaveAttribute('aria-pressed', 'true');

    // Press right arrow
    await userEvent.keyboard('{ArrowRight}');

    // Table should now be active
    await expect(tableButton).toHaveAttribute('aria-pressed', 'true');
    await expect(gridButton).toHaveAttribute('aria-pressed', 'false');

    // Press left arrow
    await userEvent.keyboard('{ArrowLeft}');

    // Grid should be active again
    await expect(gridButton).toHaveAttribute('aria-pressed', 'true');
    await expect(tableButton).toHaveAttribute('aria-pressed', 'false');
  },
};

/**
 * Test keyboard focus with Tab key
 */
export const KeyboardFocusable: Story = {
  render: () => <InteractiveViewToggle />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const gridButton = canvas.getByLabelText('Grid view');
    const tableButton = canvas.getByLabelText('Table view');

    // Tab to first button
    await userEvent.tab();
    await expect(gridButton).toHaveFocus();

    // Tab to second button
    await userEvent.tab();
    await expect(tableButton).toHaveFocus();
  },
};

/**
 * Test accessibility attributes
 */
export const AccessibilityAttributes: Story = {
  args: {
    value: 'grid',
    onChange: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Check for proper ARIA attributes
    const group = canvas.getByRole('group', { name: 'View mode' });
    await expect(group).toBeInTheDocument();

    const gridButton = canvas.getByLabelText('Grid view');
    const tableButton = canvas.getByLabelText('Table view');

    // Both buttons should be present
    await expect(gridButton).toBeInTheDocument();
    await expect(tableButton).toBeInTheDocument();

    // Active button should have aria-pressed="true"
    await expect(gridButton).toHaveAttribute('aria-pressed', 'true');
    await expect(tableButton).toHaveAttribute('aria-pressed', 'false');
  },
};
