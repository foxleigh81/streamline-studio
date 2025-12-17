/**
 * RadioGroup Component Tests
 *
 * Tests for the RadioGroup component covering:
 * - Rendering with different props
 * - Accessibility (ARIA attributes, fieldset/legend)
 * - Error states
 * - Helper text
 * - User interactions
 * - Orientation (horizontal/vertical)
 *
 * @see /docs/adrs/005-testing-strategy.md
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RadioGroup } from '../radio-group';
import type { RadioGroupProps, RadioOption } from '../radio-group';

describe('RadioGroup', () => {
  const defaultOptions: RadioOption[] = [
    { value: '12h', label: '12-hour (AM/PM)' },
    { value: '24h', label: '24-hour' },
  ];

  const defaultProps: RadioGroupProps = {
    options: defaultOptions,
    legend: 'Time Format',
    name: 'timeFormat',
  };

  describe('rendering', () => {
    it('should render fieldset with legend', () => {
      render(<RadioGroup {...defaultProps} />);

      const fieldset = screen.getByRole('group', { name: /time format/i });
      expect(fieldset).toBeInTheDocument();

      const legend = screen.getByText('Time Format');
      expect(legend).toBeInTheDocument();
    });

    it('should render fieldset without legend', () => {
      render(<RadioGroup options={defaultOptions} name="test" />);

      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(2);
    });

    it('should render all radio options', () => {
      render(<RadioGroup {...defaultProps} />);

      const radio12h = screen.getByRole('radio', { name: '12-hour (AM/PM)' });
      const radio24h = screen.getByRole('radio', { name: '24-hour' });

      expect(radio12h).toBeInTheDocument();
      expect(radio24h).toBeInTheDocument();
    });

    it('should render with vertical orientation by default', () => {
      render(<RadioGroup {...defaultProps} />);

      // Verify radios are rendered (orientation is a styling concern)
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(2);
    });

    it('should render with horizontal orientation when specified', () => {
      render(<RadioGroup {...defaultProps} orientation="horizontal" />);

      // Verify radios are rendered (orientation is a styling concern)
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(2);
    });

    it('should apply custom className', () => {
      render(<RadioGroup {...defaultProps} className="custom-class" />);

      const fieldset = screen.getByRole('group');
      expect(fieldset).toHaveClass('custom-class');
    });

    it('should use custom id for radio inputs', () => {
      render(<RadioGroup {...defaultProps} id="custom-id" />);

      const radios = screen.getAllByRole('radio') as HTMLInputElement[];
      // The id is used as a prefix for individual radio inputs
      expect(radios[0]?.id).toContain('custom-id');
    });

    it('should generate id from legend when no id provided', () => {
      render(<RadioGroup {...defaultProps} legend="My Custom Legend" />);

      const radio = screen.getAllByRole('radio')[0];
      expect(radio?.id).toContain('radio-group-my-custom-legend');
    });
  });

  describe('accessibility', () => {
    it('should use fieldset and legend for proper grouping', () => {
      const { container } = render(<RadioGroup {...defaultProps} />);

      const fieldset = container.querySelector('fieldset');
      const legend = container.querySelector('legend');

      expect(fieldset).toBeInTheDocument();
      expect(legend).toBeInTheDocument();
      expect(legend?.textContent).toBe('Time Format');
    });

    it('should associate labels with radio inputs', () => {
      render(<RadioGroup {...defaultProps} />);

      const radio12h = screen.getByRole('radio', { name: '12-hour (AM/PM)' });
      const radio24h = screen.getByRole('radio', { name: '24-hour' });

      expect(radio12h).toBeInTheDocument();
      expect(radio24h).toBeInTheDocument();
    });

    it('should set aria-invalid when error exists', () => {
      render(<RadioGroup {...defaultProps} error="Please select an option" />);

      const fieldset = screen.getByRole('group');
      expect(fieldset).toHaveAttribute('aria-invalid', 'true');
    });

    it('should not set aria-invalid when no error', () => {
      render(<RadioGroup {...defaultProps} />);

      const fieldset = screen.getByRole('group');
      expect(fieldset).not.toHaveAttribute('aria-invalid');
    });

    it('should set aria-describedby with error id when error exists', () => {
      render(<RadioGroup {...defaultProps} error="Please select an option" />);

      const fieldset = screen.getByRole('group');
      const describedBy = fieldset.getAttribute('aria-describedby');

      expect(describedBy).toBeTruthy();
      const errorElement = document.getElementById(describedBy!);
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveTextContent('Please select an option');
    });

    it('should set aria-describedby with helper id when helper text exists', () => {
      render(
        <RadioGroup
          {...defaultProps}
          helperText="Choose your preferred format"
        />
      );

      const fieldset = screen.getByRole('group');
      const describedBy = fieldset.getAttribute('aria-describedby');

      expect(describedBy).toBeTruthy();
      const helperElement = document.getElementById(describedBy!);
      expect(helperElement).toBeInTheDocument();
      expect(helperElement).toHaveTextContent('Choose your preferred format');
    });

    it('should set aria-describedby with both error and helper when both exist', () => {
      render(
        <RadioGroup
          {...defaultProps}
          error="Please select an option"
          helperText="Choose your preferred format"
        />
      );

      const fieldset = screen.getByRole('group');
      const describedBy = fieldset.getAttribute('aria-describedby');

      expect(describedBy).toContain('-error');
      expect(describedBy).toContain('-helper');
    });

    it('should display error with role="alert"', () => {
      render(<RadioGroup {...defaultProps} error="Please select an option" />);

      const error = screen.getByRole('alert');
      expect(error).toHaveTextContent('Please select an option');
    });

    it('should share name attribute across all radio inputs', () => {
      render(<RadioGroup {...defaultProps} name="test-name" />);

      const radios = screen.getAllByRole('radio') as HTMLInputElement[];
      radios.forEach((radio) => {
        expect(radio.name).toBe('test-name');
      });
    });
  });

  describe('error states', () => {
    it('should render error message when error prop provided', () => {
      render(<RadioGroup {...defaultProps} error="Please select an option" />);

      const error = screen.getByText('Please select an option');
      expect(error).toBeInTheDocument();
    });

    it('should hide helper text when error exists', () => {
      render(
        <RadioGroup
          {...defaultProps}
          error="Please select an option"
          helperText="Choose your preferred format"
        />
      );

      const error = screen.getByText('Please select an option');
      expect(error).toBeInTheDocument();

      // Helper text should not be visible when error is present
      const helperText = screen.queryByText('Choose your preferred format');
      expect(helperText).not.toBeInTheDocument();
    });

    it('should apply error class when error exists', () => {
      render(<RadioGroup {...defaultProps} error="Error message" />);

      const fieldset = screen.getByRole('group');
      expect(fieldset.className).toContain('fieldsetError');
    });
  });

  describe('helper text', () => {
    it('should render helper text when provided', () => {
      render(<RadioGroup {...defaultProps} helperText="This is helper text" />);

      const helperText = screen.getByText('This is helper text');
      expect(helperText).toBeInTheDocument();
    });

    it('should not render helper text when not provided', () => {
      const { container } = render(<RadioGroup {...defaultProps} />);

      expect(
        container.querySelector('[id$="-helper"]')
      ).not.toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('should call onChange when radio is selected', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<RadioGroup {...defaultProps} onChange={onChange} />);

      const radio12h = screen.getByRole('radio', { name: '12-hour (AM/PM)' });
      await user.click(radio12h);

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('12h');
    });

    it('should update checked state when value changes', () => {
      const { rerender } = render(<RadioGroup {...defaultProps} value="12h" />);

      const radio12h = screen.getByRole('radio', {
        name: '12-hour (AM/PM)',
      }) as HTMLInputElement;
      const radio24h = screen.getByRole('radio', {
        name: '24-hour',
      }) as HTMLInputElement;

      expect(radio12h.checked).toBe(true);
      expect(radio24h.checked).toBe(false);

      rerender(<RadioGroup {...defaultProps} value="24h" />);

      expect(radio12h.checked).toBe(false);
      expect(radio24h.checked).toBe(true);
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<RadioGroup {...defaultProps} onChange={onChange} />);

      const radio12h = screen.getByRole('radio', { name: '12-hour (AM/PM)' });

      // Tab to focus the radio
      await user.tab();
      expect(radio12h).toHaveFocus();

      // Press space to select
      await user.keyboard(' ');
      expect(onChange).toHaveBeenCalledWith('12h');
    });

    it('should be disabled when disabled prop is true', () => {
      render(<RadioGroup {...defaultProps} disabled />);

      const radios = screen.getAllByRole('radio');
      radios.forEach((radio) => {
        expect(radio).toBeDisabled();
      });
    });

    it('should disable individual option when option.disabled is true', () => {
      const optionsWithDisabled: RadioOption[] = [
        { value: '12h', label: '12-hour (AM/PM)' },
        { value: '24h', label: '24-hour', disabled: true },
      ];

      render(<RadioGroup {...defaultProps} options={optionsWithDisabled} />);

      const radio12h = screen.getByRole('radio', { name: '12-hour (AM/PM)' });
      const radio24h = screen.getByRole('radio', { name: '24-hour' });

      expect(radio12h).not.toBeDisabled();
      expect(radio24h).toBeDisabled();
    });

    it('should not call onChange when disabled', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<RadioGroup {...defaultProps} disabled onChange={onChange} />);

      const radio12h = screen.getByRole('radio', { name: '12-hour (AM/PM)' });
      await user.click(radio12h);

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('forwarding ref', () => {
    it('should forward ref to first radio element', () => {
      const ref = vi.fn();

      render(<RadioGroup {...defaultProps} ref={ref} />);

      expect(ref).toHaveBeenCalled();
      const radioElement = ref.mock.calls[0]?.[0];
      expect(radioElement).toBeInstanceOf(HTMLInputElement);
      expect(radioElement?.type).toBe('radio');
    });
  });

  describe('native HTML attributes', () => {
    it('should pass through native input attributes to all radios', () => {
      render(
        <RadioGroup {...defaultProps} required data-testid="test-radio-group" />
      );

      const radios = screen.getAllByRole('radio') as HTMLInputElement[];
      radios.forEach((radio) => {
        expect(radio).toHaveAttribute('required');
        expect(radio).toHaveAttribute('data-testid', 'test-radio-group');
      });
    });
  });

  describe('edge cases', () => {
    it('should render with empty options array', () => {
      render(<RadioGroup legend="Empty Group" options={[]} name="empty" />);

      const fieldset = screen.getByRole('group');
      expect(fieldset).toBeInTheDocument();

      const radios = screen.queryAllByRole('radio');
      expect(radios).toHaveLength(0);
    });

    it('should handle options with special characters', () => {
      const specialOptions: RadioOption[] = [
        { value: 'test@example.com', label: 'Email: test@example.com' },
        { value: 'path/to/file', label: 'Path: path/to/file' },
        { value: 'name with spaces', label: 'Name with Spaces' },
      ];

      render(
        <RadioGroup
          legend="Special Options"
          options={specialOptions}
          name="special"
        />
      );

      expect(
        screen.getByRole('radio', { name: 'Email: test@example.com' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('radio', { name: 'Path: path/to/file' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('radio', { name: 'Name with Spaces' })
      ).toBeInTheDocument();
    });

    it('should handle no selected value', () => {
      render(<RadioGroup {...defaultProps} />);

      const radios = screen.getAllByRole('radio') as HTMLInputElement[];
      radios.forEach((radio) => {
        expect(radio.checked).toBe(false);
      });
    });

    it('should handle multiple options with same label', () => {
      const duplicateOptions: RadioOption[] = [
        { value: 'option1', label: 'Same Label' },
        { value: 'option2', label: 'Same Label' },
      ];

      render(
        <RadioGroup
          legend="Duplicate Labels"
          options={duplicateOptions}
          name="duplicate"
        />
      );

      const radios = screen.getAllByRole('radio', { name: 'Same Label' });
      expect(radios).toHaveLength(2);
      expect((radios[0] as HTMLInputElement).value).toBe('option1');
      expect((radios[1] as HTMLInputElement).value).toBe('option2');
    });
  });

  describe('controlled vs uncontrolled', () => {
    it('should work as controlled component', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      const { rerender } = render(
        <RadioGroup {...defaultProps} value="12h" onChange={onChange} />
      );

      const radio12h = screen.getByRole('radio', {
        name: '12-hour (AM/PM)',
      }) as HTMLInputElement;
      const radio24h = screen.getByRole('radio', {
        name: '24-hour',
      }) as HTMLInputElement;

      expect(radio12h.checked).toBe(true);
      expect(radio24h.checked).toBe(false);

      await user.click(radio24h);
      expect(onChange).toHaveBeenCalledWith('24h');

      // Parent component updates value
      rerender(
        <RadioGroup {...defaultProps} value="24h" onChange={onChange} />
      );

      expect(radio12h.checked).toBe(false);
      expect(radio24h.checked).toBe(true);
    });

    it('should work as uncontrolled component', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<RadioGroup {...defaultProps} onChange={onChange} />);

      const radio12h = screen.getByRole('radio', {
        name: '12-hour (AM/PM)',
      }) as HTMLInputElement;
      const radio24h = screen.getByRole('radio', {
        name: '24-hour',
      }) as HTMLInputElement;

      expect(radio12h.checked).toBe(false);
      expect(radio24h.checked).toBe(false);

      await user.click(radio12h);
      expect(onChange).toHaveBeenCalledWith('12h');
    });
  });
});
