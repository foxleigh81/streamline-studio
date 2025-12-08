'use client';

import styles from './skip-link.module.scss';

/**
 * Skip link component props
 */
export interface SkipLinkProps {
  /** Target element ID to skip to */
  targetId?: string;
  /** Label text for the skip link */
  label?: string;
  /** Optional className for custom styling */
  className?: string;
}

/**
 * SkipLink Component
 *
 * A "skip to main content" link that's hidden until focused.
 * Improves keyboard navigation accessibility by allowing users
 * to bypass repetitive navigation elements.
 *
 * @example
 * ```tsx
 * <SkipLink targetId="main-content" label="Skip to main content" />
 * ```
 */
export function SkipLink({
  targetId = 'main-content',
  label = 'Skip to main content',
  className,
}: SkipLinkProps) {
  const linkClasses = [styles.skipLink, className].filter(Boolean).join(' ');

  return (
    <a href={`#${targetId}`} className={linkClasses}>
      {label}
    </a>
  );
}

SkipLink.displayName = 'SkipLink';
