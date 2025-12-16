import Link from 'next/link';
import styles from './page.module.scss';

/**
 * Access Denied Page
 *
 * Shown when a user tries to access a channel they don't have permission for.
 * Provides clear messaging and actionable next steps.
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 */

export default function AccessDeniedPage() {
  return (
    <main className={styles.container}>
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div>
            <h1 className={styles.heading}>Access Denied</h1>
            <p className={styles.subheading}>
              You don&apos;t have permission to access this channel
            </p>
          </div>
        </div>

        <div className={styles.content}>
          <p className={styles.message}>
            This channel is private and you&apos;re not currently a member. To
            gain access, you&apos;ll need to be invited by a team administrator.
          </p>

          <div className={styles.reasons}>
            <h2 className={styles.reasonsHeading}>Why am I seeing this?</h2>
            <ul className={styles.reasonsList}>
              <li>You&apos;re not a member of this channel</li>
              <li>Your channel membership may have been removed</li>
              <li>The channel settings may have changed</li>
            </ul>
          </div>
        </div>

        <div className={styles.actions}>
          <Link href="/t" className={styles.primaryButton}>
            Return to My Teamspaces
          </Link>
          <p className={styles.helpText}>
            Need access?{' '}
            <span className={styles.suggestion}>
              Contact your team administrator to request permission.
            </span>
          </p>
        </div>
      </div>
    </main>
  );
}
