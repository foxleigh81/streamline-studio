/**
 * Input Component Stories
 *
 * Demonstrates all input variants, states, and accessibility features.
 * Includes interaction tests for form validation and user input.
 *
 * @see /docs/adrs/003-storybook-integration.md
 */

import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { Input } from './input';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'Label text for the input',
    },
    error: {
      control: 'text',
      description: 'Error message to display',
    },
    helperText: {
      control: 'text',
      description: 'Helper text to display below the input',
    },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search'],
      description: 'Input type attribute',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the input is disabled',
    },
    required: {
      control: 'boolean',
      description: 'Whether the input is required',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

// =============================================================================
// BASIC VARIANTS
// =============================================================================

export const Default: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'Enter your email',
    type: 'email',
  },
};

export const WithValue: Story = {
  args: {
    label: 'Username',
    defaultValue: 'johndoe',
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Password',
    type: 'password',
    helperText: 'Must be at least 8 characters',
  },
};

export const WithError: Story = {
  args: {
    label: 'Email',
    type: 'email',
    defaultValue: 'invalid-email',
    error: 'Please enter a valid email address',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Input',
    defaultValue: 'Cannot edit this',
    disabled: true,
  },
};

export const Required: Story = {
  args: {
    label: 'Required Field',
    required: true,
    placeholder: 'This field is required',
  },
};

// =============================================================================
// INPUT TYPES
// =============================================================================

export const TypeText: Story = {
  args: {
    label: 'Full Name',
    type: 'text',
    placeholder: 'Enter your full name',
    autoComplete: 'name',
  },
};

export const TypeEmail: Story = {
  args: {
    label: 'Email Address',
    type: 'email',
    placeholder: 'you@example.com',
    autoComplete: 'email',
  },
};

export const TypePassword: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    autoComplete: 'current-password',
  },
};

export const TypeNumber: Story = {
  args: {
    label: 'Age',
    type: 'number',
    placeholder: '25',
    min: 0,
    max: 120,
  },
};

export const TypeTel: Story = {
  args: {
    label: 'Phone Number',
    type: 'tel',
    placeholder: '(555) 555-5555',
    autoComplete: 'tel',
  },
};

export const TypeUrl: Story = {
  args: {
    label: 'Website',
    type: 'url',
    placeholder: 'https://example.com',
    autoComplete: 'url',
  },
};

export const TypeSearch: Story = {
  args: {
    label: 'Search',
    type: 'search',
    placeholder: 'Search...',
  },
};

// =============================================================================
// STATES
// =============================================================================

export const Empty: Story = {
  args: {
    label: 'Empty Input',
    placeholder: 'Start typing...',
  },
};

export const Filled: Story = {
  args: {
    label: 'Filled Input',
    defaultValue: 'This input has content',
  },
};

export const ErrorState: Story = {
  args: {
    label: 'Error State',
    defaultValue: 'bad@',
    error: 'Invalid email format',
  },
};

export const HelperState: Story = {
  args: {
    label: 'With Helper',
    helperText: 'This is helpful information about the field',
  },
};

// =============================================================================
// FORM CONTEXT EXAMPLES
// =============================================================================

export const LoginEmail: Story = {
  args: {
    label: 'Email',
    type: 'email',
    placeholder: 'Enter your email',
    autoComplete: 'email',
    required: true,
  },
};

export const LoginPassword: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    autoComplete: 'current-password',
    required: true,
  },
};

export const RegistrationPassword: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Create a password',
    autoComplete: 'new-password',
    helperText: 'Must be at least 8 characters',
    required: true,
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
    label: 'Focusable Input',
    placeholder: 'Tab to focus',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Focusable Input');

    // Tab to focus the input
    await userEvent.tab();

    // Verify input has focus
    await expect(input).toHaveFocus();
  },
};

/**
 * Test typing interaction
 */
export const TypeInteraction: Story = {
  args: {
    label: 'Type Here',
    placeholder: 'Start typing...',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Type Here');

    // Click to focus
    await userEvent.click(input);

    // Type text
    await userEvent.type(input, 'Hello World');

    // Verify value
    await expect(input).toHaveValue('Hello World');
  },
};

/**
 * Test clear and retype
 */
export const ClearAndRetype: Story = {
  args: {
    label: 'Editable Input',
    defaultValue: 'Original text',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Editable Input');

    // Click to focus
    await userEvent.click(input);

    // Clear the input
    await userEvent.clear(input);

    // Type new text
    await userEvent.type(input, 'New text');

    // Verify value
    await expect(input).toHaveValue('New text');
  },
};

/**
 * Test error state accessibility
 */
export const ErrorAccessibility: Story = {
  args: {
    label: 'Error Field',
    error: 'This field has an error',
    defaultValue: 'invalid',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Error Field');
    const errorMessage = canvas.getByRole('alert');

    // Verify error styling
    await expect(input).toHaveAttribute('aria-invalid', 'true');

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
    helperText: 'This is helpful information',
    id: 'helper-test',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Field with Helper');
    const helperText = canvas.getByText('This is helpful information');

    // Verify helper text is visible
    await expect(helperText).toBeVisible();

    // Verify input is described by helper text
    const describedBy = input.getAttribute('aria-describedby');
    await expect(describedBy).toBeTruthy();
  },
};

/**
 * Test disabled state
 */
export const DisabledInteraction: Story = {
  args: {
    label: 'Disabled Field',
    defaultValue: 'Cannot edit',
    disabled: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Disabled Field');

    // Verify input is disabled
    await expect(input).toBeDisabled();

    // Attempt to type (should not work)
    await userEvent.type(input, 'Should not appear');

    // Verify original value unchanged
    await expect(input).toHaveValue('Cannot edit');
  },
};

/**
 * Test label-input association
 */
export const LabelAssociation: Story = {
  args: {
    label: 'Associated Label',
    placeholder: 'Click the label',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const label = canvas.getByText('Associated Label');
    const input = canvas.getByLabelText('Associated Label');

    // Click the label
    await userEvent.click(label);

    // Input should receive focus
    await expect(input).toHaveFocus();
  },
};

/**
 * Test password masking
 */
export const PasswordMasking: Story = {
  args: {
    label: 'Secret Password',
    type: 'password',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Secret Password');

    // Type a password
    await userEvent.type(input, 'secretpassword123');

    // Verify input type is password (value is masked)
    await expect(input).toHaveAttribute('type', 'password');
    await expect(input).toHaveValue('secretpassword123');
  },
};

/**
 * Test placeholder behavior
 */
export const PlaceholderBehavior: Story = {
  args: {
    label: 'With Placeholder',
    placeholder: 'This disappears when typing',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('With Placeholder');

    // Verify placeholder is shown
    await expect(input).toHaveAttribute(
      'placeholder',
      'This disappears when typing'
    );

    // Type something
    await userEvent.type(input, 'Typed text');

    // Placeholder should still be in attribute but value takes precedence
    await expect(input).toHaveValue('Typed text');
  },
};
