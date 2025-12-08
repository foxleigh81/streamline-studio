import { Skeleton } from './skeleton';
import styles from './video-card-skeleton.module.scss';

/**
 * VideoCardSkeleton Component
 *
 * Loading placeholder for video cards.
 * Matches the structure of the VideoCard component.
 */
export function VideoCardSkeleton() {
  return (
    <div className={styles.card} aria-busy="true" aria-label="Loading video">
      {/* Header with status badge and due date */}
      <div className={styles.header}>
        <Skeleton width="4rem" height="1.5rem" variant="rectangular" />
        <Skeleton width="5rem" height="1rem" variant="text" />
      </div>

      {/* Title */}
      <Skeleton width="80%" height="1.5rem" variant="text" />

      {/* Description */}
      <Skeleton width="100%" height="1rem" variant="text" />
      <Skeleton width="60%" height="1rem" variant="text" />

      {/* Categories */}
      <div className={styles.categories}>
        <Skeleton width="4rem" height="1.5rem" variant="rectangular" />
        <Skeleton width="3.5rem" height="1.5rem" variant="rectangular" />
      </div>
    </div>
  );
}

VideoCardSkeleton.displayName = 'VideoCardSkeleton';
