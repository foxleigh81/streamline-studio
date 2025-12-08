import type { Meta, StoryObj } from '@storybook/react';
import { expect, waitFor } from '@storybook/test';
import { MarkdownEditor } from './markdown-editor';
import { useState } from 'react';

/**
 * MarkdownEditor is a lazy-loaded CodeMirror 6 editor with
 * markdown syntax highlighting and keyboard shortcuts.
 */
const meta = {
  title: 'Document/MarkdownEditor',
  component: MarkdownEditor,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    initialContent: {
      control: 'text',
      description: 'Initial content for the editor',
    },
    readOnly: {
      control: 'boolean',
      description: 'Whether the editor is read-only',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text when editor is empty',
    },
    ariaLabel: {
      control: 'text',
      description: 'Accessibility label for the editor',
    },
  },
} satisfies Meta<typeof MarkdownEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default editor with sample content.
 */
export const Default: Story = {
  args: {
    initialContent: `# Sample Markdown

This is a **bold** statement and this is *italic*.

## Lists

- Item 1
- Item 2
- Item 3

## Code

\`\`\`javascript
console.log('Hello, World!');
\`\`\``,
    onChange: (content) => {
      // Content changed - in production this would trigger auto-save
      void content;
    },
    ariaLabel: 'Markdown editor',
  },
  play: async ({ canvasElement }) => {
    // Wait for CodeMirror to load
    await waitFor(
      () => {
        const editor = canvasElement.querySelector('.cm-editor');
        expect(editor).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  },
};

/**
 * Empty editor ready for input.
 */
export const Empty: Story = {
  args: {
    initialContent: '',
    placeholder: 'Start typing your markdown here...',
    onChange: (content) => {
      // Content changed
      void content;
    },
    ariaLabel: 'Empty markdown editor',
  },
};

/**
 * Read-only editor.
 */
export const ReadOnly: Story = {
  args: {
    initialContent: `# Read-Only Document

This content cannot be edited.

You can scroll and select text, but not modify it.`,
    readOnly: true,
    ariaLabel: 'Read-only markdown editor',
  },
};

/**
 * Editor with placeholder.
 */
export const WithPlaceholder: Story = {
  args: {
    initialContent: '',
    placeholder: 'Write your video script here...',
    ariaLabel: 'Script editor',
  },
};

/**
 * Editor with long content for scrolling.
 */
export const LongContent: Story = {
  args: {
    initialContent: `# Video Script: Complete Tutorial

## Introduction

${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(10)}

## Chapter 1

${'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. '.repeat(10)}

## Chapter 2

${'Ut enim ad minim veniam, quis nostrud exercitation ullamco. '.repeat(10)}

## Chapter 3

${'Duis aute irure dolor in reprehenderit in voluptate velit. '.repeat(10)}

## Conclusion

${'Excepteur sint occaecat cupidatat non proident. '.repeat(10)}`,
    minHeight: '400px',
    ariaLabel: 'Long content editor',
  },
};

/**
 * Interactive example with state management.
 */
function InteractiveEditor() {
  const [content, setContent] = useState(
    '# Interactive Example\n\nType something!'
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <MarkdownEditor
        initialContent={content}
        onChange={setContent}
        ariaLabel="Interactive editor"
      />
      <div
        style={{ padding: '12px', background: '#f0f0f0', borderRadius: '4px' }}
      >
        <strong>Current content length:</strong> {content.length} characters
      </div>
    </div>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveEditor />,
};

/**
 * Editor with save callback.
 */
export const WithSaveCallback: Story = {
  args: {
    initialContent:
      '# Document with Save\n\nPress Cmd+S (Mac) or Ctrl+S (Windows/Linux) to save.',
    onSave: () => {
      alert('Save triggered! (In production, this would save to the server)');
    },
    ariaLabel: 'Editor with save callback',
  },
};
