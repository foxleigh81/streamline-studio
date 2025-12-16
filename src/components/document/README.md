# Document Editing Components

Complete document editing solution for Streamline Studio, built for Phase 2B.

## Overview

This module provides a full-featured markdown editing experience with:

- **CodeMirror 6** - Modern, accessible code editor
- **Live Preview** - Side-by-side markdown rendering
- **Auto-Save** - Debounced saves with version conflict detection
- **Local Backup** - Automatic localStorage backup with recovery
- **Save Status** - Real-time save state indicator
- **Keyboard Shortcuts** - Cmd+S for manual save, Escape to blur
- **Accessibility** - ARIA labels, screen reader support, keyboard navigation
- **Character/Word Count** - Live statistics display

## Components

### MarkdownEditor

Lazy-loaded CodeMirror 6 editor with markdown syntax highlighting.

```tsx
import { MarkdownEditor } from '@/components/document/markdown-editor';

<MarkdownEditor
  initialContent="# Hello World"
  onChange={(content) => handleChange(content)}
  onSave={() => handleSave()}
  ariaLabel="Video script editor"
  minHeight="500px"
/>;
```

**Features:**

- Lazy-loaded (not in initial bundle)
- Markdown syntax highlighting
- Line numbers
- Keyboard shortcuts (Cmd+S, Escape)
- Theme integration with CSS custom properties

**Props:**

- `initialContent: string` - Starting content
- `onChange?: (content: string) => void` - Called on every change
- `onSave?: () => void` - Called when Cmd+S pressed
- `readOnly?: boolean` - Disable editing
- `placeholder?: string` - Placeholder text
- `ariaLabel?: string` - Accessibility label
- `minHeight?: string` - Minimum editor height

### MarkdownPreview

Renders markdown as sanitized HTML.

```tsx
import { MarkdownPreview } from '@/components/document/markdown-preview';

<MarkdownPreview content={markdownContent} ariaLabel="Video script preview" />;
```

**Features:**

- GitHub Flavored Markdown
- XSS protection via DOMPurify
- Styled output
- Code syntax highlighting

**Props:**

- `content: string` - Markdown to render
- `className?: string` - Additional CSS class
- `ariaLabel?: string` - Accessibility label

### SaveIndicator

Displays save status and timestamp.

```tsx
import { SaveIndicator } from '@/components/document/save-indicator';

<SaveIndicator status="saved" lastSaved={new Date()} />;
```

**Features:**

- Visual status (saved, saving, failed, idle)
- Relative timestamps ("2 minutes ago")
- Loading spinner for saving state
- ARIA live region for screen readers

**Props:**

- `status: 'saved' | 'saving' | 'failed' | 'idle'`
- `lastSaved?: Date | string | null`
- `className?: string`

### DocumentEditor

Complete editing interface combining all features.

```tsx
import { DocumentEditor } from '@/components/document/document-editor';

<DocumentEditor
  documentId="video-123-script"
  initialContent="# Video Script"
  initialVersion={1}
  onSave={async (content, version) => {
    const result = await saveDocument({ content, version });
    return { version: result.version };
  }}
  documentType="Script"
/>;
```

**Features:**

- Editor + Preview (side-by-side or toggle)
- Auto-save with 2-second debounce
- Local backup with recovery prompt
- Version conflict detection
- Character/word count
- Keyboard shortcuts

**Props:**

- `documentId: string` - Unique identifier for backup
- `initialContent: string` - Starting content
- `initialVersion: number` - Current version for optimistic concurrency
- `onSave: (content, version) => Promise<{ version }>` - Save function
- `onConflict?: () => void` - Called on version conflict
- `documentType?: string` - Label (e.g., "Script", "Description")
- `readOnly?: boolean` - Disable editing
- `debounceMs?: number` - Auto-save delay (default 2000ms)

## Hooks

### useDocumentAutoSave

Manages auto-saving with debounce and version tracking.

```tsx
import { useDocumentAutoSave } from '@/components/document/document-editor';

const { status, lastSaved, handleContentChange, forceSave } =
  useDocumentAutoSave({
    debounceMs: 2000,
    initialVersion: 1,
    onSave: async (content, version) => {
      const result = await saveDocument({ content, version });
      return { version: result.version };
    },
    onConflict: () => {
      // Show conflict resolution UI
    },
  });
```

### useLocalBackup

Manages localStorage backup and recovery.

```tsx
import { useLocalBackup } from '@/components/document/document-editor';

const { hasBackup, saveBackup, restoreBackup, clearBackup } = useLocalBackup({
  documentId: 'video-123-script',
  initialContent: '',
  onRestore: (content) => setEditorContent(content),
});

// Save on every change
saveBackup(content);

// Clear after successful server save
clearBackup();
```

## Architecture

### Lazy Loading

The CodeMirror editor is lazy-loaded using `next/dynamic` with `ssr: false`:

```tsx
// markdown-editor.tsx
const MarkdownEditorInner = dynamic(() => import('./markdown-editor-inner'), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});
```

**Why?**

- CodeMirror is ~175KB gzipped (see Storybook build output)
- Not needed on initial page load
- Improves Time to Interactive (TTI)

### Theme Integration

CodeMirror theme uses CSS custom properties from the application theme:

```tsx
EditorView.theme({
  '&': {
    backgroundColor: 'var(--color-background)',
    color: 'var(--color-foreground)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--color-muted)',
  },
  // ...
});
```

