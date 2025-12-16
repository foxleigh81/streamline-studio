import Link from 'next/link';
import styles from './breadcrumb.module.scss';

/**
 * Single breadcrumb item
 */
export interface BreadcrumbItem {
  /** Display label for the breadcrumb */
  label: string;
  /** URL to navigate to (undefined for current page) */
  href?: string;
}

/**
 * Breadcrumb component props
 */
export interface BreadcrumbProps {
  /** Array of breadcrumb items */
  items: BreadcrumbItem[];
  /** Optional className for custom styling */
  className?: string;
}

/**
 * Breadcrumb Component
 *
 * Displays the current navigation path with links to parent pages.
 * The last item represents the current page and is not clickable.
 * Uses semantic HTML and proper ARIA attributes for accessibility.
 *
 * @example
 * ```tsx
 * <Breadcrumb
 *   items={[
 *     { label: 'Home', href: '/' },
 *     { label: 'My Team', href: '/t/my-team' },
 *     { label: 'Videos', href: '/t/my-team/my-project/videos' },
 *     { label: 'Current Video' }
 *   ]}
 * />
 * ```
 */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (items.length === 0) return null;

  const containerClasses = [styles.breadcrumb, className]
    .filter(Boolean)
    .join(' ');

  return (
    <nav aria-label="Breadcrumb" className={containerClasses}>
      <ol className={styles.list}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const hasHref = item.href !== undefined;

          return (
            <li key={`${item.label}-${index}`} className={styles.item}>
              {hasHref && !isLast ? (
                <Link href={item.href!} className={styles.link}>
                  {item.label}
                </Link>
              ) : (
                <span
                  className={styles.current}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span className={styles.separator} aria-hidden="true">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

Breadcrumb.displayName = 'Breadcrumb';
