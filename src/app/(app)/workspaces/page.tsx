'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import styles from './workspaces-page.module.scss';

/**
 * Workspaces Selector Page
 *
 * Displays all workspaces the user has access to in a grid layout.
 * Allows navigation to any workspace and creating new workspaces (multi-tenant mode).
 */
export default function WorkspacesPage() {
  // Fetch all workspaces
  const { data: workspaces = [], isLoading } = trpc.workspace.list.useQuery();

  /**
   * Format the join date
   */
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Your Workspaces</h1>
          <p className={styles.subtitle}>
            Select a workspace to continue or create a new one
          </p>
        </div>
        {/* Note: Create button would be shown here if multi-tenant mode is enabled */}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className={styles.loading}>
          <div className={styles.spinner} aria-label="Loading workspaces" />
          <p>Loading your workspaces...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && workspaces.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden="true">
            🏢
          </div>
          <h2 className={styles.emptyTitle}>No workspaces yet</h2>
          <p className={styles.emptyDescription}>
            You don&apos;t have access to any workspaces yet. Contact your
            administrator or accept an invitation.
          </p>
        </div>
      )}

      {/* Workspace Grid */}
      {!isLoading && workspaces.length > 0 && (
        <div className={styles.grid}>
          {workspaces.map((workspace) => (
            <Link
              key={workspace.id}
              href={`/w/${workspace.slug}/videos`}
              className={styles.card}
            >
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{workspace.name}</h3>
                <span className={styles.roleBadge}>{workspace.role}</span>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.cardMeta}>
                  <span className={styles.cardMetaLabel}>Joined:</span>
                  <span className={styles.cardMetaValue}>
                    {formatDate(workspace.joinedAt)}
                  </span>
                </div>
              </div>
              <div className={styles.cardFooter}>
                <span className={styles.cardLink}>Open workspace →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