This ensures the editor matches the application theme automatically.

### XSS Protection

Markdown preview sanitizes HTML using DOMPurify:

```tsx
const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
  ALLOWED_TAGS: ['h1', 'h2', 'p', 'strong', 'code', ...],
  ALLOWED_ATTR: ['href', 'src', 'alt', ...],
  ALLOW_DATA_ATTR: false,
});
```

**Security:**

- Prevents XSS attacks via markdown injection
- Strips dangerous tags (`<script>`, `<iframe>`, etc.)
- Removes event handlers (`onerror`, `onclick`, etc.)
- See ADR-014 for security architecture

### Version Conflict Detection

Uses optimistic concurrency control:

1. Client tracks current `version` number
2. On save, sends `{ content, expectedVersion }`
3. Server compares `expectedVersion` with database version
4. If mismatch, returns `CONFLICT` error
5. Client shows conflict resolution UI (Phase 3)

## File Structure

```
/src/components/document/
├── markdown-editor/
│   ├── markdown-editor.tsx           # Lazy wrapper
│   ├── markdown-editor-inner.tsx     # CodeMirror implementation
│   ├── markdown-editor.module.scss   # Styles
│   ├── index.stories.tsx             # Storybook stories
│   └── index.ts                      # Exports
├── markdown-preview/
│   ├── markdown-preview.tsx
│   ├── markdown-preview.module.scss
│   ├── index.stories.tsx
│   └── index.ts
├── save-indicator/
│   ├── save-indicator.tsx
│   ├── save-indicator.module.scss
│   ├── index.stories.tsx
│   └── index.ts
├── document-editor/
│   ├── document-editor.tsx
│   ├── document-editor.module.scss
│   ├── use-document-autosave.ts      # Auto-save hook
│   ├── use-local-backup.ts           # Backup hook
│   ├── index.stories.tsx
│   └── index.ts
└── README.md                         # This file
```

## Accessibility

### Keyboard Navigation

- **Tab** - Enter editor
- **Escape** - Exit editor (blur)
- **Cmd+S / Ctrl+S** - Manual save
- **Cmd+Z / Ctrl+Z** - Undo
- **Cmd+Shift+Z / Ctrl+Shift+Z** - Redo

### Screen Readers

- Editor has `role="textbox"` and `aria-multiline="true"`
- Save status has `aria-live="polite"` for announcements
- View mode toggle uses `aria-pressed` for state
- All interactive elements have labels

### Known Limitations

1. **CodeMirror virtual rendering** - May trigger axe-core false positives. Exclude `.cm-editor` from automated scans.
2. **Line numbers with VoiceOver** - May be read repeatedly (CodeMirror limitation).

See ADR-013 for complete accessibility testing checklist.

## Performance

### Bundle Size

- **Editor (lazy-loaded)**: ~175KB gzipped (CodeMirror + extensions)
- **Preview**: ~22KB gzipped (marked + DOMPurify)
- **Complete bundle**: ~200KB total (not on critical path)

### Optimizations

1. **Lazy loading** - Editor not in initial bundle
2. **Debounced auto-save** - Reduces server requests
3. **Memoized preview** - Only re-renders on content change
4. **Virtual scrolling** - CodeMirror handles large documents efficiently

### Document Size Limit

**500KB maximum** (enforced in backup hook):

```tsx
const sizeInBytes = new Blob([content]).size;
if (sizeInBytes > 500_000) {
  // Skip backup or show warning
}
```

## Testing

### Storybook

All components have comprehensive Storybook stories:

```bash
npm run storybook
```

Navigate to "Document" section to see all variations.

### Interaction Tests

Stories include interaction tests using `@storybook/test`:

```tsx
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const heading = canvas.getByText('Sample Video Script');
    await expect(heading).toBeInTheDocument();
  },
};
```

## Usage Examples

### Video Detail Page

```tsx
// app/(app)/t/[teamspace]/[project]/videos/[id]/edit/page.tsx
import { DocumentEditor } from '@/components/document/document-editor';
import { trpc } from '@/lib/trpc/server';

export default async function EditScriptPage({ params }) {
  const document = await trpc.document.get({ id: params.docId });

  return (
    <DocumentEditor
      documentId={document.id}
      initialContent={document.content}
      initialVersion={document.version}
      onSave={async (content, version) => {
        'use server';
        const result = await trpc.document.update({
          id: document.id,
          content,
          expectedVersion: version,
        });
        return { version: result.version };
      }}
      documentType="Script"
    />
  );
}
```

### Custom Integration

```tsx
import { MarkdownEditor, MarkdownPreview } from '@/components/document';

function MyCustomEditor() {
  const [content, setContent] = useState('');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <MarkdownEditor
        initialContent={content}
        onChange={setContent}
        ariaLabel="Custom editor"
      />
      <MarkdownPreview content={content} />
    </div>
  );
}
```

## References

- [ADR-013: Markdown Editor Selection](/docs/adrs/013-markdown-editor.md)
- [ADR-002: Styling Solution](/docs/adrs/002-styling-solution.md)
- [ADR-014: Security Architecture](/docs/adrs/014-security-architecture.md)
- [CodeMirror 6 Documentation](https://codemirror.net/docs/)
- [DOMPurify](https://github.com/cure53/DOMPurify)
- [Marked.js](https://marked.js.org/)
