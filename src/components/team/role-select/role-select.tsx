import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import styles from './role-select.module.scss';

/**
 * Role select component props.
 */
export interface RoleSelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'value' | 'onChange'
> {
  /** Current role value */
  value: 'owner' | 'editor' | 'viewer';
  /** Callback when role changes */
  onChange: (role: 'owner' | 'editor' | 'viewer') => void;
  /** Error message to display */
  error?: string;
  /** Label text */
  label?: string;
}

/**
 * Role Select Component
 *
 * A dropdown for selecting user roles in a workspace.
 * Supports owner, editor, and viewer roles.
 *
 * @example
 * ```tsx
 * <RoleSelect
 *   value="editor"
 *   onChange={(role) => updateRole(role)}
 *   label="Role"
 * />
 * ```
 */
export const RoleSelect = forwardRef<HTMLSelectElement, RoleSelectProps>(
  function RoleSelect(
    { label, error, value, onChange, id, className, ...props },
    ref
  ) {
    const selectId =
      id ?? `role-select-${label?.toLowerCase().replace(/\s+/g, '-')}`;
    const errorId = error ? `${selectId}-error` : undefined;

    const selectClasses = [
      styles.select,
      error ? styles.selectError : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(event.target.value as 'owner' | 'editor' | 'viewer');
    };

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
          value={value}
          onChange={handleChange}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId}
          {...props}
        >
          <option value="owner">Owner - Full access</option>
          <option value="editor">Editor - Can edit content</option>
          <option value="viewer">Viewer - Read-only access</option>
        </select>
        {error && (
          <span id={errorId} className={styles.error} role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }
);

RoleSelect.displayName = 'RoleSelect';
