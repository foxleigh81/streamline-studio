'use client';

import { useRef, useCallback, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import type { SaveStatus } from '../save-indicator/save-indicator';

/**
 * Configuration for the auto-save hook.
 */
export interface AutoSaveConfig {
  /** Debounce delay in milliseconds (default: 2000) */
  debounceMs?: number;
  /** Save function that returns a Promise */
  onSave: (content: string, version: number) => Promise<{ version: number }>;
  /** Callback for version conflicts */
  onConflict?: () => void;
  /** Initial document version */
  initialVersion: number;
}

/**
 * Auto-save hook result.
 */
export interface AutoSaveResult {
  /** Current save status */
  status: SaveStatus;
  /** Last saved timestamp */
  lastSaved: Date | null;
  /** Current document version */
  version: number;
  /** Trigger content change (debounced save) */
  handleContentChange: (content: string) => void;
  /** Force immediate save */
  forceSave: (content: string) => Promise<void>;
  /** Whether a save is currently pending */
  isPending: boolean;
}

/**
 * Custom hook for auto-saving documents with debounce.
 *
 * Features:
 * - Debounced auto-save (default 2 seconds)
 * - Version conflict detection
 * - Save status tracking
 * - Manual save trigger
 * - Last saved timestamp
 *
 * @param config - Auto-save configuration
 * @returns Auto-save state and handlers
 *
 * @example
 * ```tsx
 * const { status, lastSaved, handleContentChange, forceSave } = useDocumentAutoSave({
 *   debounceMs: 2000,
 *   initialVersion: 1,
 *   onSave: async (content, version) => {
 *     const result = await saveDocument.mutateAsync({ content, version });
 *     return { version: result.version };
 *   },
 *   onConflict: () => {
 *     // Show conflict dialog
 *   },
 * });
 * ```
 */
export function useDocumentAutoSave({
  debounceMs = 2000,
  onSave,
  onConflict,
  initialVersion,
}: AutoSaveConfig): AutoSaveResult {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [version, setVersion] = useState(initialVersion);
  const [isPending, setIsPending] = useState(false);

  const contentRef = useRef<string>('');

  /**
   * Performs the actual save operation.
   */
  const performSave = useCallback(
    async (content: string) => {
      try {
        setStatus('saving');
        setIsPending(true);

        const result = await onSave(content, version);

        setVersion(result.version);
        setStatus('saved');
        setLastSaved(new Date());
      } catch (error) {
        // Check if it's a version conflict error
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 'CONFLICT'
        ) {
          onConflict?.();
        }

        setStatus('failed');
      } finally {
        setIsPending(false);
      }
    },
    [onSave, onConflict, version]
  );

  /**
   * Debounced save function.
   */
  const debouncedSave = useDebouncedCallback(performSave, debounceMs);

  /**
   * Handle content change (triggers debounced save).
   */
  const handleContentChange = useCallback(
    (content: string) => {
      contentRef.current = content;
      debouncedSave(content);
    },
    [debouncedSave]
  );

  /**
   * Force immediate save (bypasses debounce).
   */
  const forceSave = useCallback(
    async (content: string) => {
      // Cancel any pending debounced saves
      debouncedSave.cancel();

      contentRef.current = content;
      await performSave(content);
    },
    [debouncedSave, performSave]
  );

  return {
    status,
    lastSaved,
    version,
    handleContentChange,
    forceSave,
    isPending,
  };
}
