/**
 * Input Component Unit Tests
 *
 * Tests for the Input component covering rendering, props,
 * accessibility, and user interactions.
 *
 * @see /docs/adrs/005-testing-strategy.md
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './input';

describe('Input', () => {
  describe('Rendering', () => {
    it('renders with label', () => {
      render(<Input label="Email" />);

      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('renders without label', () => {
      render(<Input placeholder="Enter text" />);

      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('renders with placeholder', () => {
      render(<Input label="Name" placeholder="Enter your name" />);

      expect(
        screen.getByPlaceholderText('Enter your name')
      ).toBeInTheDocument();
    });

    it('renders with default value', () => {
      render(<Input label="Name" defaultValue="John" />);

      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    });

    it('renders with controlled value', () => {
      render(<Input label="Name" value="Jane" onChange={() => {}} />);

      expect(screen.getByDisplayValue('Jane')).toBeInTheDocument();
    });
  });

  describe('Input Types', () => {
    it('renders as text input by default', () => {
      render(<Input label="Text" />);

      // HTML inputs default to type="text" when no type is specified
      // The input should behave as text input (no type attribute or type="text")
      const input = screen.getByLabelText('Text');
      const type = input.getAttribute('type');
      expect(type === null || type === 'text').toBe(true);
    });

    it('renders as email input', () => {
      render(<Input label="Email" type="email" />);

      expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    });

    it('renders as password input', () => {
      render(<Input label="Password" type="password" />);

      expect(screen.getByLabelText('Password')).toHaveAttribute(
        'type',
        'password'
      );
    });

    it('renders as number input', () => {
      render(<Input label="Age" type="number" />);

      expect(screen.getByLabelText('Age')).toHaveAttribute('type', 'number');
    });
  });

  describe('Error State', () => {
    it('displays error message', () => {
      render(<Input label="Email" error="Invalid email" />);

      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email');
    });

    it('sets aria-invalid when error is present', () => {
      render(<Input label="Email" error="Invalid email" />);

      expect(screen.getByLabelText('Email')).toHaveAttribute(
        'aria-invalid',
        'true'
      );
    });

    it('does not set aria-invalid when no error', () => {
      render(<Input label="Email" />);

      expect(screen.getByLabelText('Email')).not.toHaveAttribute(
        'aria-invalid'
      );
    });

    it('associates error message with input via aria-describedby', () => {
      render(<Input label="Email" error="Invalid email" id="email-input" />);

      const input = screen.getByLabelText('Email');
      const errorId = input.getAttribute('aria-describedby');

      expect(errorId).toBeTruthy();
      expect(screen.getByRole('alert')).toHaveAttribute('id', errorId);
    });
  });

  describe('Helper Text', () => {
    it('displays helper text', () => {
      render(<Input label="Password" helperText="Must be 8+ characters" />);

      expect(screen.getByText('Must be 8+ characters')).toBeInTheDocument();
    });

    it('hides helper text when error is present', () => {
      render(
        <Input
          label="Password"
          helperText="Must be 8+ characters"
          error="Password too short"
        />
      );

      expect(
        screen.queryByText('Must be 8+ characters')
      ).not.toBeInTheDocument();
      expect(screen.getByText('Password too short')).toBeInTheDocument();
    });

    it('associates helper text with input via aria-describedby', () => {
      render(
        <Input
          label="Password"
          helperText="Must be 8+ characters"
          id="password"
        />
      );

      const input = screen.getByLabelText('Password');
      const describedBy = input.getAttribute('aria-describedby');

      expect(describedBy).toBeTruthy();
    });
  });

  describe('Disabled State', () => {
    it('can be disabled', () => {
      render(<Input label="Name" disabled />);

      expect(screen.getByLabelText('Name')).toBeDisabled();
    });

    it('prevents typing when disabled', async () => {
      const user = userEvent.setup();
      render(<Input label="Name" disabled defaultValue="Original" />);

      const input = screen.getByLabelText('Name');
      await user.type(input, 'New text');

      expect(input).toHaveValue('Original');
    });
  });

  describe('Required State', () => {
    it('can be marked as required', () => {
      render(<Input label="Email" required />);

      expect(screen.getByLabelText('Email')).toBeRequired();
    });
  });

  describe('User Interactions', () => {
    it('handles typing', async () => {
      const user = userEvent.setup();
      render(<Input label="Name" />);

      const input = screen.getByLabelText('Name');
      await user.type(input, 'Hello World');

      expect(input).toHaveValue('Hello World');
    });

    it('handles clearing', async () => {
      const user = userEvent.setup();
      render(<Input label="Name" defaultValue="Initial" />);

      const input = screen.getByLabelText('Name');
      await user.clear(input);

      expect(input).toHaveValue('');
    });

    it('handles paste', async () => {
      const user = userEvent.setup();
      render(<Input label="Name" />);

      const input = screen.getByLabelText('Name');
      await user.click(input);
      await user.paste('Pasted text');

      expect(input).toHaveValue('Pasted text');
    });

    it('calls onChange when value changes', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      render(<Input label="Name" onChange={handleChange} />);

      const input = screen.getByLabelText('Name');
      await user.type(input, 'Test');

      expect(handleChange).toHaveBeenCalledTimes(4); // Once per character
    });

    it('calls onFocus when focused', async () => {
      const handleFocus = vi.fn();
      const user = userEvent.setup();
      render(<Input label="Name" onFocus={handleFocus} />);

      const input = screen.getByLabelText('Name');
      await user.click(input);

      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('calls onBlur when blurred', async () => {
      const handleBlur = vi.fn();
      const user = userEvent.setup();
      render(<Input label="Name" onBlur={handleBlur} />);

      const input = screen.getByLabelText('Name');
      await user.click(input);
      await user.tab();

      expect(handleBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has proper label association', () => {
      render(<Input label="Email" id="email" />);

      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('id', 'email');
    });

    it('generates id from label if not provided', () => {
      render(<Input label="Full Name" />);

      const input = screen.getByLabelText('Full Name');
      expect(input).toHaveAttribute('id', 'input-full-name');
    });

    it('can be focused via tab', async () => {
      const user = userEvent.setup();
      render(<Input label="Name" />);

      await user.tab();

      expect(screen.getByLabelText('Name')).toHaveFocus();
    });

    it('label click focuses input', async () => {
      const user = userEvent.setup();
      render(<Input label="Name" />);

      const label = screen.getByText('Name');
      await user.click(label);

      expect(screen.getByLabelText('Name')).toHaveFocus();
    });

    it('supports autocomplete attribute', () => {
      render(<Input label="Email" autoComplete="email" />);

      expect(screen.getByLabelText('Email')).toHaveAttribute(
        'autocomplete',
        'email'
      );
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref to input element', () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<Input label="Name" ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it('allows focus via ref', () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<Input label="Name" ref={ref} />);

      ref.current?.focus();

      expect(screen.getByLabelText('Name')).toHaveFocus();
    });
  });

  describe('Custom Props', () => {
    it('passes through additional HTML attributes', () => {
      render(
        <Input
          label="Name"
          data-testid="custom-input"
          minLength={2}
          maxLength={50}
        />
      );

      const input = screen.getByTestId('custom-input');
      expect(input).toHaveAttribute('minlength', '2');
      expect(input).toHaveAttribute('maxlength', '50');
    });

    it('applies custom className', () => {
      render(<Input label="Name" className="custom-class" />);

      const input = screen.getByLabelText('Name');
      expect(input).toHaveClass('custom-class');
    });
  });
});
