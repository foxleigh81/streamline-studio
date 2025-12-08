import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import styles from './button.module.scss';

/**
 * Button variant options.
 */
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'ghost';

/**
 * Button size options.
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Button component props.
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant of the button */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Whether the button is full width */
  fullWidth?: boolean;
  /** Whether the button is loading */
  isLoading?: boolean;
}

/**
 * Map variant to CSS module class.
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary: styles.variantPrimary ?? '',
  secondary: styles.variantSecondary ?? '',
  destructive: styles.variantDestructive ?? '',
  outline: styles.variantOutline ?? '',
  ghost: styles.variantGhost ?? '',
};

/**
 * Map size to CSS module class.
 */
const sizeClasses: Record<ButtonSize, string> = {
  sm: styles.sizeSm ?? '',
  md: styles.sizeMd ?? '',
  lg: styles.sizeLg ?? '',
};

/**
 * Button Component
 *
 * A versatile button component with multiple variants and sizes.
 * Follows accessibility best practices with proper focus states.
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md">
 *   Click me
 * </Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) {
    const buttonClasses = [
      styles.button,
      variantClasses[variant],
      sizeClasses[size],
      fullWidth ? styles.fullWidth : '',
      isLoading ? styles.loading : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        className={buttonClasses}
        disabled={disabled ?? isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <span className={styles.spinner} aria-hidden="true" />
        ) : null}
        <span className={isLoading ? styles.hiddenText : ''}>{children}</span>
      </button>
    );
  }
);

Button.displayName = 'Button';
