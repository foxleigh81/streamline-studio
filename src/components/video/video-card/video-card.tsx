'use client';

import { type MouseEvent } from 'react';
import Link from 'next/link';
import type { VideoStatus } from '@/server/db/schema';
import styles from './video-card.module.scss';

/**
 * Video card component props
 */
export interface VideoCardProps {
  /** Video ID */
  id: string;
  /** Workspace slug for navigation */
  workspaceSlug: string;
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
}

/**
 * Status badge color mapping
 */
const statusColors: Record<VideoStatus, string> = {
  idea: '#6B7280', // Gray
  scripting: '#3B82F6', // Blue
  filming: '#8B5CF6', // Purple
  editing: '#F59E0B', // Amber
  review: '#EC4899', // Pink
  scheduled: '#14B8A6', // Teal
  published: '#22C55E', // Green
  archived: '#6B7280', // Gray
};

/**
 * Status display labels
 */
const statusLabels: Record<VideoStatus, string> = {
  idea: 'Idea',
  scripting: 'Scripting',
  filming: 'Filming',
  editing: 'Editing',
  review: 'Review',
  scheduled: 'Scheduled',
  published: 'Published',
  archived: 'Archived',
};

/**
 * VideoCard Component
 *
 * Displays a video project card with title, status, due date, and categories.
 * Clicking the card navigates to the video detail page.
 */
export function VideoCard({
  id,
  workspaceSlug,
  title,
  status,
  dueDate,
  description,
  categories = [],
  onClick,
  className,
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

  return (
    <Link
      href={`/w/${workspaceSlug}/videos/${id}`}
      className={cardClasses}
      onClick={handleClick}
      aria-label={`View video: ${title}`}
    >
      {/* Header with status badge */}
      <div className={styles.header}>
        <span
          className={styles.statusBadge}
          style={{ backgroundColor: statusColors[status] }}
          aria-label={`Status: ${statusLabels[status]}`}
        >
          {statusLabels[status]}
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
