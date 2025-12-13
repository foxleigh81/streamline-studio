import { Skeleton } from '@/components/ui/skeleton';
import styles from './categories-page.module.scss';

/**
 * Categories Page Loading State
 *
 * Skeleton loader displayed while category data is being fetched.
 * Matches the layout of the actual categories page.
 */
export default function CategoriesLoading() {
  return (
    <div className={styles.container}>
      <span className="sr-only">Loading categories...</span>

      {/* Header skeleton */}
      <div className={styles.header}>
        <div>
          <Skeleton width="10rem" height="2rem" />
          <Skeleton width="24rem" height="1.25rem" />
        </div>
        <Skeleton width="12rem" height="2.5rem" />
      </div>

      {/* Categories list skeleton */}
      <div className={styles.categoriesList}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className={styles.categoryCardSkeleton}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {/* Color indicator skeleton */}
              <Skeleton width="2rem" height="2rem" variant="circular" />

              {/* Category info skeleton */}
              <div style={{ flex: 1 }}>
                <Skeleton width="12rem" height="1.5rem" />
                <div style={{ marginTop: '0.5rem' }}>
                  <Skeleton width="20rem" height="1rem" />
                </div>
              </div>

              {/* Actions skeleton */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Skeleton width="4rem" height="2rem" />
                <Skeleton width="4rem" height="2rem" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
