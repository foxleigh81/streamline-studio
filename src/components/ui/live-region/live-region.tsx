'use client';

import { useEffect, useRef } from 'react';
import styles from './live-region.module.scss';

/**
 * Live region props
 */
export interface LiveRegionProps {
  /** Message to announce to screen readers */
  message: string;
  /** Politeness level for announcements */
  politeness?: 'polite' | 'assertive';
  /** Callback when announcement is cleared */
  onClear?: () => void;
  /** Duration to show message before auto-clearing (ms) */
  clearDelay?: number;
}

/**
 * Live Region Component
 *
 * Accessible announcement component for screen readers.
 * Announces dynamic updates using ARIA live regions.
 */
export function LiveRegion({
  message,
  politeness = 'polite',
  onClear,
  clearDelay = 5000,
}: LiveRegionProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Auto-clear message after delay
   */
  useEffect(() => {
    if (message && clearDelay > 0) {
      timeoutRef.current = setTimeout(() => {
        onClear?.();
      }, clearDelay);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
    return undefined;
  }, [message, clearDelay, onClear]);

  if (!message) {
    return null;
  }

  return (
    <div
      className={styles.liveRegion}
      role="status"
      aria-live={politeness}
      aria-atomic="true"
    >
      {message}
    </div>
  );
}

LiveRegion.displayName = 'LiveRegion';
