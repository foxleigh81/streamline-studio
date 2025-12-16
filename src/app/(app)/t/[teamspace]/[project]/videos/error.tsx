'use client';

import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import styles from './error.module.scss';

/**
 * Videos Route Error Page
 *
 * Error boundary for the videos list and detail pages.
 * Provides context-specific error handling with navigation back to project.
 */
export default function VideosError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  // Log error with Pino structured logging
  logger.error(
    { error: error.message, digest: error.digest, stack: error.stack },
    'Videos page error occurred'
  );

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <svg
              className={styles.icon}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div className={styles.headingGroup}>
            <h2 className={styles.heading}>Videos Error</h2>
            <p className={styles.subheading}>
              There was a problem loading videos
            </p>
          </div>
        </div>

        <div className={styles.errorDetails}>
          <p className={styles.errorMessage}>
            {error.message || 'Failed to load videos'}
          </p>
          {error.digest && (
            <p className={styles.errorDigest}>Error ID: {error.digest}</p>
          )}
        </div>

        <div className={styles.actions}>
          <button
            onClick={reset}
            className={styles.primaryButton}
            type="button"
          >
            Try Again
          </button>
          <button
            onClick={() => router.back()}
            className={styles.secondaryButton}
            type="button"
          >
            Go Back
          </button>
        </div>

        <p className={styles.helpText}>
          If this problem persists,{' '}
          <a
            href="https://github.com/foxleigh81/streamline-studio/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            report this issue
          </a>
        </p>
      </div>
    </div>
  );
}
