import { Skeleton } from '@/components/ui/skeleton';
import styles from './team-page.module.scss';

/**
 * Team Page Loading State
 *
 * Skeleton loader displayed while team data is being fetched.
 * Matches the layout of the actual team page.
 */
export default function TeamLoading() {
  return (
    <div className={styles.container}>
      <span className="sr-only">Loading team members...</span>

      {/* Header skeleton */}
      <div className={styles.header}>
        <div>
          <Skeleton width="12rem" height="2rem" />
          <Skeleton width="28rem" height="1.25rem" />
        </div>
      </div>

      {/* Team members section */}
      <div className={styles.section}>
        <Skeleton width="10rem" height="1.5rem" />

        {/* Members list skeleton */}
        <div className={styles.membersList}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={styles.memberCardSkeleton}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}
              >
                {/* Avatar skeleton */}
                <Skeleton width="3rem" height="3rem" variant="circular" />

                {/* Member info skeleton */}
                <div style={{ flex: 1 }}>
                  <Skeleton width="10rem" height="1.25rem" />
                  <div style={{ marginTop: '0.25rem' }}>
                    <Skeleton width="14rem" height="1rem" />
                  </div>
                </div>

                {/* Role badge skeleton */}
                <Skeleton width="5rem" height="1.5rem" />

                {/* Actions skeleton */}
                <Skeleton width="2rem" height="2rem" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending invitations section */}
      <div className={styles.section}>
        <Skeleton width="14rem" height="1.5rem" />

        <div className={styles.invitationsList}>
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className={styles.invitationCardSkeleton}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}
              >
                <div style={{ flex: 1 }}>
                  <Skeleton width="16rem" height="1.25rem" />
                  <div style={{ marginTop: '0.25rem' }}>
                    <Skeleton width="12rem" height="1rem" />
                  </div>
                </div>
                <Skeleton width="5rem" height="2rem" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite form section */}
      <div className={styles.section}>
        <Skeleton width="12rem" height="1.5rem" />
        <Skeleton width="100%" height="10rem" />
      </div>
    </div>
  );
}
