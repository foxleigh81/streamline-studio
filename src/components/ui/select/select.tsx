import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import styles from './select.module.scss';

/**
 * Select component props.
 */
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Error message to display */
  error?: string | undefined;
  /** Label text */
  label?: string | undefined;
  /** Helper text */
  helperText?: string | undefined;
  /** Select options */
  options: Array<{ value: string; label: string }>;
  /** Placeholder option text */
  placeholder?: string | undefined;
}

/**
 * Select Component
 *
 * A form select component with label, error, and helper text support.
 * Follows accessibility best practices with proper ARIA attributes.
 *
 * @example
 * ```tsx
 * <Select
 *   label="Default Channel"
 *   placeholder="Select a channel"
 *   options={[
 *     { value: 'ch1', label: 'Channel 1' },
 *     { value: 'ch2', label: 'Channel 2' }
 *   ]}
 *   error={errors.channel}
 * />
 * ```
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    { label, error, helperText, id, className, options, placeholder, ...props },
    ref
  ) {
    const selectId =
      id ?? `select-${label?.toLowerCase().replace(/\s+/g, '-')}`;
    const errorId = error ? `${selectId}-error` : undefined;
    const helperId = helperText ? `${selectId}-helper` : undefined;

    const describedBy =
      [errorId, helperId].filter(Boolean).join(' ') || undefined;

    const selectClasses = [
      styles.select,
      error ? styles.selectError : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={styles.wrapper}>
        {label && (
          <label htmlFor={selectId} className={styles.label}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={selectClasses}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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
      </div>
    );
  }
);

Select.displayName = 'Select';
