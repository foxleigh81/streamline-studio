# ADR-013: Markdown Editor Selection

**Status**: Accepted
**Date**: 2025-12-08
**Deciders**: Strategic Project Planner, Lead Developer, QA Architect

## Context

Streamline Studio requires a markdown editor for content creators to write video scripts, descriptions, and notes. The editor must:

1. **Support markdown syntax** with syntax highlighting
2. **Integrate with CSS Modules** theming system (ADR-002)
3. **Work with React Server Components** (lazy-loaded as Client Component)
4. **Provide acceptable accessibility** for screen reader users
5. **Keep bundle size reasonable** (< 100KB gzipped)
6. **Support auto-save** with debounced updates
7. **Work on mobile browsers** (iOS Safari, Android Chrome)

The editor is a critical component used in Phase 2 for document editing.

## Decision

### Editor: CodeMirror 6

Use **CodeMirror 6** as the markdown editor.

### Key Implementation Requirements

1. **Lazy Loading**: Load via `next/dynamic` with `ssr: false`
2. **Theme Integration**: Bridge CSS custom properties to CodeMirror theme API
3. **Accessibility**: Enable `accessibilityAnnouncements` extension
4. **Auto-Save**: Use `EditorView.updateListener` with 2-second debounce

## Consequences

### Positive

- **Small bundle size**: ~50KB gzipped vs Monaco's 500KB+
- **Accessibility focus**: Designed with screen readers in mind, ARIA support built-in
- **Mobile support**: Works well on touch devices
- **Modularity**: Import only needed extensions
- **Performance**: Efficient virtual rendering for large documents
- **Active development**: Well-maintained by Marijn Haverbeke

### Negative

- **Manual theme setup**: CSS custom properties require bridging to CodeMirror theme
- **Markdown extensions needed**: Core doesn't include markdown-specific features
- **axe-core false positives**: Virtual rendering triggers accessibility scanner warnings
- **Learning curve**: Different API from CodeMirror 5

### Risks

| Risk                        | Likelihood | Impact | Mitigation                                                       |
| --------------------------- | ---------- | ------ | ---------------------------------------------------------------- |
| Screen reader issues        | Medium     | High   | Manual testing with VoiceOver and NVDA before Phase 2 acceptance |
| Theme sync issues           | Low        | Medium | Create dedicated theme bridge utility                            |
| Performance with large docs | Low        | Medium | Document 500KB size limit (ADR-009)                              |

## Alternatives Considered

### Monaco Editor

**Pros:**

- VS Code's editor, extremely feature-rich
- Excellent TypeScript/IntelliSense support
- High contrast themes built-in
- Familiar to developers

**Cons:**

- **Bundle size**: 500KB+ gzipped - unacceptable for this use case
- **Mobile support**: Documented limitations on touch devices
- **Accessibility**: Known issues in GitHub tracker
- **Overkill**: We need markdown editing, not a full IDE

**Verdict**: REJECTED - bundle size alone disqualifies it.

### Tiptap (ProseMirror-based)

**Pros:**

- Rich text editing with markdown import/export
- Good React integration via `@tiptap/react`
- Collaborative editing ready
- Growing ecosystem

**Cons:**

