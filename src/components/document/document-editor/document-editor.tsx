'use client';

import { useState, useCallback } from 'react';
import { MarkdownEditor } from '../markdown-editor/markdown-editor';
import { MarkdownPreview } from '../markdown-preview/markdown-preview';
import { SaveIndicator } from '../save-indicator/save-indicator';
import { useDocumentAutoSave } from './use-document-autosave';
import { useLocalBackup } from './use-local-backup';
import styles from './document-editor.module.scss';

/**
 * Editor view mode.
 */
export type EditorViewMode = 'editor' | 'preview' | 'split';

/**
 * Props for the DocumentEditor component.
 */
export interface DocumentEditorProps {
  /** Unique document identifier */
  documentId: string;
  /** Initial document content */
  initialContent: string;
  /** Initial document version for optimistic concurrency */
  initialVersion: number;
  /** Save function that returns the new version */
  onSave: (content: string, version: number) => Promise<{ version: number }>;
  /** Callback for version conflicts */
  onConflict?: () => void;
  /** Document type label (e.g., "Script", "Description") */
  documentType?: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Auto-save debounce delay in milliseconds */
  debounceMs?: number;
}

/**
 * DocumentEditor Component
 *
 * A complete document editing solution with:
 * - CodeMirror markdown editor
 * - Live markdown preview
 * - Auto-save with debounce
 * - Local storage backup
 * - Save status indicator
 * - Version conflict detection
 * - Keyboard shortcuts (Cmd+S)
 * - Character/word count
 *
 * @example
 * ```tsx
 * <DocumentEditor
 *   documentId="video-123-script"
 *   initialContent="# Video Script"
 *   initialVersion={1}
 *   onSave={async (content, version) => {
 *     const result = await saveDocument({ content, version });
 *     return { version: result.version };
 *   }}
 *   documentType="Script"
 * />
 * ```
 */
export function DocumentEditor({
  documentId,
  initialContent,
  initialVersion,
  onSave,
  onConflict,
  documentType = 'Document',
  readOnly = false,
  debounceMs = 2000,
}: DocumentEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [viewMode, setViewMode] = useState<EditorViewMode>('split');

  // Auto-save hook
  const { status, lastSaved, handleContentChange, forceSave, version } =
    useDocumentAutoSave({
      debounceMs,
      initialVersion,
      onSave: async (newContent, currentVersion) => {
        const result = await onSave(newContent, currentVersion);
        // Clear backup on successful save
        clearBackup();
        return result;
      },
      onConflict,
    });

  // Local backup hook
  const { hasBackup, saveBackup, restoreBackup, clearBackup, dismissBackup } =
    useLocalBackup({
      documentId,
      initialContent,
      onRestore: (restoredContent) => {
        setContent(restoredContent);
        handleContentChange(restoredContent);
      },
    });

  // Calculate character and word count
  const charCount = content.length;
  const wordCount =
    content.trim() === '' ? 0 : content.trim().split(/\s+/).length;

  /**
   * Handle content changes from the editor.
   */
  const handleEditorChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      handleContentChange(newContent);
      saveBackup(newContent);
    },
    [handleContentChange, saveBackup]
  );

  /**
   * Handle manual save (Cmd+S).
   */
  const handleManualSave = useCallback(async () => {
    await forceSave(content);
  }, [forceSave, content]);

  /**
   * Handle view mode toggle.
   */
  const handleViewModeChange = useCallback((mode: EditorViewMode) => {
    setViewMode(mode);
  }, []);

  return (
    <div className={styles.container}>
      {/* Backup Recovery Banner */}
      {hasBackup && (
        <div className={styles.backupBanner} role="alert">
          <div className={styles.backupMessage}>
            <strong>Unsaved changes detected</strong>
            <p>
              We found a local backup of this {documentType.toLowerCase()} from
              your last session.
            </p>
          </div>
          <div className={styles.backupActions}>
            <button
              type="button"
              className={styles.restoreButton}
              onClick={restoreBackup}
            >
              Restore
            </button>
            <button
              type="button"
              className={styles.dismissButton}
              onClick={dismissBackup}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h2 className={styles.documentType}>{documentType}</h2>
        </div>

        <div className={styles.toolbarCenter}>
          <div
            className={styles.viewModeToggle}
            role="group"
            aria-label="View mode"
          >
            <button
              type="button"
              className={viewMode === 'editor' ? styles.active : ''}
              onClick={() => handleViewModeChange('editor')}
              aria-pressed={viewMode === 'editor'}
            >
              Editor
            </button>
            <button
              type="button"
              className={viewMode === 'split' ? styles.active : ''}
              onClick={() => handleViewModeChange('split')}
              aria-pressed={viewMode === 'split'}
            >
              Split
            </button>
            <button
              type="button"
              className={viewMode === 'preview' ? styles.active : ''}
              onClick={() => handleViewModeChange('preview')}
              aria-pressed={viewMode === 'preview'}
            >
              Preview
            </button>
          </div>
        </div>

        <div className={styles.toolbarRight}>
          <SaveIndicator status={status} lastSaved={lastSaved} />
        </div>
      </div>

      {/* Editor and Preview */}
      <div className={`${styles.editorArea} ${styles[viewMode]}`}>
        {(viewMode === 'editor' || viewMode === 'split') && (
          <div className={styles.editorPane}>
            <MarkdownEditor
              initialContent={content}
              onChange={handleEditorChange}
              onSave={handleManualSave}
              readOnly={readOnly}
              placeholder={`Start writing your ${documentType.toLowerCase()}...`}
              ariaLabel={`${documentType} markdown editor`}
              minHeight="500px"
            />
          </div>
        )}

        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={styles.previewPane}>
            <MarkdownPreview
              content={content}
              ariaLabel={`${documentType} preview`}
            />
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className={styles.footer}>
        <div className={styles.stats}>
          <span className={styles.stat}>
            <span className={styles.statLabel}>Characters:</span>
            <span className={styles.statValue}>
              {charCount.toLocaleString()}
            </span>
          </span>
          <span className={styles.stat}>
            <span className={styles.statLabel}>Words:</span>
            <span className={styles.statValue}>
              {wordCount.toLocaleString()}
            </span>
          </span>
          <span className={styles.stat}>
            <span className={styles.statLabel}>Version:</span>
            <span className={styles.statValue}>{version}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

DocumentEditor.displayName = 'DocumentEditor';
