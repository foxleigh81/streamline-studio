'use client';

import Link from 'next/link';
import { Calendar, User } from 'lucide-react';
import styles from './channel-card.module.scss';

/**
 * Channel Card Component
 *
 * Displays channel information in a card format for the teamspace dashboard.
 * Shows channel name, role, and last updated date.
 *
 * Used on: /t/[teamspace] (teamspace landing page)
 */

export interface ChannelCardProps {
  /** Channel name */
  name: string;
  /** Channel slug (for navigation) */
  slug: string;
  /** User's role in the channel */
  role: 'owner' | 'editor' | 'viewer';
  /** Last updated timestamp */
  updatedAt: Date;
  /** Teamspace slug (for navigation) */
  teamspaceSlug: string;
  /** Optional className for custom styling */
  className?: string;
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return 'Today';
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return `${days} days ago`;
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}

/**
 * Get role badge color class
 */
function getRoleBadgeClass(role: ChannelCardProps['role']): string | undefined {
  switch (role) {
    case 'owner':
      return styles.roleOwner;
    case 'editor':
      return styles.roleEditor;
    case 'viewer':
      return styles.roleViewer;
    default:
      return undefined;
  }
}

/**
 * Channel Card Component
 */
export function ChannelCard({
  name,
  slug,
  role,
  updatedAt,
  teamspaceSlug,
  className,
}: ChannelCardProps) {
  const href = `/t/${teamspaceSlug}/${slug}/content-plan`;

  const roleBadgeClass = getRoleBadgeClass(role);

  return (
    <article className={`${styles.card} ${className ?? ''}`}>
      <Link href={href} className={styles.link}>
        <div className={styles.header}>
          <h3 className={styles.name}>{name}</h3>
          <span className={`${styles.role} ${roleBadgeClass ?? ''}`}>
            <User className={styles.icon} aria-hidden="true" />
            {role}
          </span>
        </div>

        <div className={styles.footer}>
          <span className={styles.updated}>
            <Calendar className={styles.icon} aria-hidden="true" />
            <time dateTime={updatedAt.toISOString()}>
              {formatDate(updatedAt)}
            </time>
          </span>
        </div>
      </Link>
    </article>
  );
}

ChannelCard.displayName = 'ChannelCard';
