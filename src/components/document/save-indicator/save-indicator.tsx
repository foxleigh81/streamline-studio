'use client';

import styles from './save-indicator.module.scss';

/**
 * Save status states.
 */
export type SaveStatus = 'saved' | 'saving' | 'failed' | 'idle';

/**
 * Props for the SaveIndicator component.
 */
export interface SaveIndicatorProps {
  /** Current save status */
  status: SaveStatus;
  /** Last saved timestamp (ISO string or Date) */
  lastSaved?: string | Date | null;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Formats a timestamp for display.
 *
 * @param timestamp - ISO string or Date object
 * @returns Formatted time string (e.g., "2 minutes ago")
 */
function formatTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec} seconds ago`;
  if (diffMin === 1) return '1 minute ago';
  if (diffMin < 60) return `${diffMin} minutes ago`;
  if (diffHour === 1) return '1 hour ago';
  if (diffHour < 24) return `${diffHour} hours ago`;

  // For dates older than 24 hours, show the actual date
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * SaveIndicator Component
 *
 * Displays the current save status and last saved time.
 * Provides visual and screen reader feedback for save operations.
 *
 * Features:
 * - Visual status indicator (saved, saving, failed)
 * - Last saved timestamp
 * - Accessible with aria-live announcements
 * - Loading spinner for saving state
 *
 * @example
 * ```tsx
 * <SaveIndicator
 *   status="saving"
 *   lastSaved={new Date()}
 * />
 * ```
 */
export function SaveIndicator({
  status,
  lastSaved,
  className,
}: SaveIndicatorProps) {
  const statusText = {
    saved: 'Saved',
    saving: 'Saving...',
    failed: 'Failed to save',
    idle: '',
  };

  const statusIcon = {
    saved: '✓',
    saving: '',
    failed: '✕',
    idle: '',
  };

  return (
    <div
      className={`${styles.indicator} ${className ?? ''}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className={`${styles.status} ${styles[status]}`}>
        {status === 'saving' && (
          <span className={styles.spinner} aria-hidden="true" />
        )}
        {status !== 'saving' && statusIcon[status] && (
          <span className={styles.icon} aria-hidden="true">
            {statusIcon[status]}
          </span>
        )}
        <span className={styles.text}>{statusText[status]}</span>
      </div>
      {status === 'saved' && lastSaved && (
        <span className={styles.timestamp}>{formatTimestamp(lastSaved)}</span>
      )}
    </div>
  );
}

SaveIndicator.displayName = 'SaveIndicator';
