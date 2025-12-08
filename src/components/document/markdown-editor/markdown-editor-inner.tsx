'use client';

import { useEffect, useRef, useCallback } from 'react';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from '@codemirror/language';
import { history, historyKeymap } from '@codemirror/commands';
import styles from './markdown-editor.module.scss';

/**
 * Props for the MarkdownEditorInner component.
 */
export interface MarkdownEditorInnerProps {
  /** Initial content for the editor */
  initialContent: string;
  /** Callback fired when content changes */
  onChange?: (content: string) => void;
  /** Callback fired when Cmd+S or Ctrl+S is pressed */
  onSave?: () => void;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Placeholder text when editor is empty */
  placeholder?: string;
  /** Accessibility label for the editor */
  ariaLabel?: string;
  /** Minimum height of the editor */
  minHeight?: string;
}

/**
 * Creates CodeMirror theme that integrates with our CSS Module system.
 * Uses CSS custom properties from the application theme.
 */
function createEditorTheme(minHeight = '300px'): Extension {
  return EditorView.theme({
    '&': {
      backgroundColor: 'var(--color-background)',
      color: 'var(--color-foreground)',
      fontSize: 'var(--font-size-base)',
      minHeight,
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
    },
    '&.cm-focused': {
      outline: '2px solid var(--color-ring)',
      outlineOffset: '2px',
    },
    '.cm-content': {
      fontFamily: 'var(--font-mono)',
      lineHeight: 'var(--line-height-relaxed)',
      padding: 'var(--spacing-4)',
      caretColor: 'var(--color-foreground)',
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--color-foreground)',
      borderLeftWidth: '2px',
    },
    '.cm-selectionBackground': {
      backgroundColor: 'var(--color-accent)',
    },
    '&.cm-focused .cm-selectionBackground': {
      backgroundColor: 'var(--color-accent)',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--color-muted)',
      color: 'var(--color-muted-foreground)',
      borderRight: '1px solid var(--color-border)',
      paddingRight: 'var(--spacing-2)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--color-accent)',
    },
    '.cm-activeLine': {
      backgroundColor: 'transparent',
    },
    '.cm-placeholder': {
      color: 'var(--color-muted-foreground)',
    },
    // Markdown syntax highlighting
    '.cm-heading': {
      fontWeight: 'var(--font-weight-bold)',
      color: 'var(--color-foreground)',
    },
    '.cm-emphasis': {
      fontStyle: 'italic',
    },
    '.cm-strong': {
      fontWeight: 'var(--font-weight-bold)',
    },
    '.cm-link': {
      color: 'var(--color-primary)',
      textDecoration: 'underline',
    },
    '.cm-monospace': {
      fontFamily: 'var(--font-mono)',
      backgroundColor: 'var(--color-muted)',
      padding: '2px 4px',
      borderRadius: 'var(--radius-sm)',
    },
    '.cm-code': {
      backgroundColor: 'var(--color-muted)',
      fontFamily: 'var(--font-mono)',
    },
  });
}

/**
 * Creates the complete set of CodeMirror extensions for markdown editing.
 */
function createEditorExtensions(
  onChange: (content: string) => void,
  onSave: (() => void) | undefined,
  readOnly: boolean,
  placeholder: string,
  minHeight: string
): Extension[] {
  const extensions: Extension[] = [
    // Line numbers
    lineNumbers(),

    // History (undo/redo)
    history(),
    keymap.of(historyKeymap),

    // Markdown language support
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    syntaxHighlighting(defaultHighlightStyle),

    // Line wrapping
    EditorView.lineWrapping,

    // Theme
    createEditorTheme(minHeight),

    // Read-only mode
    EditorView.editable.of(!readOnly),

    // Placeholder
    placeholder
      ? EditorView.domEventHandlers({
          focus() {
            // Placeholder is handled by CSS
          },
        })
      : [],

    // Change handler
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString());
      }
    }),
  ];

  // Add save keyboard shortcut
  if (onSave) {
    extensions.push(
      keymap.of([
        {
          key: 'Mod-s',
          run: () => {
            onSave();
            return true;
          },
        },
        {
          key: 'Escape',
          run: (view) => {
            view.contentDOM.blur();
            return true;
          },
        },
      ])
    );
  }

  return extensions;
}

/**
 * MarkdownEditorInner Component
 *
 * The actual CodeMirror 6 markdown editor implementation.
 * This component should be lazy-loaded using next/dynamic.
 *
 * Features:
 * - Markdown syntax highlighting
 * - Line numbers
 * - Keyboard shortcuts (Cmd+S for save, Escape to blur)
 * - Accessible with ARIA labels
 * - Theme integration with CSS custom properties
 *
 * @example
 * ```tsx
 * const Editor = dynamic(() => import('./markdown-editor-inner'), {
 *   ssr: false,
 *   loading: () => <EditorSkeleton />,
 * });
 *
 * <Editor
 *   initialContent="# Hello World"
 *   onChange={(content) => console.log(content)}
 *   onSave={() => console.log('Save triggered')}
 *   ariaLabel="Markdown editor for video script"
 * />
 * ```
 */
export function MarkdownEditorInner({
  initialContent,
  onChange = () => {},
  onSave,
  readOnly = false,
  placeholder = 'Start typing...',
  ariaLabel = 'Markdown editor',
  minHeight = '300px',
}: MarkdownEditorInnerProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Memoized onChange callback to prevent unnecessary re-renders
  const handleChange = useCallback(
    (content: string) => {
      onChange(content);
    },
    [onChange]
  );

  // Initialize CodeMirror editor
  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: initialContent,
      extensions: createEditorExtensions(
        handleChange,
        onSave,
        readOnly,
        placeholder,
        minHeight
      ),
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    // Set ARIA label on the editor
    view.contentDOM.setAttribute('role', 'textbox');
    view.contentDOM.setAttribute('aria-label', ariaLabel);
    view.contentDOM.setAttribute('aria-multiline', 'true');

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [
    initialContent,
    handleChange,
    onSave,
    readOnly,
    placeholder,
    ariaLabel,
    minHeight,
  ]);

  return <div ref={editorRef} className={styles.editorContainer} />;
}

MarkdownEditorInner.displayName = 'MarkdownEditorInner';
