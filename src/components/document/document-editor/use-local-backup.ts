'use client';

import { useEffect, useCallback, useState } from 'react';

/**
 * Configuration for the local backup hook.
 */
export interface LocalBackupConfig {
  /** Unique identifier for the document */
  documentId: string;
  /** Initial content */
  initialContent: string;
  /** Callback when backup is restored */
  onRestore?: (content: string) => void;
}

/**
 * Local backup hook result.
 */
export interface LocalBackupResult {
  /** Whether a backup exists */
  hasBackup: boolean;
  /** The backup content (if any) */
  backupContent: string | null;
  /** Save content to local storage */
  saveBackup: (content: string) => void;
  /** Restore backup content */
  restoreBackup: () => void;
  /** Clear the backup */
  clearBackup: () => void;
  /** Dismiss the backup without restoring */
  dismissBackup: () => void;
}

/**
 * Generates a localStorage key for a document backup.
 *
 * @param documentId - The document ID
 * @returns The localStorage key
 */
function getBackupKey(documentId: string): string {
  return `doc-backup-${documentId}`;
}

/**
 * Custom hook for managing local storage backups of document content.
 *
 * Features:
 * - Save content to localStorage on every change
 * - Detect existing backups on mount
 * - Restore backup content
 * - Clear backup after successful save
 * - Size limit enforcement (500KB)
 *
 * @param config - Backup configuration
 * @returns Backup state and handlers
 *
 * @example
 * ```tsx
 * const {
 *   hasBackup,
 *   backupContent,
 *   saveBackup,
 *   restoreBackup,
 *   clearBackup,
 * } = useLocalBackup({
 *   documentId: 'doc-123',
 *   initialContent: 'Initial content',
 *   onRestore: (content) => setEditorContent(content),
 * });
 *
 * // Show recovery prompt if backup exists
 * {hasBackup && (
 *   <div>
 *     Found unsaved changes. <button onClick={restoreBackup}>Restore</button>
 *   </div>
 * )}
 * ```
 */
export function useLocalBackup({
  documentId,
  initialContent,
  onRestore,
}: LocalBackupConfig): LocalBackupResult {
  const [hasBackup, setHasBackup] = useState(false);
  const [backupContent, setBackupContent] = useState<string | null>(null);

  const backupKey = getBackupKey(documentId);

  /**
   * Check for existing backup on mount.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const backup = localStorage.getItem(backupKey);
      if (backup && backup !== initialContent) {
        setHasBackup(true);
        setBackupContent(backup);
      }
    } catch (error) {
      console.error('Failed to check for backup:', error);
    }
  }, [backupKey, initialContent]);

  /**
   * Save content to localStorage.
   */
  const saveBackup = useCallback(
    (content: string) => {
      if (typeof window === 'undefined') return;

      try {
        // Check size limit (500KB)
        const sizeInBytes = new Blob([content]).size;
        const sizeInKb = sizeInBytes / 1024;

        if (sizeInKb > 500) {
          console.warn('Content exceeds 500KB limit, skipping backup');
          return;
        }

        localStorage.setItem(backupKey, content);
      } catch (error) {
        // localStorage quota exceeded or other error
        console.error('Failed to save backup:', error);
      }
    },
    [backupKey]
  );

  /**
   * Restore backup content.
   */
  const restoreBackup = useCallback(() => {
    if (backupContent) {
      onRestore?.(backupContent);
      setHasBackup(false);
      setBackupContent(null);
    }
  }, [backupContent, onRestore]);

  /**
   * Clear the backup.
   */
  const clearBackup = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(backupKey);
      setHasBackup(false);
      setBackupContent(null);
    } catch (error) {
      console.error('Failed to clear backup:', error);
    }
  }, [backupKey]);

  /**
   * Dismiss the backup without restoring.
   */
  const dismissBackup = useCallback(() => {
    setHasBackup(false);
    setBackupContent(null);
    // Don't clear from localStorage in case user changes their mind
  }, []);

  return {
    hasBackup,
    backupContent,
    saveBackup,
    restoreBackup,
    clearBackup,
    dismissBackup,
  };
}
