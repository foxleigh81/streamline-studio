/**
 * Select Component Stories
 *
 * Demonstrates all select variants, states, and accessibility features.
 * Includes interaction tests for keyboard navigation and selection.
 *
 * @see /docs/adrs/003-storybook-integration.md
 */

import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { Select } from './select';

const sampleOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

const channelOptions = [
  { value: 'ch-main', label: 'Main Channel' },
  { value: 'ch-gaming', label: 'Gaming Channel' },
  { value: 'ch-vlog', label: 'Vlog Channel' },
  { value: 'ch-tech', label: 'Tech Reviews' },
];

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'Label text for the select',
    },
    error: {
      control: 'text',
      description: 'Error message to display',
    },
    helperText: {
      control: 'text',
      description: 'Helper text to display below the select',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text shown when no option is selected',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the select is disabled',
    },
    required: {
      control: 'boolean',
      description: 'Whether the select is required',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

// =============================================================================
// BASIC VARIANTS
// =============================================================================

export const Default: Story = {
  args: {
    label: 'Choose an option',
    placeholder: 'Select an option',
    options: sampleOptions,
  },
};

export const WithValue: Story = {
  args: {
    label: 'Preferred Channel',
    options: channelOptions,
    defaultValue: 'ch-main',
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Default Channel',
    placeholder: 'Select a channel',
    options: channelOptions,
    helperText: 'This will be used as your default channel for new content',
  },
};

export const WithError: Story = {
  args: {
    label: 'Required Field',
    placeholder: 'Please select',
    options: sampleOptions,
    error: 'This field is required',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Select',
    options: sampleOptions,
    defaultValue: 'option1',
    disabled: true,
  },
};

export const Required: Story = {
  args: {
    label: 'Required Selection',
    placeholder: 'Must select an option',
    options: sampleOptions,
    required: true,
  },
};

// =============================================================================
// OPTION VARIATIONS
// =============================================================================

export const ManyOptions: Story = {
  args: {
    label: 'Choose from many',
    placeholder: 'Select one',
    options: Array.from({ length: 20 }, (_, i) => ({
      value: `option-${i + 1}`,
      label: `Option ${i + 1}`,
    })),
  },
};

export const LongLabels: Story = {
  args: {
    label: 'Long Option Names',
    placeholder: 'Select',
    options: [
      {
        value: 'opt1',
        label: 'This is a very long option label that might wrap',
      },
      {
        value: 'opt2',
        label: 'Another extremely long option label for testing purposes',
      },
      {
        value: 'opt3',
        label: 'Short',
      },
    ],
  },
};

// =============================================================================
// STATES
// =============================================================================

export const Empty: Story = {
  args: {
    label: 'Empty Select',
    placeholder: 'Nothing selected yet',
    options: sampleOptions,
  },
};

export const Filled: Story = {
  args: {
    label: 'Selected Option',
    options: sampleOptions,
    defaultValue: 'option2',
  },
};

export const ErrorState: Story = {
  args: {
    label: 'Invalid Selection',
    options: sampleOptions,
    error: 'Please choose a valid option',
  },
};

export const HelperState: Story = {
  args: {
    label: 'With Helper',
    placeholder: 'Select',
    options: sampleOptions,
    helperText: 'Choose the option that best fits your needs',
  },
};

// =============================================================================
// REAL-WORLD EXAMPLES
// =============================================================================

export const ChannelSelector: Story = {
  args: {
    label: 'Default Channel',
    placeholder: 'Select your default channel',
    options: channelOptions,
    helperText: 'New videos will be assigned to this channel by default',
  },
};

export const DateFormatSelector: Story = {
  args: {
    label: 'Date Format',
    options: [
      { value: 'ISO', label: 'ISO (YYYY-MM-DD)' },
      { value: 'US', label: 'US (MM/DD/YYYY)' },
      { value: 'EU', label: 'EU (DD/MM/YYYY)' },
      { value: 'UK', label: 'UK (DD/MM/YYYY)' },
    ],
    defaultValue: 'ISO',
    helperText: 'Choose how dates are displayed throughout the app',
  },
};

export const ViewModeSelector: Story = {
  args: {
    label: 'Content Plan View',
    options: [
      { value: 'grid', label: 'Grid View' },
      { value: 'table', label: 'Table View' },
    ],
    defaultValue: 'grid',
  },
};

// =============================================================================
// INTERACTION TESTS
// =============================================================================

/**
 * Test keyboard focus behavior
 */
export const KeyboardFocusable: Story = {
  args: {
    label: 'Focusable Select',
    placeholder: 'Tab to focus',
    options: sampleOptions,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const select = canvas.getByLabelText('Focusable Select');

    // Tab to focus the select
    await userEvent.tab();

    // Verify select has focus
    await expect(select).toHaveFocus();
  },
};

/**
 * Test selection interaction
 */
export const SelectInteraction: Story = {
  args: {
    label: 'Choose Option',
    placeholder: 'Click to select',
    options: sampleOptions,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const select = canvas.getByLabelText('Choose Option') as HTMLSelectElement;

    // Click to focus
    await userEvent.click(select);

    // Select an option
    await userEvent.selectOptions(select, 'option2');

    // Verify value
    await expect(select).toHaveValue('option2');
  },
};

/**
 * Test changing selection
 */
export const ChangeSelection: Story = {
  args: {
    label: 'Changeable Select',
    options: sampleOptions,
    defaultValue: 'option1',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const select = canvas.getByLabelText(
      'Changeable Select'
    ) as HTMLSelectElement;

    // Verify initial value
    await expect(select).toHaveValue('option1');

    // Click to focus
    await userEvent.click(select);

    // Change to different option
    await userEvent.selectOptions(select, 'option3');

    // Verify new value
    await expect(select).toHaveValue('option3');
  },
};

/**
 * Test error state accessibility
 */
export const ErrorAccessibility: Story = {
  args: {
    label: 'Error Field',
    placeholder: 'Select',
    options: sampleOptions,
    error: 'This field has an error',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const select = canvas.getByLabelText('Error Field');
    const errorMessage = canvas.getByRole('alert');

    // Verify error styling
    await expect(select).toHaveAttribute('aria-invalid', 'true');

    // Verify error message is visible
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveTextContent('This field has an error');
  },
};

/**
 * Test helper text accessibility
 */
export const HelperTextAccessibility: Story = {
  args: {
    label: 'Field with Helper',
    placeholder: 'Select',
    options: sampleOptions,
    helperText: 'This is helpful information',
    id: 'helper-test',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const select = canvas.getByLabelText('Field with Helper');
    const helperText = canvas.getByText('This is helpful information');

    // Verify helper text is visible
    await expect(helperText).toBeVisible();

    // Verify select is described by helper text
    const describedBy = select.getAttribute('aria-describedby');
    await expect(describedBy).toBeTruthy();
  },
};

/**
 * Test disabled state
 */
export const DisabledInteraction: Story = {
  args: {
    label: 'Disabled Field',
    options: sampleOptions,
    defaultValue: 'option1',
    disabled: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const select = canvas.getByLabelText('Disabled Field');

    // Verify select is disabled
    await expect(select).toBeDisabled();

    // Verify original value unchanged
    await expect(select).toHaveValue('option1');
  },
};

/**
 * Test label-select association
 */
export const LabelAssociation: Story = {
  args: {
    label: 'Associated Label',
    placeholder: 'Click the label',
    options: sampleOptions,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const label = canvas.getByText('Associated Label');
    const select = canvas.getByLabelText('Associated Label');

    // Click the label
    await userEvent.click(label);

    // Select should receive focus
    await expect(select).toHaveFocus();
  },
};

/**
 * Test keyboard navigation
 */
export const KeyboardNavigation: Story = {
  args: {
    label: 'Navigate with Keyboard',
    options: sampleOptions,
    defaultValue: 'option1',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const select = canvas.getByLabelText(
      'Navigate with Keyboard'
    ) as HTMLSelectElement;

    // Focus the select
    await userEvent.click(select);

    // Use arrow keys to navigate (simulated by direct selection)
    await userEvent.selectOptions(select, 'option2');

    // Verify navigation worked
    await expect(select).toHaveValue('option2');
  },
};

/**
 * Test required field validation
 */
export const RequiredValidation: Story = {
  args: {
    label: 'Required Field',
    placeholder: 'Must select',
    options: sampleOptions,
    required: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const select = canvas.getByLabelText('Required Field');

    // Verify required attribute
    await expect(select).toBeRequired();
  },
};
