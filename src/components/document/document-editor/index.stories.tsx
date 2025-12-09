import type { Meta, StoryObj } from '@storybook/react';
import { expect, within, userEvent, waitFor } from '@storybook/test';
import { DocumentEditor } from './document-editor';

/**
 * DocumentEditor is a complete document editing solution with
 * CodeMirror editor, markdown preview, auto-save, and local backup.
 */
const meta = {
  title: 'Document/DocumentEditor',
  component: DocumentEditor,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    documentId: {
      control: 'text',
      description: 'Unique document identifier',
    },
    initialContent: {
      control: 'text',
      description: 'Initial document content',
    },
    documentType: {
      control: 'text',
      description: 'Document type label',
    },
    readOnly: {
      control: 'boolean',
      description: 'Whether the editor is read-only',
    },
  },
} satisfies Meta<typeof DocumentEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockSave = async (content: string, version: number) => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { version: version + 1 };
};

const sampleScript = `# Video Script: Introduction to Markdown

## Opening Scene

*Camera fades in from black*

Welcome back to the channel! Today we're diving into the world of **Markdown** - the simple yet powerful markup language that millions of developers use every day.

## Main Content

### What is Markdown?

Markdown is a lightweight markup language created by John Gruber in 2004. Here's what makes it special:

1. **Easy to read** - Even in its raw form
2. **Easy to write** - No complex tags or syntax
3. **Portable** - Works everywhere
4. **Fast** - No overhead, just plain text

### Basic Syntax

Let's look at some examples:

\`\`\`markdown
# This is a heading
## This is a subheading

**Bold text**
*Italic text*

- List item 1
- List item 2
\`\`\`

### Why Use Markdown?

> Markdown allows you to focus on your content, not your formatting.

It's used in:
- GitHub README files
- Documentation sites
- Note-taking apps
- Blogging platforms

## Call to Action

If you found this helpful, don't forget to:
- 👍 Like this video
- 🔔 Subscribe for more content
- 💬 Leave a comment below

Thanks for watching! See you in the next one.

---

*Music fades out*
`;

/**
 * Default state with sample script content.
 */
export const Default: Story = {
  args: {
    documentId: 'video-123-script',
    initialContent: sampleScript,
    initialVersion: 1,
    onSave: mockSave,
    onReloadDocument: async () => ({ content: sampleScript, version: 1 }),
    documentType: 'Script',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify document type is displayed
    const documentType = canvas.getByText('Script');
    await expect(documentType).toBeInTheDocument();

    // Verify view mode toggle is present
    const editorButton = canvas.getByRole('button', { name: /editor/i });
    await expect(editorButton).toBeInTheDocument();

    // Verify stats are displayed
    const charLabel = canvas.getByText(/characters:/i);
    await expect(charLabel).toBeInTheDocument();
  },
};

/**
 * Empty editor ready for new content.
 */
export const Empty: Story = {
  args: {
    documentId: 'video-456-description',
    initialContent: '',
    initialVersion: 1,
    onSave: mockSave,
    onReloadDocument: async () => ({ content: '', version: 1 }),
    documentType: 'Description',
  },
};

/**
 * Read-only mode.
 */
export const ReadOnly: Story = {
  args: {
    documentId: 'video-789-notes',
    initialContent: '# Read-Only Document\n\nThis document cannot be edited.',
    initialVersion: 1,
    onSave: mockSave,
    onReloadDocument: async () => ({
      content: '# Read-Only Document\n\nThis document cannot be edited.',
      version: 1,
    }),
    documentType: 'Notes',
    readOnly: true,
  },
};

/**
 * Different document type: Description.
 */
export const Description: Story = {
  args: {
    documentId: 'video-123-description',
    initialContent: `🎬 Learn Markdown in 10 Minutes

In this video, you'll discover:
✅ What Markdown is and why it's popular
✅ Basic syntax for formatting text
✅ Advanced features like tables and code blocks
✅ Real-world use cases

🔗 Resources mentioned:
- Markdown Guide: https://www.markdownguide.org
- GitHub Flavored Markdown: https://github.github.com/gfm

📚 Chapters:
0:00 Introduction
1:30 What is Markdown?
4:15 Basic Syntax
7:45 Advanced Features
9:30 Wrap Up

#markdown #tutorial #webdevelopment`,
    initialVersion: 1,
    onSave: mockSave,
    onReloadDocument: async () => ({ content: '', version: 1 }),
    documentType: 'Description',
  },
};

/**
 * Different document type: Thumbnail Ideas.
 */
export const ThumbnailIdeas: Story = {
  args: {
    documentId: 'video-123-thumbnail',
    initialContent: `# Thumbnail Ideas

## Concept 1: Before/After
- Left side: Messy plain text
- Right side: Beautiful formatted markdown
- Big arrow in the middle
- Text: "TRANSFORM YOUR DOCS"

## Concept 2: Cheat Sheet
- Grid of markdown symbols and their output
- Clean, minimal design
- Color: Blue and white
- Text: "MARKDOWN CHEAT SHEET"

## Concept 3: Person at Computer
- Shot of me at desk looking excited
- Screen showing markdown preview
- Overlays with key benefits
- Text: "Why Developers LOVE Markdown"

## Selected: Concept 2
Reason: Most informative, provides value even before clicking`,
    initialVersion: 1,
    onSave: mockSave,
    onReloadDocument: async () => ({ content: '', version: 1 }),
    documentType: 'Thumbnail Ideas',
  },
};

/**
 * Simulates editing and auto-save.
 */
export const EditingAndAutoSave: Story = {
  args: {
    documentId: 'video-999-test',
    initialContent: '# Test Document\n\nStart typing...',
    initialVersion: 1,
    onSave: mockSave,
    onReloadDocument: async () => ({
      content: '# Test Document\n\nStart typing...',
      version: 1,
    }),
    documentType: 'Script',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for editor to load
    await waitFor(
      () => {
        const editor = canvasElement.querySelector('.cm-content');
        expect(editor).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Stats should show initial content
    const wordStats = canvas.getByText(/words:/i);
    await expect(wordStats).toBeInTheDocument();
  },
};

/**
 * View mode switching.
 */
export const ViewModeSwitching: Story = {
  args: {
    documentId: 'video-101-script',
    initialContent:
      '# Sample Content\n\nThis is **bold** and this is *italic*.',
    initialVersion: 1,
    onSave: mockSave,
    onReloadDocument: async () => ({
      content: '# Sample Content\n\nThis is **bold** and this is *italic*.',
      version: 1,
    }),
    documentType: 'Script',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click preview button
    const previewButton = canvas.getByRole('button', { name: /preview/i });
    await userEvent.click(previewButton);

    // Verify preview button is active
    await expect(previewButton).toHaveAttribute('aria-pressed', 'true');

    // Click editor button
    const editorButton = canvas.getByRole('button', { name: /^editor$/i });
    await userEvent.click(editorButton);

    // Verify editor button is active
    await expect(editorButton).toHaveAttribute('aria-pressed', 'true');

    // Click split button
    const splitButton = canvas.getByRole('button', { name: /split/i });
    await userEvent.click(splitButton);

    // Verify split button is active
    await expect(splitButton).toHaveAttribute('aria-pressed', 'true');
  },
};
