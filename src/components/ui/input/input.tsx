import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import styles from './input.module.scss';

/**
 * Input component props.
 */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Error message to display */
  error?: string | undefined;
  /** Label text */
  label?: string | undefined;
  /** Helper text */
  helperText?: string | undefined;
}

/**
 * Input Component
 *
 * A form input component with label, error, and helper text support.
 * Follows accessibility best practices.
 *
 * @example
 * ```tsx
 * <Input
 *   label="Email"
 *   type="email"
 *   placeholder="Enter your email"
 *   error={errors.email}
 * />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, helperText, id, className, ...props },
  ref
) {
  const inputId = id ?? `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText ? `${inputId}-helper` : undefined;

  const describedBy =
    [errorId, helperId].filter(Boolean).join(' ') || undefined;

  const inputClasses = [styles.input, error ? styles.inputError : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.wrapper}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={inputClasses}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...props}
      />
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
});

Input.displayName = 'Input';
