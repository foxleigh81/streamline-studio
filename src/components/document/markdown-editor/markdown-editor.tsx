'use client';

import dynamic from 'next/dynamic';
import type { MarkdownEditorInnerProps } from './markdown-editor-inner';
import styles from './markdown-editor.module.scss';

/**
 * Loading skeleton displayed while CodeMirror is being loaded.
 */
function EditorSkeleton() {
  return (
    <div className={styles.skeleton} role="status" aria-label="Loading editor">
      <div className={styles.skeletonLine} />
      <div className={styles.skeletonLine} />
      <div className={styles.skeletonLine} />
      <span className={styles.srOnly}>Loading markdown editor...</span>
    </div>
  );
}

/**
 * Lazy-loaded CodeMirror markdown editor.
 * This ensures the CodeMirror bundle is not included in the initial page load.
 */
const MarkdownEditorInner = dynamic(
  () =>
    import('./markdown-editor-inner').then((mod) => ({
      default: mod.MarkdownEditorInner,
    })),
  {
    ssr: false,
    loading: () => <EditorSkeleton />,
  }
);

/**
 * Props for the MarkdownEditor component.
 */
export type MarkdownEditorProps = MarkdownEditorInnerProps;

/**
 * MarkdownEditor Component
 *
 * A lazy-loaded markdown editor built on CodeMirror 6.
 * This component ensures CodeMirror is not included in the initial bundle.
 *
 * Features:
 * - Lazy loading with next/dynamic
 * - Markdown syntax highlighting
 * - Line numbers
 * - Keyboard shortcuts (Cmd+S for save)
 * - Accessible with ARIA labels
 * - Theme integration
 *
 * @example
 * ```tsx
 * <MarkdownEditor
 *   initialContent="# Video Script\n\nStart typing..."
 *   onChange={(content) => setContent(content)}
 *   onSave={() => handleSave()}
 *   ariaLabel="Video script editor"
 * />
 * ```
 */
export function MarkdownEditor(props: MarkdownEditorProps) {
  return <MarkdownEditorInner {...props} />;
}

MarkdownEditor.displayName = 'MarkdownEditor';
