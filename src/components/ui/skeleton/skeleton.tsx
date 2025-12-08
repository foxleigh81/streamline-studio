import styles from './skeleton.module.scss';

/**
 * Skeleton component props
 */
export interface SkeletonProps {
  /** Width of the skeleton (CSS value or preset) */
  width?: string | number;
  /** Height of the skeleton (CSS value or preset) */
  height?: string | number;
  /** Shape variant */
  variant?: 'text' | 'rectangular' | 'circular';
  /** Optional className for custom styling */
  className?: string;
}

/**
 * Skeleton Component
 *
 * A loading placeholder component that shows a shimmer animation.
 * Used to indicate content is loading.
 *
 * @example
 * ```tsx
 * <Skeleton width="100%" height="2rem" variant="text" />
 * <Skeleton width="4rem" height="4rem" variant="circular" />
 * ```
 */
export function Skeleton({
  width = '100%',
  height = '1rem',
  variant = 'rectangular',
  className,
}: SkeletonProps) {
  const variantClass = styles[variant] ?? styles.rectangular;
  const skeletonClasses = [styles.skeleton, variantClass, className]
    .filter(Boolean)
    .join(' ');

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={skeletonClasses}
      style={style}
      aria-busy="true"
      aria-label="Loading"
    />
  );
}

Skeleton.displayName = 'Skeleton';
