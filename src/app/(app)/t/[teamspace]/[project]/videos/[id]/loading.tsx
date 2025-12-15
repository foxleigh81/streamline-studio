import { Skeleton } from '@/components/ui/skeleton';
import styles from './video-detail-page.module.scss';

/**
 * Video Detail Page Loading State
 *
 * Skeleton loader displayed while video detail data is being fetched.
 * Matches the layout of the actual video detail page.
 */
export default function VideoDetailLoading() {
  return (
    <div className={styles.container}>
      <span className="sr-only">Loading video details...</span>

      {/* Header skeleton */}
      <div className={styles.header}>
        <div>
          <Skeleton width="20rem" height="2.5rem" />
          <div style={{ marginTop: '0.5rem' }}>
            <Skeleton width="30rem" height="1.25rem" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Skeleton width="5rem" height="2.5rem" />
          <Skeleton width="5rem" height="2.5rem" />
        </div>
      </div>

      {/* Video metadata skeleton */}
      <div className={styles.metadata}>
        <div className={styles.metadataGrid}>
          {/* Status */}
          <div>
            <Skeleton width="4rem" height="1rem" />
            <div style={{ marginTop: '0.5rem' }}>
              <Skeleton width="6rem" height="1.5rem" />
            </div>
          </div>

          {/* Due date */}
          <div>
            <Skeleton width="6rem" height="1rem" />
            <div style={{ marginTop: '0.5rem' }}>
              <Skeleton width="10rem" height="1.5rem" />
            </div>
          </div>

          {/* Categories */}
          <div>
            <Skeleton width="7rem" height="1rem" />
            <div
              style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}
            >
              <Skeleton width="5rem" height="1.5rem" />
              <Skeleton width="6rem" height="1.5rem" />
            </div>
          </div>

          {/* Created date */}
          <div>
            <Skeleton width="5rem" height="1rem" />
            <div style={{ marginTop: '0.5rem' }}>
              <Skeleton width="10rem" height="1.5rem" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className={styles.tabs}>
        <div className={styles.tabButtons}>
          <Skeleton width="6rem" height="2.5rem" />
          <Skeleton width="8rem" height="2.5rem" />
          <Skeleton width="5rem" height="2.5rem" />
          <Skeleton width="10rem" height="2.5rem" />
        </div>

        {/* Tab content skeleton */}
        <div className={styles.tabContent}>
          <Skeleton width="100%" height="20rem" />
        </div>
      </div>
    </div>
  );
}
