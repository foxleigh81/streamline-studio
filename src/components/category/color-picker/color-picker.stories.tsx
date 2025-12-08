import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { useState } from 'react';
import { ColorPicker, PRESET_COLORS } from './color-picker';

/**
 * Color Picker Component Stories
 *
 * Demonstrates the color picker with preset colors.
 * Includes interaction tests for keyboard navigation and selection.
 */
const meta: Meta<typeof ColorPicker> = {
  title: 'Category/ColorPicker',
  component: ColorPicker,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    value: {
      control: 'color',
      description: 'Currently selected color (hex code)',
    },
    label: {
      control: 'text',
      description: 'Label for accessibility',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ColorPicker>;

// =============================================================================
// WRAPPER COMPONENT FOR INTERACTIVE STORIES
// =============================================================================

/**
 * Wrapper component to handle state in Storybook
 */
function ColorPickerWrapper({ initialValue }: { initialValue: string }) {
  const [color, setColor] = useState(initialValue);

  return (
    <div>
      <ColorPicker value={color} onChange={setColor} />
      <div style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
        <strong>Selected:</strong> {color}
        <div
          style={{
            width: '4rem',
            height: '2rem',
            backgroundColor: color,
            border: '1px solid #ccc',
            borderRadius: '0.25rem',
            marginTop: '0.5rem',
          }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// BASIC STORIES
// =============================================================================

export const Default: Story = {
  render: () => <ColorPickerWrapper initialValue={PRESET_COLORS[0]} />,
};

export const WithCustomLabel: Story = {
  render: () => (
    <ColorPicker
      value={PRESET_COLORS[3]}
      onChange={() => {}}
      label="Choose category color"
    />
  ),
};

export const AllColors: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {PRESET_COLORS.map((color) => (
        <div key={color}>
          <ColorPicker value={color} onChange={() => {}} label={color} />
        </div>
      ))}
    </div>
  ),
};

// =============================================================================
// INTERACTION TESTS
// =============================================================================

/**
 * Test clicking to select a color
 */
export const ClickToSelect: Story = {
  render: () => <ColorPickerWrapper initialValue={PRESET_COLORS[0]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Get all color buttons
    const colorButtons = canvas.getAllByRole('radio');

    // Initial selection should be first color
    expect(colorButtons[0]).toHaveAttribute('aria-checked', 'true');

    // Click on a different color (index 5)
    await userEvent.click(colorButtons[5]);

    // Wait for state update
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify new selection
    expect(colorButtons[5]).toHaveAttribute('aria-checked', 'true');
  },
};

/**
 * Test keyboard navigation with arrow keys
 */
export const KeyboardNavigation: Story = {
  render: () => <ColorPickerWrapper initialValue={PRESET_COLORS[0]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Get all color buttons
    const colorButtons = canvas.getAllByRole('radio');

    // Focus first button
    colorButtons[0].focus();
    expect(colorButtons[0]).toHaveFocus();

    // Navigate right with arrow key
    await userEvent.keyboard('{ArrowRight}');
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(colorButtons[1]).toHaveFocus();

    // Navigate down (should move by 6 positions in grid)
    await userEvent.keyboard('{ArrowDown}');
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(colorButtons[7]).toHaveFocus();
  },
};

/**
 * Test that selected color has proper aria attributes
 */
export const AccessibilityAttributes: Story = {
  render: () => <ColorPickerWrapper initialValue={PRESET_COLORS[3]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Get the radiogroup
    const radiogroup = canvas.getByRole('radiogroup');
    expect(radiogroup).toHaveAttribute('aria-labelledby', 'color-picker-label');

    // Get all radio buttons
    const colorButtons = canvas.getAllByRole('radio');

    // Check that selected button has correct aria-checked
    expect(colorButtons[3]).toHaveAttribute('aria-checked', 'true');

    // Check that other buttons have aria-checked=false
    expect(colorButtons[0]).toHaveAttribute('aria-checked', 'false');
    expect(colorButtons[1]).toHaveAttribute('aria-checked', 'false');

    // Check that each button has an aria-label
    colorButtons.forEach((button) => {
      expect(button).toHaveAttribute('aria-label');
    });
  },
};

/**
 * Test focus management - only selected item is in tab order
 */
export const FocusManagement: Story = {
  render: () => <ColorPickerWrapper initialValue={PRESET_COLORS[0]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Get all color buttons
    const colorButtons = canvas.getAllByRole('radio');

    // Only the selected button should have tabIndex 0
    expect(colorButtons[0]).toHaveAttribute('tabindex', '0');

    // All others should have tabIndex -1
    for (let i = 1; i < colorButtons.length; i++) {
      expect(colorButtons[i]).toHaveAttribute('tabindex', '-1');
    }
  },
};
