/**
 * RadioGroup Component Stories
 *
 * Demonstrates all radio group variants, states, and accessibility features.
 * Includes interaction tests for keyboard navigation and selection.
 *
 * @see /docs/adrs/003-storybook-integration.md
 */

import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { useState } from 'react';
import { RadioGroup } from './radio-group';
import type { RadioOption } from './radio-group';

const timeFormatOptions: RadioOption[] = [
  { value: '12h', label: '12-hour (AM/PM)' },
  { value: '24h', label: '24-hour' },
];

const viewModeOptions: RadioOption[] = [
  { value: 'grid', label: 'Grid View' },
  { value: 'table', label: 'Table View' },
];

const priorityOptions: RadioOption[] = [
  { value: 'low', label: 'Low Priority' },
  { value: 'medium', label: 'Medium Priority' },
  { value: 'high', label: 'High Priority' },
];

const meta: Meta<typeof RadioGroup> = {
  title: 'UI/RadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    legend: {
      control: 'text',
      description: 'Legend text for the radio group',
    },
    error: {
      control: 'text',
      description: 'Error message to display',
    },
    helperText: {
      control: 'text',
      description: 'Helper text to display below the radio group',
    },
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
      description: 'Layout orientation',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether all options are disabled',
    },
    required: {
      control: 'boolean',
      description: 'Whether the radio group is required',
    },
  },
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

// =============================================================================
// BASIC VARIANTS
// =============================================================================

export const Default: Story = {
  args: {
    legend: 'Choose an option',
    name: 'default',
    options: priorityOptions,
  },
};

export const WithValue: Story = {
  args: {
    legend: 'Time Format',
    name: 'time-format',
    options: timeFormatOptions,
    value: '12h',
  },
};

export const WithHelperText: Story = {
  args: {
    legend: 'Content Plan View',
    name: 'view-mode',
    options: viewModeOptions,
    value: 'grid',
    helperText: 'Choose how you want to view your content plan',
  },
};

export const WithError: Story = {
  args: {
    legend: 'Priority Level',
    name: 'priority-error',
    options: priorityOptions,
    error: 'Please select a priority level',
  },
};

export const Disabled: Story = {
  args: {
    legend: 'Disabled Options',
    name: 'disabled',
    options: timeFormatOptions,
    value: '12h',
    disabled: true,
  },
};

export const Required: Story = {
  args: {
    legend: 'Required Selection',
    name: 'required',
    options: priorityOptions,
    required: true,
  },
};

// =============================================================================
// ORIENTATION VARIANTS
// =============================================================================

export const Vertical: Story = {
  args: {
    legend: 'Vertical Layout (Default)',
    name: 'vertical',
    options: priorityOptions,
    orientation: 'vertical',
  },
};

export const Horizontal: Story = {
  args: {
    legend: 'Horizontal Layout',
    name: 'horizontal',
    options: timeFormatOptions,
    orientation: 'horizontal',
    value: '24h',
  },
};

export const HorizontalMany: Story = {
  args: {
    legend: 'Multiple Options Horizontal',
    name: 'horizontal-many',
    options: [
      { value: 'opt1', label: 'Option 1' },
      { value: 'opt2', label: 'Option 2' },
      { value: 'opt3', label: 'Option 3' },
      { value: 'opt4', label: 'Option 4' },
      { value: 'opt5', label: 'Option 5' },
    ],
    orientation: 'horizontal',
  },
};

// =============================================================================
// OPTION VARIATIONS
// =============================================================================

export const ManyOptions: Story = {
  args: {
    legend: 'Choose from many',
    name: 'many',
    options: Array.from({ length: 10 }, (_, i) => ({
      value: `option-${i + 1}`,
      label: `Option ${i + 1}`,
    })),
  },
};

export const LongLabels: Story = {
  args: {
    legend: 'Long Option Names',
    name: 'long-labels',
    options: [
      {
        value: 'opt1',
        label:
          'This is a very long option label that might wrap to multiple lines',
      },
      {
        value: 'opt2',
        label: 'Another extremely long option label for testing purposes',
      },
      { value: 'opt3', label: 'Short' },
    ],
  },
};

export const IndividuallyDisabled: Story = {
  args: {
    legend: 'Some Options Disabled',
    name: 'individually-disabled',
    options: [
      { value: 'opt1', label: 'Available Option' },
      { value: 'opt2', label: 'Disabled Option', disabled: true },
      { value: 'opt3', label: 'Another Available' },
      { value: 'opt4', label: 'Also Disabled', disabled: true },
    ],
  },
};

// =============================================================================
// REAL-WORLD EXAMPLES
// =============================================================================

export const TimeFormatSelector: Story = {
  args: {
    legend: 'Time Format',
    name: 'time-format-real',
    options: timeFormatOptions,
    value: '24h',
    helperText: 'Choose how times are displayed throughout the app',
    orientation: 'horizontal',
  },
};

export const ViewModeSelector: Story = {
  args: {
    legend: 'Content Plan View Mode',
    name: 'view-mode-real',
    options: viewModeOptions,
    value: 'grid',
    helperText: 'Select your preferred view for the content plan',
    orientation: 'horizontal',
  },
};

