'use client';

import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/date-utils';
import styles from './revision-history-panel.module.scss';

/**
 * Document revision data
 */
export interface DocumentRevision {
  /** Revision ID */
  id: string;
  /** Version number */
  version: number;
  /** Created timestamp */
  createdAt: Date | string;
  /** User who created this revision (optional) */
  createdBy?: string | null;
  /** Content preview (first 100 chars) */
  contentPreview?: string;
}

/**
 * RevisionHistoryPanel component props
 */
export interface RevisionHistoryPanelProps {
  /** List of revisions to display */
  revisions: DocumentRevision[];
  /** Current version number */
  currentVersion: number;
  /** Callback when a revision is selected for viewing */
  onViewRevision: (revisionId: string) => void;
  /** Callback when a revision is selected for restore */
  onRestoreRevision: (revisionId: string) => void;
  /** Whether restore action is in progress */
  isRestoring?: boolean;
  /** Whether the panel is in loading state */
  isLoading?: boolean;
  /** ID of the revision being restored */
  restoringRevisionId?: string;
}

/**
 * RevisionHistoryPanel Component
 *
 * Displays a list of document revisions with options to view and restore.
 * Revisions are displayed in descending order (newest first).
 *
 * @see /docs/adrs/009-versioning-and-audit.md
 */
export function RevisionHistoryPanel({
  revisions,
  currentVersion,
  onViewRevision,
  onRestoreRevision,
  isRestoring = false,
  isLoading = false,
  restoringRevisionId,
}: RevisionHistoryPanelProps) {
  if (isLoading) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <h3 className={styles.title}>Version History</h3>
        </div>
        <div className={styles.loading}>
          <p>Loading revision history...</p>
        </div>
      </div>
    );
  }

  if (revisions.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <h3 className={styles.title}>Version History</h3>
        </div>
        <div className={styles.empty}>
          <p>No revision history yet.</p>
          <p className={styles.emptyHint}>
            Revisions are created automatically when you save changes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Version History</h3>
        <p className={styles.subtitle}>
          {revisions.length} {revisions.length === 1 ? 'revision' : 'revisions'}
        </p>
      </div>

      <ul className={styles.list} role="list">
        {revisions.map((revision) => {
          const isCurrentVersion = revision.version === currentVersion;
          const isBeingRestored =
            isRestoring && restoringRevisionId === revision.id;

          return (
            <li key={revision.id} className={styles.item}>
              <div className={styles.itemHeader}>
                <div className={styles.versionInfo}>
                  <div className={styles.versionBadge}>
                    v{revision.version}
                    {isCurrentVersion && (
                      <span className={styles.currentLabel}>Current</span>
                    )}
                  </div>
                  <time
                    className={styles.timestamp}
                    dateTime={
                      typeof revision.createdAt === 'string'
                        ? revision.createdAt
                        : revision.createdAt.toISOString()
                    }
                  >
                    {formatRelativeTime(revision.createdAt)}
                  </time>
                </div>
              </div>

              {revision.createdBy && (
                <p className={styles.author}>by {revision.createdBy}</p>
              )}

              {revision.contentPreview && (
                <p className={styles.preview}>{revision.contentPreview}...</p>
              )}

              <div className={styles.actions}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewRevision(revision.id)}
                  disabled={isRestoring}
                  type="button"
                  aria-label={`View version ${revision.version} content`}
                >
                  View
                </Button>
                {!isCurrentVersion && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRestoreRevision(revision.id)}
                    disabled={isRestoring}
                    isLoading={isBeingRestored}
                    type="button"
                  >
                    {isBeingRestored ? 'Restoring...' : 'Restore'}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

RevisionHistoryPanel.displayName = 'RevisionHistoryPanel';
