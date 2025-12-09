'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Button } from '@/components/ui/button';
import { MarkdownPreview } from '@/components/document/markdown-preview';
import { formatRelativeTime } from '@/lib/date-utils';
import styles from './revision-viewer.module.scss';

/**
 * RevisionViewer component props
 */
export interface RevisionViewerProps {
  /** Whether the viewer is open */
  isOpen: boolean;
  /** Callback when the viewer should close */
  onClose: () => void;
  /** Callback to restore this revision */
  onRestore?: () => void | Promise<void>;
  /** Version number */
  version: number;
  /** Revision content (markdown) */
  content: string;
  /** Created timestamp */
  createdAt: Date | string;
  /** User who created this revision */
  createdBy?: string | null;
  /** Whether this is the current version */
  isCurrentVersion?: boolean;
  /** Whether restore action is in progress */
  isRestoring?: boolean;
}

/**
 * RevisionViewer Component
 *
 * Read-only modal viewer for displaying a specific document revision.
 * Users can view the full content and optionally restore the revision.
 *
 * @see /docs/adrs/009-versioning-and-audit.md
 */
export function RevisionViewer({
  isOpen,
  onClose,
  onRestore,
  version,
  content,
  createdAt,
  createdBy,
  isCurrentVersion = false,
  isRestoring = false,
}: RevisionViewerProps) {
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);

  /**
   * Handle restore button click - show confirmation
   */
  const handleRestoreClick = () => {
    setShowConfirmRestore(true);
  };

  /**
   * Confirm and execute restore
   */
  const handleConfirmRestore = async () => {
    if (onRestore) {
      await onRestore();
    }
    setShowConfirmRestore(false);
  };

  /**
   * Cancel restore
   */
  const handleCancelRestore = () => {
    setShowConfirmRestore(false);
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => !open && !isRestoring && onClose()}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.content}
          aria-describedby="revision-viewer-description"
        >
          <div className={styles.header}>
            <div className={styles.headerMain}>
              <Dialog.Title className={styles.title}>
                Revision v{version}
                {isCurrentVersion && (
                  <span className={styles.currentBadge}>Current</span>
                )}
              </Dialog.Title>
              <Dialog.Description
                id="revision-viewer-description"
                className={styles.metadata}
              >
                <time
                  className={styles.timestamp}
                  dateTime={
                    typeof createdAt === 'string'
                      ? createdAt
                      : createdAt.toISOString()
                  }
                >
                  {formatRelativeTime(createdAt)}
                </time>
                {createdBy && (
                  <>
                    <span className={styles.separator}>•</span>
                    <span className={styles.author}>by {createdBy}</span>
                  </>
                )}
              </Dialog.Description>
            </div>

            <div className={styles.headerActions}>
              {!isCurrentVersion && onRestore && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRestoreClick}
                  isLoading={isRestoring}
                  disabled={isRestoring}
                  type="button"
                >
                  {isRestoring ? 'Restoring...' : 'Restore This Version'}
                </Button>
              )}
              <Dialog.Close asChild>
                <button
                  className={styles.closeButton}
                  aria-label="Close"
                  disabled={isRestoring}
                  type="button"
                >
                  ×
                </button>
              </Dialog.Close>
            </div>
          </div>

          <div className={styles.body}>
            <div className={styles.notice} role="status" aria-live="polite">
              This is a read-only view of version {version}.
              {!isCurrentVersion &&
                ' To edit this content, restore it as the current version.'}
            </div>

            <div className={styles.contentWrapper}>
              <MarkdownPreview content={content} />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      {/* Restore Confirmation Dialog */}
      <AlertDialog.Root
        open={showConfirmRestore}
        onOpenChange={setShowConfirmRestore}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className={styles.alertOverlay} />
          <AlertDialog.Content className={styles.alertContent}>
            <AlertDialog.Title className={styles.alertTitle}>
              Restore This Revision?
            </AlertDialog.Title>
            <AlertDialog.Description className={styles.alertDescription}>
              This will create a new version based on revision v{version}. The
              current document content will be replaced, but all existing
              versions will be preserved in the revision history.
              <br />
              <br />
              <strong>Note:</strong> This does not rewrite history. It creates a
              new version at the end of the timeline.
            </AlertDialog.Description>
            <div className={styles.alertActions}>
              <AlertDialog.Cancel asChild>
                <Button
                  variant="outline"
                  onClick={handleCancelRestore}
                  disabled={isRestoring}
                  type="button"
                >
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  variant="primary"
                  onClick={handleConfirmRestore}
                  isLoading={isRestoring}
                  disabled={isRestoring}
                  type="button"
                >
                  {isRestoring ? 'Restoring...' : 'Restore Revision'}
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </Dialog.Root>
  );
}

RevisionViewer.displayName = 'RevisionViewer';