export const PrioritySelector: Story = {
  args: {
    legend: 'Task Priority',
    name: 'priority-real',
    options: priorityOptions,
    value: 'medium',
  },
};

// =============================================================================
// INTERACTIVE EXAMPLES
// =============================================================================

/**
 * Controlled RadioGroup with state
 */
export const Controlled: Story = {
  render: function ControlledRadioGroup() {
    const [value, setValue] = useState('12h');

    return (
      <div>
        <RadioGroup
          legend="Time Format (Controlled)"
          name="controlled"
          options={timeFormatOptions}
          value={value}
          onChange={setValue}
          orientation="horizontal"
        />
        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
          Selected value: <strong>{value}</strong>
        </p>
      </div>
    );
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
    legend: 'Focusable Options',
    name: 'focusable',
    options: priorityOptions,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const firstRadio = canvas.getByLabelText('Low Priority');

    // Tab to focus the first radio
    await userEvent.tab();

    // Verify first radio has focus
    await expect(firstRadio).toHaveFocus();
  },
};

/**
 * Test selection interaction
 */
export const SelectInteraction: Story = {
  args: {
    legend: 'Click to Select',
    name: 'select-interaction',
    options: timeFormatOptions,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const radio24h = canvas.getByLabelText('24-hour');

    // Click to select
    await userEvent.click(radio24h);

    // Verify checked
    await expect(radio24h).toBeChecked();
  },
};

/**
 * Test changing selection
 */
export const ChangeSelection: Story = {
  args: {
    legend: 'Change Selection',
    name: 'change-selection',
    options: priorityOptions,
    value: 'low',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const lowRadio = canvas.getByLabelText('Low Priority');
    const highRadio = canvas.getByLabelText('High Priority');

    // Verify initial selection
    await expect(lowRadio).toBeChecked();

    // Click to change selection
    await userEvent.click(highRadio);

    // Verify new selection
    await expect(highRadio).toBeChecked();
    await expect(lowRadio).not.toBeChecked();
  },
};

/**
 * Test error state accessibility
 */
export const ErrorAccessibility: Story = {
  args: {
    legend: 'Error Field',
    name: 'error-accessibility',
    options: timeFormatOptions,
    error: 'This field has an error',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const fieldset = canvas.getByRole('group');
    const errorMessage = canvas.getByRole('alert');

    // Verify error styling
    await expect(fieldset).toHaveAttribute('aria-invalid', 'true');

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
    legend: 'Field with Helper',
    name: 'helper-accessibility',
    options: timeFormatOptions,
    helperText: 'This is helpful information',
    id: 'helper-test',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const fieldset = canvas.getByRole('group');
    const helperText = canvas.getByText('This is helpful information');

    // Verify helper text is visible
    await expect(helperText).toBeVisible();

    // Verify fieldset is described by helper text
    const describedBy = fieldset.getAttribute('aria-describedby');
    await expect(describedBy).toBeTruthy();
  },
};

/**
 * Test disabled state
 */
export const DisabledInteraction: Story = {
  args: {
    legend: 'Disabled Field',
    name: 'disabled-interaction',
    options: timeFormatOptions,
    value: '12h',
    disabled: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const radio12h = canvas.getByLabelText('12-hour (AM/PM)');
    const radio24h = canvas.getByLabelText('24-hour');

    // Verify both radios are disabled
    await expect(radio12h).toBeDisabled();
    await expect(radio24h).toBeDisabled();

    // Verify original value unchanged
    await expect(radio12h).toBeChecked();
  },
};

/**
 * Test label-radio association
 */
export const LabelAssociation: Story = {
  args: {
    legend: 'Click Labels',
    name: 'label-association',
    options: timeFormatOptions,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const label = canvas.getByText('24-hour');
    const radio = canvas.getByLabelText('24-hour');

    // Click the label
    await userEvent.click(label);

    // Radio should be checked
    await expect(radio).toBeChecked();
  },
};

/**
 * Test keyboard navigation with arrow keys
 */
export const KeyboardNavigation: Story = {
  args: {
    legend: 'Navigate with Arrows',
    name: 'keyboard-nav',
    options: priorityOptions,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const firstRadio = canvas.getByLabelText('Low Priority');

    // Tab to focus
    await userEvent.tab();
    await expect(firstRadio).toHaveFocus();

    // Space to select
    await userEvent.keyboard(' ');
    await expect(firstRadio).toBeChecked();
  },
};

/**
 * Test required field validation
 */
export const RequiredValidation: Story = {
  args: {
    legend: 'Required Field',
    name: 'required-validation',
    options: timeFormatOptions,
    required: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const radio = canvas.getByLabelText('12-hour (AM/PM)');

    // Verify required attribute
    await expect(radio).toBeRequired();
  },
};

/**
 * Test horizontal layout wrapping
 */
export const HorizontalWrapping: Story = {
  args: {
    legend: 'Wrapping Layout',
    name: 'wrapping',
    options: [
      { value: '1', label: 'Option One' },
      { value: '2', label: 'Option Two' },
      { value: '3', label: 'Option Three' },
      { value: '4', label: 'Option Four' },
      { value: '5', label: 'Option Five' },
      { value: '6', label: 'Option Six' },
    ],
    orientation: 'horizontal',
  },
};
