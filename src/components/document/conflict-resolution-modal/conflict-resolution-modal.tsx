'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import styles from './conflict-resolution-modal.module.scss';

/**
 * ConflictResolutionModal component props
 */
export interface ConflictResolutionModalProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when the dialog should close */
  onClose: () => void;
  /** Callback when user chooses to reload and discard their changes */
  onReload: () => void | Promise<void>;
  /** Callback when user chooses to force save their changes */
  onForceSave: () => void | Promise<void>;
  /** The current version number on the server */
  currentVersion: number;
  /** The version number the user was editing */
  expectedVersion: number;
  /** Optional preview of server content (first 200 chars) */
  serverContentPreview?: string | undefined;
}

/**
 * ConflictResolutionModal Component
 *
 * Modal dialog displayed when a document save fails due to version mismatch.
 * Provides two options:
 * 1. Reload and discard changes - fetches the latest version from server
 * 2. Force save - saves user's changes as a new version
 *
 * @see /docs/adrs/009-versioning-and-audit.md
 */
export function ConflictResolutionModal({
  isOpen,
  onClose,
  onReload,
  onForceSave,
  currentVersion,
  expectedVersion,
  serverContentPreview,
}: ConflictResolutionModalProps) {
  const [isReloading, setIsReloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Handle reload button click
   */
  const handleReload = async () => {
    setIsReloading(true);
    try {
      await onReload();
    } finally {
      setIsReloading(false);
    }
  };

  /**
   * Handle force save button click
   */
  const handleForceSave = async () => {
    setIsSaving(true);
    try {
      await onForceSave();
    } finally {
      setIsSaving(false);
    }
  };

  const isProcessing = isReloading || isSaving;

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => !open && !isProcessing && onClose()}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.content}
          aria-describedby="dialog-description"
        >
          <Dialog.Title className={styles.title}>
            Document Conflict Detected
          </Dialog.Title>

          <Dialog.Description
            id="dialog-description"
            className={styles.description}
          >
            <p>
              This document has been modified by another user or in another tab.
              Your version is based on{' '}
              <strong>your saved version (v{expectedVersion})</strong>, but the
              current version is{' '}
              <strong>the server version (v{currentVersion})</strong>.
            </p>

            {serverContentPreview && (
              <div className={styles.preview}>
                <p className={styles.previewLabel}>Server content preview:</p>
                <div className={styles.previewContent}>
                  {serverContentPreview}
                  {serverContentPreview.length === 200 && '...'}
                </div>
              </div>
            )}

            <p className={styles.warning}>Choose how you want to proceed:</p>
          </Dialog.Description>

          <div className={styles.actions}>
            <Button
              variant="destructive"
              onClick={handleReload}
              isLoading={isReloading}
              disabled={isProcessing}
              type="button"
              className={styles.reloadButton}
              aria-label="Reload document from server and discard your changes"
            >
              <span className={styles.buttonIcon} aria-hidden="true">
                ⚠️
              </span>
              {isReloading ? 'Reloading...' : 'Reload and Discard'}
            </Button>
            <Button
              variant="primary"
              onClick={handleForceSave}
              isLoading={isSaving}
              disabled={isProcessing}
              type="button"
              className={styles.saveButton}
              aria-label="Keep your changes and save them as a new version"
            >
              {isSaving ? 'Saving...' : 'Keep My Changes'}
            </Button>
          </div>

          <div className={styles.outcomes}>
            <div className={styles.outcome}>
              <strong>Reload and Discard:</strong> Your changes will be
              discarded. You&apos;ll get the latest content from the server.
            </div>
            <div className={styles.outcome}>
              <strong>Keep My Changes:</strong> Your changes will be saved as a
              new version. The other user&apos;s changes will be preserved in
              the version history.
            </div>
          </div>

          <Dialog.Close asChild>
            <button
              className={styles.closeButton}
              aria-label="Close"
              disabled={isProcessing}
              type="button"
            >
              ×
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

ConflictResolutionModal.displayName = 'ConflictResolutionModal';
