'use client';

import { useState, useCallback } from 'react';
import { MarkdownEditor } from '../markdown-editor/markdown-editor';
import { MarkdownPreview } from '../markdown-preview/markdown-preview';
import { SaveIndicator } from '../save-indicator/save-indicator';
import { ConflictResolutionModal } from '../conflict-resolution-modal/conflict-resolution-modal';
import { useDocumentAutoSave } from './use-document-autosave';
import { useLocalBackup } from './use-local-backup';
import { formatRelativeTime } from '@/lib/date-utils';
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
  /** Function to reload document from server */
  onReloadDocument: () => Promise<{ content: string; version: number }>;
  /** Optional: Function to export document */
  onExport?: () => Promise<void>;
  /** Optional: Function to import document */
  onImport?: (file: File) => Promise<void>;
  /** Optional: Whether import/export features are enabled */
  enableImportExport?: boolean;
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
  onReloadDocument,
  onExport,
  onImport,
  enableImportExport = false,
  documentType = 'Document',
  readOnly = false,
  debounceMs = 2000,
}: DocumentEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [viewMode, setViewMode] = useState<EditorViewMode>('split');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Auto-save hook
  const {
    status,
    lastSaved,
    handleContentChange,
    forceSave,
    version,
    conflictError,
    clearConflict,
    setVersion,
  } = useDocumentAutoSave({
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
  const {
    hasBackup,
    backupTimestamp,
    saveBackup,
    restoreBackup,
    clearBackup,
    dismissBackup,
  } = useLocalBackup({
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

  /**
   * Handle reload from server (discard local changes).
   */
  const handleReloadFromServer = useCallback(async () => {
    const { content: serverContent, version: serverVersion } =
      await onReloadDocument();
    setContent(serverContent);
    setVersion(serverVersion);
    handleContentChange(serverContent);
    clearBackup();
    clearConflict();
  }, [
    onReloadDocument,
    setVersion,
    handleContentChange,
    clearBackup,
    clearConflict,
  ]);

  /**
   * Handle force save (save local changes over server version).
   */
  const handleForceSave = useCallback(async () => {
    // First, fetch the latest version to get the correct version number
    const { version: latestVersion } = await onReloadDocument();

    // Now save with the latest version
    await onSave(content, latestVersion);

    // Update local version
    setVersion(latestVersion + 1);
    clearBackup();
    clearConflict();
  }, [
    onReloadDocument,
    onSave,
    content,
    setVersion,
    clearBackup,
    clearConflict,
  ]);

  /**
   * Handle export button click.
   */
  const handleExport = useCallback(async () => {
    if (!onExport) return;
    setIsExporting(true);
    try {
      await onExport();
    } finally {
      setIsExporting(false);
    }
  }, [onExport]);

  /**
   * Handle import button click (trigger file input).
   */
  const handleImportClick = useCallback(() => {
    const input = document.getElementById(
      'document-import-input'
    ) as HTMLInputElement;
    input?.click();
  }, []);

  /**
   * Handle file selection for import.
   */
  const handleImportFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !onImport) return;

      setIsImporting(true);
      try {
        await onImport(file);
        // Reload document after import
        const { content: newContent, version: newVersion } =
          await onReloadDocument();
        setContent(newContent);
        setVersion(newVersion);
        handleContentChange(newContent);
        clearBackup();
      } finally {
        setIsImporting(false);
        // Reset file input
        event.target.value = '';
      }
    },
    [onImport, onReloadDocument, setVersion, handleContentChange, clearBackup]
  );

  return (
    <div className={styles.container}>
      {/* Backup Recovery Banner */}
      {hasBackup && (
        <div className={styles.backupBanner} role="alert">
          <div className={styles.backupMessage}>
            <strong>Unsaved changes detected</strong>
            <p>
              We found a local backup of this {documentType.toLowerCase()}
              {backupTimestamp && (
                <>
                  {' '}
                  from{' '}
                  <time dateTime={backupTimestamp.toISOString()}>
                    {formatRelativeTime(backupTimestamp)}
                  </time>
                </>
              )}
              .
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
              title="Backup stays available if you change your mind"
            >
              Dismiss (backup stays available)
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h2 className={styles.documentType}>{documentType}</h2>
          {enableImportExport && !readOnly && (
            <div className={styles.importExportActions}>
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={handleImportClick}
                disabled={isImporting}
                aria-label="Import document from file"
                title="Import Markdown (.md) or text (.txt) file"
              >
                {isImporting ? 'Importing...' : 'Import'}
              </button>
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={handleExport}
                disabled={isExporting}
                aria-label="Export document to file"
              >
                {isExporting ? 'Exporting...' : 'Export'}
              </button>
              <input
                id="document-import-input"
                type="file"
                accept=".md,.txt"
                onChange={handleImportFile}
                style={{ display: 'none' }}
                aria-hidden="true"
              />
            </div>
          )}
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
          <SaveIndicator
            status={status}
            lastSaved={lastSaved}
            onRetry={() => forceSave(content)}
          />
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

      {/* Conflict Resolution Modal */}
      {conflictError && (
        <ConflictResolutionModal
          isOpen={!!conflictError}
          onClose={clearConflict}
          onReload={handleReloadFromServer}
          onForceSave={handleForceSave}
          currentVersion={conflictError.currentVersion}
          expectedVersion={conflictError.expectedVersion}
          serverContentPreview={conflictError.currentContent}
        />
      )}
    </div>
  );
}

DocumentEditor.displayName = 'DocumentEditor';
