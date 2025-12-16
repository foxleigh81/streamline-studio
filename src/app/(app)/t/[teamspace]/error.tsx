'use client';

import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import styles from './error.module.scss';

/**
 * Teamspace Error Boundary
 *
 * Catches and handles errors at the teamspace level.
 * Provides clear error messaging and recovery options.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */

export default function TeamspaceError({
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
    'Teamspace error occurred'
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
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h2 className={styles.heading}>Teamspace Error</h2>
            <p className={styles.subheading}>
              There was a problem loading this teamspace
            </p>
          </div>
        </div>

        <div className={styles.errorDetails}>
          <p className={styles.errorMessage}>
            {error.message || 'An unexpected error occurred'}
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
            onClick={() => router.push('/t')}
            className={styles.secondaryButton}
            type="button"
          >
            Back to Teamspaces
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
