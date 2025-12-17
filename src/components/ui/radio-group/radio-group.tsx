import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import styles from './radio-group.module.scss';

/**
 * Radio option definition
 */
export interface RadioOption {
  /** The value of the radio option */
  value: string;
  /** The label text for the radio option */
  label: string;
  /** Whether this option is disabled */
  disabled?: boolean;
}

/**
 * RadioGroup component props.
 */
export interface RadioGroupProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'onChange'
> {
  /** Error message to display */
  error?: string | undefined;
  /** Legend text for the fieldset */
  legend?: string | undefined;
  /** Helper text */
  helperText?: string | undefined;
  /** Radio options to display */
  options: RadioOption[];
  /** Layout orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Currently selected value */
  value?: string;
  /** Callback when value changes */
  onChange?: (value: string) => void;
}

/**
 * RadioGroup Component
 *
 * A form radio group component with legend, error, and helper text support.
 * Uses fieldset/legend for proper accessibility and semantic HTML.
 *
 * @example
 * ```tsx
 * <RadioGroup
 *   legend="Time Format"
 *   name="timeFormat"
 *   options={[
 *     { value: '12h', label: '12-hour (AM/PM)' },
 *     { value: '24h', label: '24-hour' }
 *   ]}
 *   value={timeFormat}
 *   onChange={setTimeFormat}
 * />
 * ```
 */
export const RadioGroup = forwardRef<HTMLInputElement, RadioGroupProps>(
  function RadioGroup(
    {
      legend,
      error,
      helperText,
      id,
      className,
      options,
      orientation = 'vertical',
      name,
      value,
      onChange,
      ...props
    },
    ref
  ) {
    const fieldsetId =
      id ?? `radio-group-${legend?.toLowerCase().replace(/\s+/g, '-')}`;
    const errorId = error ? `${fieldsetId}-error` : undefined;
    const helperId = helperText ? `${fieldsetId}-helper` : undefined;

    const describedBy =
      [errorId, helperId].filter(Boolean).join(' ') || undefined;

    const fieldsetClasses = [
      styles.fieldset,
      error ? styles.fieldsetError : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const optionsClasses = [
      styles.options,
      orientation === 'horizontal' ? styles.optionsHorizontal : '',
    ]
      .filter(Boolean)
      .join(' ');

    const handleChange = (optionValue: string) => {
      if (onChange) {
        onChange(optionValue);
      }
    };

    return (
      <fieldset
        className={fieldsetClasses}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : undefined}
      >
        {legend && <legend className={styles.legend}>{legend}</legend>}
        <div className={optionsClasses}>
          {options.map((option, index) => {
            const optionId = `${fieldsetId}-${option.value}`;
            const isChecked = value === option.value;
            const isDisabled = option.disabled ?? props.disabled;

            return (
              <div key={option.value} className={styles.optionWrapper}>
                <input
                  ref={index === 0 ? ref : undefined}
                  type="radio"
                  id={optionId}
                  name={name}
                  value={option.value}
                  checked={isChecked}
                  disabled={isDisabled}
                  onChange={() => handleChange(option.value)}
                  className={styles.radio}
                  {...props}
                />
                <label htmlFor={optionId} className={styles.label}>
                  {option.label}
                </label>
              </div>
            );
          })}
        </div>
        {error && (
          <span id={errorId} className={styles.error} role="alert">
            {error}
          </span>
        )}
        {helperText && !error && (
          <span id={helperId} className={styles.helperText}>
            {helperText}
          </span>
        )}
      </fieldset>
    );
  }
);

RadioGroup.displayName = 'RadioGroup';
