'use client';

import { type KeyboardEvent } from 'react';
import { Grid, Table } from 'lucide-react';
import styles from './view-toggle.module.scss';

/**
 * View mode options
 */
export type ViewMode = 'grid' | 'table';

/**
 * ViewToggle component props
 */
export interface ViewToggleProps {
  /** Current view mode */
  value: ViewMode;
  /** Callback when view mode changes */
  onChange: (mode: ViewMode) => void;
  /** Optional className for custom styling */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * ViewToggle Component
 *
 * Toggle button group for switching between Grid and Table views.
 * Supports keyboard navigation (arrow keys). Parent component is responsible
 * for persisting the selection to localStorage.
 */
export function ViewToggle({
  value,
  onChange,
  className,
  size = 'md',
}: ViewToggleProps) {
  /**
   * Handle keyboard navigation (arrow keys)
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const newMode = value === 'grid' ? 'table' : 'grid';
      onChange(newMode);
    }
  };

  /**
   * Handle button click
   */
  const handleClick = (mode: ViewMode) => {
    if (mode !== value) {
      onChange(mode);
    }
  };

  const containerClasses = [
    styles.container,
    styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={containerClasses}
      role="group"
      aria-label="View mode"
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        className={`${styles.button} ${value === 'grid' ? styles.active : ''}`}
        onClick={() => handleClick('grid')}
        aria-label="Grid view"
        aria-pressed={value === 'grid'}
      >
        <Grid size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
      </button>
      <button
        type="button"
        className={`${styles.button} ${value === 'table' ? styles.active : ''}`}
        onClick={() => handleClick('table')}
        aria-label="Table view"
        aria-pressed={value === 'table'}
      >
        <Table size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
      </button>
    </div>
  );
}

ViewToggle.displayName = 'ViewToggle';
