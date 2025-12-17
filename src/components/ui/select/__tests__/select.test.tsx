/**
 * Select Component Tests
 *
 * Tests for the Select component covering:
 * - Rendering with different props
 * - Accessibility (ARIA attributes, labels)
 * - Error states
 * - Helper text
 * - User interactions
 *
 * @see /docs/adrs/005-testing-strategy.md
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from '../select';
import type { SelectProps } from '../select';

describe('Select', () => {
  const defaultOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  const defaultProps: SelectProps = {
    options: defaultOptions,
    label: 'Test Select',
  };

  describe('rendering', () => {
    it('should render select with label', () => {
      render(<Select {...defaultProps} />);

      const select = screen.getByRole('combobox', { name: /test select/i });
      expect(select).toBeInTheDocument();

      const label = screen.getByText('Test Select');
      expect(label).toBeInTheDocument();
    });

    it('should render select without label', () => {
      render(<Select options={defaultOptions} />);

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('should render all options', () => {
      render(<Select {...defaultProps} />);

      const options = screen.getAllByRole('option');
      // 3 options in total (no placeholder)
      expect(options).toHaveLength(3);

      expect(
        screen.getByRole('option', { name: 'Option 1' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Option 2' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Option 3' })
      ).toBeInTheDocument();
    });

    it('should render placeholder option when provided', () => {
      render(<Select {...defaultProps} placeholder="Select an option" />);

      const placeholder = screen.getByRole('option', {
        name: 'Select an option',
      });
      expect(placeholder).toBeInTheDocument();
      expect(placeholder).toHaveAttribute('value', '');
      expect(placeholder).toHaveAttribute('disabled');

      // 4 options total: 1 placeholder + 3 regular
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(4);
    });

    it('should apply custom className', () => {
      render(<Select {...defaultProps} className="custom-class" />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('custom-class');
    });

    it('should apply custom id', () => {
      render(<Select {...defaultProps} id="custom-id" />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('id', 'custom-id');
    });

    it('should generate id from label when no id provided', () => {
      render(<Select {...defaultProps} label="My Custom Label" />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('id', 'select-my-custom-label');
    });
  });

  describe('accessibility', () => {
    it('should associate label with select using htmlFor', () => {
      render(<Select {...defaultProps} />);

      const select = screen.getByRole('combobox');
      const label = screen.getByText('Test Select');

      expect(label).toHaveAttribute('for', select.id);
    });

    it('should set aria-invalid when error exists', () => {
      render(<Select {...defaultProps} error="This field is required" />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-invalid', 'true');
    });

    it('should not set aria-invalid when no error', () => {
      render(<Select {...defaultProps} />);

      const select = screen.getByRole('combobox');
      expect(select).not.toHaveAttribute('aria-invalid');
    });

    it('should set aria-describedby with error id when error exists', () => {
      render(<Select {...defaultProps} error="This field is required" />);

      const select = screen.getByRole('combobox');
      const errorId = `${select.id}-error`;

      expect(select).toHaveAttribute('aria-describedby', errorId);

      const errorElement = document.getElementById(errorId);
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveTextContent('This field is required');
    });

    it('should set aria-describedby with helper id when helper text exists', () => {
      render(<Select {...defaultProps} helperText="Choose an option" />);

      const select = screen.getByRole('combobox');
      const helperId = `${select.id}-helper`;

      expect(select).toHaveAttribute('aria-describedby', helperId);

      const helperElement = document.getElementById(helperId);
      expect(helperElement).toBeInTheDocument();
      expect(helperElement).toHaveTextContent('Choose an option');
    });

    it('should set aria-describedby with both error and helper when both exist', () => {
      render(
        <Select
          {...defaultProps}
          error="This field is required"
          helperText="Choose an option"
        />
      );

      const select = screen.getByRole('combobox');
      const errorId = `${select.id}-error`;
      const helperId = `${select.id}-helper`;

      expect(select).toHaveAttribute(
        'aria-describedby',
        `${errorId} ${helperId}`
      );
    });

    it('should display error with role="alert"', () => {
      render(<Select {...defaultProps} error="This field is required" />);

      const error = screen.getByRole('alert');
      expect(error).toHaveTextContent('This field is required');
    });
  });

  describe('error states', () => {
    it('should render error message when error prop provided', () => {
      render(<Select {...defaultProps} error="This field is required" />);

      const error = screen.getByText('This field is required');
      expect(error).toBeInTheDocument();
    });

    it('should hide helper text when error exists', () => {
      render(
        <Select
          {...defaultProps}
          error="This field is required"
          helperText="Choose an option"
        />
      );

      const error = screen.getByText('This field is required');
      expect(error).toBeInTheDocument();

      // Helper text should not be visible when error is present
      const helperText = screen.queryByText('Choose an option');
      expect(helperText).not.toBeInTheDocument();
    });

    it('should apply error class when error exists', () => {
      render(<Select {...defaultProps} error="Error message" />);

      const select = screen.getByRole('combobox');
      expect(select.className).toContain('selectError');
    });
  });

  describe('helper text', () => {
    it('should render helper text when provided', () => {
      render(<Select {...defaultProps} helperText="This is helper text" />);

      const helperText = screen.getByText('This is helper text');
      expect(helperText).toBeInTheDocument();
    });

    it('should not render helper text when not provided', () => {
      const { container } = render(<Select {...defaultProps} />);

      expect(
        container.querySelector('[id$="-helper"]')
      ).not.toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('should call onChange when selection changes', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Select {...defaultProps} onChange={onChange} />);

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'option2');

      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('should update value when controlled', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      const { rerender } = render(
        <Select {...defaultProps} value="option1" onChange={onChange} />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('option1');

      await user.selectOptions(select, 'option2');

      // Simulate parent component updating the value
      rerender(
        <Select {...defaultProps} value="option2" onChange={onChange} />
      );

      expect(select.value).toBe('option2');
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Select {...defaultProps} disabled />);

      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
    });

    it('should not call onChange when disabled', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Select {...defaultProps} disabled onChange={onChange} />);

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'option2');

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('forwarding ref', () => {
    it('should forward ref to select element', () => {
      const ref = vi.fn();

      render(<Select {...defaultProps} ref={ref} />);

      expect(ref).toHaveBeenCalled();
      const selectElement = ref.mock.calls[0]?.[0];
      expect(selectElement).toBeInstanceOf(HTMLSelectElement);
    });
  });

  describe('native HTML attributes', () => {
    it('should pass through native select attributes', () => {
      render(
        <Select
          {...defaultProps}
          required
          autoFocus
          data-testid="test-select"
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('required');
      expect(select).toHaveFocus();
      expect(select).toHaveAttribute('data-testid', 'test-select');
    });

    it('should support name attribute', () => {
      render(<Select {...defaultProps} name="test-name" />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('name', 'test-name');
    });
  });

  describe('edge cases', () => {
    it('should render with empty options array', () => {
      render(<Select label="Empty Select" options={[]} />);

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();

      const options = screen.queryAllByRole('option');
      expect(options).toHaveLength(0);
    });

    it('should handle options with special characters', () => {
      const specialOptions = [
        { value: 'test@example.com', label: 'Email: test@example.com' },
        { value: 'path/to/file', label: 'Path: path/to/file' },
        { value: 'name with spaces', label: 'Name with Spaces' },
      ];

      render(<Select label="Special Options" options={specialOptions} />);

      expect(
        screen.getByRole('option', { name: 'Email: test@example.com' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Path: path/to/file' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Name with Spaces' })
      ).toBeInTheDocument();
    });
  });
});