- **Accessibility gaps**: [Liveblocks analysis](https://liveblocks.io/blog/which-rich-text-editor-framework-should-you-choose-in-2025) notes accessibility is "left up to implementer"
- **Not markdown-first**: Designed for rich text, markdown is a conversion layer
- **Performance concerns**: Can degrade if best practices not followed

**Verdict**: REJECTED - accessibility concerns and not markdown-first.

### ProseMirror (Direct)

**Pros:**

- Maximum control and customisation
- Powers Notion, NY Times, Atlassian, and more
- Excellent document model

**Cons:**

- **Complexity**: Extremely low-level API
- **Development time**: Significant effort to build markdown editing
- **Overkill**: We need an editor, not a document editing framework

**Verdict**: REJECTED - excessive complexity for our needs.

### SimpleMDE / EasyMDE

**Pros:**

- Simple API, quick integration
- Built-in toolbar and preview
- Good for basic use cases

**Cons:**

- **Stale maintenance**: SimpleMDE abandoned, EasyMDE slow updates
- **Limited customisation**: Hard to integrate with design system
- **Accessibility**: Not designed with ARIA in mind

**Verdict**: REJECTED - maintenance concerns and limited customisation.

## Discussion

### Lead Developer

"I've evaluated all major options. Here's my analysis:

**Bundle size comparison:**

- CodeMirror 6 core + markdown: ~50KB gzipped
- Monaco: ~500KB+ gzipped
- Tiptap: ~80KB gzipped (but needs additional accessibility work)
- SimpleMDE: ~120KB gzipped (with dependencies)

CodeMirror 6 wins on bundle size.

**Accessibility:**
CodeMirror 6 was completely rewritten with accessibility as a design goal. The team conducted [screen reader surveys](https://discuss.codemirror.net/t/code-editor-screen-reader-accessiblity-survey/1790) to inform the design. ARIA attributes are built-in, not bolted on.

[Replit chose CodeMirror 6](https://blog.replit.com/codemirror) specifically because of its accessibility improvements.

**Mobile support:**
CodeMirror 6 has explicit touch support. Monaco explicitly documents mobile limitations."

### QA Architect

"Accessibility testing is critical. I recommend:

1. **Phase 2 Gate**: Manual screen reader testing with VoiceOver (macOS) and NVDA (Windows)
2. **axe-core Exclusion**: The `.cm-editor` selector should be excluded from automated a11y scans - CodeMirror's virtual rendering causes false positives
3. **Documentation**: Document the exclusion with rationale

One concern: virtual scrolling can confuse screen readers on very long documents. We should test with documents at our 500KB limit."

### Strategic Project Planner

"The decision is clear: CodeMirror 6.

However, we need explicit implementation requirements:

1. **Lazy loading is mandatory** - editor should not block initial page load
2. **Theme bridge must be created** - CSS custom properties don't work directly in CodeMirror
3. **Screen reader testing must happen before Phase 2 sign-off**
4. **Mobile testing on real devices** - not just browser DevTools"

## Implementation Notes

### Lazy Loading Pattern

```tsx
// app/(app)/w/[slug]/videos/[id]/edit/page.tsx (Server Component)
import dynamic from 'next/dynamic';
import { EditorSkeleton } from '@/components/editor-skeleton';

const MarkdownEditor = dynamic(() => import('@/components/markdown-editor'), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});

export default async function EditPage({ params }: Props) {
  const document = await getDocument(params.id);

  return (
    <MarkdownEditor
      initialContent={document.content}
      documentId={document.id}
      version={document.version}
    />
  );
}
```

### Theme Bridge Utility

```tsx
// lib/editor/theme.ts
import { EditorView } from '@codemirror/view';

export function createEditorTheme() {
  return EditorView.theme({
    '&': {
      backgroundColor: 'var(--color-background)',
      color: 'var(--color-foreground)',
    },
    '&.cm-focused': {
      outline: '2px solid var(--color-ring)',
      outlineOffset: '2px',
    },
    '.cm-content': {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--font-size-base)',
      lineHeight: 'var(--line-height-relaxed)',
      padding: 'var(--spacing-4)',
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--color-foreground)',
      borderLeftWidth: '2px',
    },
    '.cm-selectionBackground': {
      backgroundColor: 'var(--color-primary-muted)',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--color-surface)',
      color: 'var(--color-muted)',
      borderRight: '1px solid var(--color-border)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--color-surface-hover)',
    },
  });
}
```

### Auto-Save with Debounce

```tsx
// components/markdown-editor/index.tsx
'use client';

import { useCallback, useRef } from 'react';
import { EditorView } from '@codemirror/view';
import { useDebouncedCallback } from 'use-debounce';
import { trpc } from '@/lib/trpc/client';

interface Props {
  initialContent: string;
  documentId: string;
  version: number;
}

export function MarkdownEditor({ initialContent, documentId, version }: Props) {
  const versionRef = useRef(version);
  const saveDocument = trpc.document.save.useMutation();

  const debouncedSave = useDebouncedCallback(
    async (content: string) => {
      try {
        const result = await saveDocument.mutateAsync({
          documentId,
          content,
          expectedVersion: versionRef.current,
        });
        versionRef.current = result.version;
      } catch (error) {
        if (error instanceof ConflictError) {
          // Show conflict modal
        }
      }
    },
    2000 // 2-second debounce
  );

  const handleChange = useCallback(
    (update: ViewUpdate) => {
      if (update.docChanged) {
        debouncedSave(update.state.doc.toString());
      }
    },
    [debouncedSave]
  );

  // Editor setup...
}
```

### Required Extensions

```tsx
// components/markdown-editor/extensions.ts
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from '@codemirror/language';
import { history, historyKeymap } from '@codemirror/commands';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { accessibilityAnnouncements } from '@codemirror/view';

export function createEditorExtensions() {
  return [
    // Core
    lineNumbers(),
    history(),
    keymap.of(historyKeymap),

    // Language
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    syntaxHighlighting(defaultHighlightStyle),

    // Accessibility
    accessibilityAnnouncements(),

    // UX
    EditorView.lineWrapping,
  ];
}
```

### Accessibility Configuration

```tsx
// Ensure these accessibility features are enabled
const accessibilityExtensions = [
  // Announces cursor position and selection changes
  accessibilityAnnouncements(),

  // Ensure proper tab handling
  keymap.of([
    {
      key: 'Escape',
      run: (view) => {
        view.contentDOM.blur();
        return true;
      },
    },
  ]),
];
```

### Phase 2 Accessibility Testing Checklist

Before Phase 2 acceptance, the following must be verified:

- [ ] **VoiceOver (macOS)**
  - [ ] Can navigate into editor with Tab
  - [ ] Cursor position announced on movement
  - [ ] Selection changes announced
  - [ ] Can exit editor with Escape
  - [ ] Markdown syntax not read as punctuation

- [ ] **NVDA (Windows)**
  - [ ] Same checks as VoiceOver
  - [ ] Works in both browse and focus modes

- [ ] **Mobile**
  - [ ] iOS Safari: Can enter text, virtual keyboard works
  - [ ] Android Chrome: Can enter text, selection handles work

### Known Limitations

1. **axe-core Exclusion**: CodeMirror's virtual rendering triggers false positives. Exclude `.cm-editor` from automated scans.

2. **Line Numbers with VoiceOver**: Line numbers may be read repeatedly. Document as known behaviour if it persists.

3. **Large Document Performance**: Documents approaching 500KB may show lag on mobile devices. Monitor performance metrics.

### Dependencies

```json
{
  "dependencies": {
    "@codemirror/lang-markdown": "^6.2.0",
    "@codemirror/language": "^6.10.0",
    "@codemirror/language-data": "^6.5.0",
    "@codemirror/commands": "^6.3.0",
    "@codemirror/view": "^6.24.0",
    "@codemirror/state": "^6.4.0",
    "use-debounce": "^10.0.0"
  }
}
```

## References

- [CodeMirror 6 Documentation](https://codemirror.net/docs/)
- [CodeMirror Accessibility Survey](https://discuss.codemirror.net/t/code-editor-screen-reader-accessiblity-survey/1790)
- [Replit: Why We Chose CodeMirror](https://blog.replit.com/codemirror)
- [Sourcegraph: Monaco to CodeMirror Migration](https://sourcegraph.com/blog/migrating-monaco-codemirror)
- [Liveblocks: Rich Text Editor Comparison 2025](https://liveblocks.io/blog/which-rich-text-editor-framework-should-you-choose-in-2025)
