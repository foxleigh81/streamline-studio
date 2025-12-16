import { Skeleton } from '@/components/ui/skeleton';
import styles from './videos-page.module.scss';

/**
 * Videos Page Loading State
 *
 * Skeleton loader displayed while video data is being fetched.
 * Matches the layout of the actual videos page.
 */
export default function VideosLoading() {
  return (
    <div className={styles.container}>
      <span className="sr-only">Loading videos...</span>

      {/* Header skeleton */}
      <div className={styles.header}>
        <div>
          <Skeleton width="8rem" height="2rem" />
          <Skeleton width="20rem" height="1.25rem" />
        </div>
        <Skeleton width="10rem" height="2.5rem" />
      </div>

      {/* Video grid skeleton */}
      <div className={styles.videoGrid}>
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className={styles.videoCardSkeleton}>
            {/* Thumbnail skeleton */}
            <Skeleton width="100%" height="12rem" />

            {/* Content skeleton */}
            <div style={{ padding: '1rem' }}>
              <Skeleton width="80%" height="1.5rem" />
              <div style={{ marginTop: '0.5rem' }}>
                <Skeleton width="100%" height="1rem" />
              </div>
              <div style={{ marginTop: '0.25rem' }}>
                <Skeleton width="90%" height="1rem" />
              </div>

              {/* Meta info skeleton */}
              <div
                style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}
              >
                <Skeleton width="4rem" height="1.5rem" />
                <Skeleton width="6rem" height="1.5rem" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
