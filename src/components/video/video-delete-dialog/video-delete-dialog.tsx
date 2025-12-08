'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import styles from './video-delete-dialog.module.scss';

/**
 * VideoDeleteDialog component props
 */
export interface VideoDeleteDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when the dialog should close */
  onClose: () => void;
  /** Callback when delete is confirmed */
  onConfirm: () => void | Promise<void>;
  /** Video title to display in confirmation message */
  videoTitle: string;
  /** Whether the delete action is in progress */
  isDeleting?: boolean;
}

/**
 * VideoDeleteDialog Component
 *
 * Confirmation dialog for deleting a video.
 * Uses Radix UI Dialog for accessibility and focus management.
 */
export function VideoDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  videoTitle,
  isDeleting = false,
}: VideoDeleteDialogProps) {
  const [internalIsDeleting, setInternalIsDeleting] = useState(false);

  /**
   * Handle confirm button click
   */
  const handleConfirm = async () => {
    setInternalIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setInternalIsDeleting(false);
    }
  };

  const isProcessing = isDeleting || internalIsDeleting;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.content}
          aria-describedby="dialog-description"
        >
          <Dialog.Title className={styles.title}>Delete Video</Dialog.Title>

          <Dialog.Description
            id="dialog-description"
            className={styles.description}
          >
            Are you sure you want to delete <strong>{videoTitle}</strong>? This
            action cannot be undone. All associated documents will also be
            deleted.
          </Dialog.Description>

          <div className={styles.actions}>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
              type="button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              isLoading={isProcessing}
              disabled={isProcessing}
              type="button"
            >
              {isProcessing ? 'Deleting...' : 'Delete'}
            </Button>
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

VideoDeleteDialog.displayName = 'VideoDeleteDialog';
