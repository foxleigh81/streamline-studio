'use client';

import { type MouseEvent } from 'react';
import Link from 'next/link';
import type { VideoStatus } from '@/server/db/schema';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants/status';
import styles from './video-card.module.scss';

/**
 * Video card component props
 */
export interface VideoCardProps {
  /** Video ID */
  id: string;
  /** Project slug for navigation */
  projectSlug: string;
  /** Video title */
  title: string;
  /** Video status */
  status: VideoStatus;
  /** Due date (ISO string or null) */
  dueDate: string | null;
  /** Video description */
  description?: string | null;
  /** Category objects with id, name, and color */
  categories?: Array<{ id: string; name: string; color: string }>;
  /** Optional click handler (overrides navigation) */
  onClick?: (id: string) => void;
  /** Optional className for custom styling */
  className?: string;
  /** Optional teamspace slug (only for multi-tenant mode) */
  teamspaceSlug?: string;
}

/**
 * VideoCard Component
 *
 * Displays a video project card with title, status, due date, and categories.
 * Clicking the card navigates to the video detail page.
 */
export function VideoCard({
  id,
  projectSlug,
  title,
  status,
  dueDate,
  description,
  categories = [],
  onClick,
  className,
  teamspaceSlug,
}: VideoCardProps) {
  /**
   * Format due date for display
   */
  const formatDueDate = (date: string | null): string | null => {
    if (!date) return null;
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  /**
   * Handle card click
   */
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      e.preventDefault();
      onClick(id);
    }
  };

  const cardClasses = [styles.card, className].filter(Boolean).join(' ');
  const formattedDueDate = formatDueDate(dueDate);

  const effectiveTeamspace = teamspaceSlug ?? 'workspace';

  return (
    <Link
      href={`/t/${effectiveTeamspace}/${projectSlug}/content-plan/${id}`}
      className={cardClasses}
      onClick={handleClick}
      aria-label={`View video: ${title}`}
    >
      {/* Header with status badge */}
      <div className={styles.header}>
        <span
          className={styles.statusBadge}
          style={{ backgroundColor: STATUS_COLORS[status] }}
          aria-label={`Status: ${STATUS_LABELS[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>
        {formattedDueDate && (
          <span
            className={styles.dueDate}
            aria-label={`Due: ${formattedDueDate}`}
          >
            {formattedDueDate}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className={styles.title}>{title}</h3>

      {/* Description (if provided) */}
      {description && <p className={styles.description}>{description}</p>}

      {/* Categories */}
      {categories.length > 0 && (
        <div className={styles.categories} aria-label="Categories">
          {categories.map((category) => (
            <span
              key={category.id}
              className={styles.categoryTag}
              style={{
                backgroundColor: `${category.color}20`,
                color: category.color,
                borderColor: category.color,
              }}
            >
              {category.name}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

VideoCard.displayName = 'VideoCard';
