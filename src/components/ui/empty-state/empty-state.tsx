import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import styles from './empty-state.module.scss';

/**
 * Empty state component props
 */
export interface EmptyStateProps {
  /** Icon to display (React element) */
  icon?: ReactNode;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Action button label */
  actionLabel?: string;
  /** Action button click handler */
  onAction?: () => void;
  /** Optional className for custom styling */
  className?: string;
}

/**
 * EmptyState Component
 *
 * Displays a helpful message when there's no content to show.
 * Can include an icon, title, description, and action button.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<VideoIcon />}
 *   title="No videos yet"
 *   description="Create your first video project to get started."
 *   actionLabel="Create Video"
 *   onAction={() => console.log('Create video')}
 * />
 * ```
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const containerClasses = [styles.container, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses} role="status" aria-live="polite">
      {icon && (
        <div className={styles.icon} aria-hidden="true">
          {icon}
        </div>
      )}

      <h3 className={styles.title}>{title}</h3>

      {description && <p className={styles.description}>{description}</p>}

      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction} className={styles.action}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

EmptyState.displayName = 'EmptyState';
