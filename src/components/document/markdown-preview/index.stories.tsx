import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { MarkdownPreview } from './markdown-preview';

/**
 * MarkdownPreview component displays rendered markdown content.
 * It uses marked for parsing and DOMPurify for sanitization.
 */
const meta = {
  title: 'Document/MarkdownPreview',
  component: MarkdownPreview,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    content: {
      control: 'text',
      description: 'Markdown content to render',
    },
    ariaLabel: {
      control: 'text',
      description: 'Accessibility label for the preview',
    },
  },
} satisfies Meta<typeof MarkdownPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleMarkdown = `# Sample Video Script

## Introduction

Welcome to this **exciting** video about _markdown editing_!

### Key Points

1. First important point
2. Second important point
3. Third important point

### Features

- Easy to write
- Easy to read
- **Powerful** formatting

## Code Example

Here's some inline \`code\` and a code block:

\`\`\`javascript
function hello() {
  console.log('Hello, World!');
}
\`\`\`

## Links and Images

Check out [this link](https://example.com) for more information.

## Blockquote

> This is a blockquote with some wisdom.
> It can span multiple lines.

## Table

| Feature | Status |
|---------|--------|
| Markdown | ✓ |
| Preview | ✓ |
| Auto-save | ✓ |

---

That's all for now!
`;

/**
 * Default preview with sample markdown content.
 */
export const Default: Story = {
  args: {
    content: sampleMarkdown,
    ariaLabel: 'Video script preview',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify heading is rendered
    const heading = canvas.getByText('Sample Video Script');
    await expect(heading).toBeInTheDocument();

    // Verify list items are rendered
    const listItem = canvas.getByText('First important point');
    await expect(listItem).toBeInTheDocument();

    // Verify code is rendered
    const code = canvas.getByText(/Hello, World!/);
    await expect(code).toBeInTheDocument();
  },
};

/**
 * Empty preview with no content.
 */
export const Empty: Story = {
  args: {
    content: '',
    ariaLabel: 'Empty preview',
  },
};

/**
 * Simple text without markdown formatting.
 */
export const PlainText: Story = {
  args: {
    content: 'This is plain text without any markdown formatting.',
    ariaLabel: 'Plain text preview',
  },
};

/**
 * Preview with only headings.
 */
export const HeadingsOnly: Story = {
  args: {
    content: `# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6`,
    ariaLabel: 'Headings preview',
  },
};

/**
 * Preview with emphasis and strong text.
 */
export const TextFormatting: Story = {
  args: {
    content: `This is **bold text**.

This is *italic text*.

This is ***bold and italic***.

This is ~~strikethrough~~.`,
    ariaLabel: 'Text formatting preview',
  },
};

/**
 * Preview with lists (ordered and unordered).
 */
export const Lists: Story = {
  args: {
    content: `Unordered List:
- Item 1
- Item 2
  - Nested item 1
  - Nested item 2
- Item 3

Ordered List:
1. First
2. Second
3. Third`,
    ariaLabel: 'Lists preview',
  },
};

/**
 * Preview with code blocks and inline code.
 */
export const Code: Story = {
  args: {
    content: `Inline code: \`const x = 42;\`

Code block:
\`\`\`typescript
interface User {
  id: string;
  name: string;
}

function greet(user: User): string {
  return \`Hello, \${user.name}!\`;
}
\`\`\``,
    ariaLabel: 'Code preview',
  },
};

/**
 * Preview with links.
 */
export const Links: Story = {
  args: {
    content: `Visit [our website](https://example.com) for more information.

This is an [inline link](https://example.com "Optional title").

Auto-linked URLs are not typically rendered by standard markdown.`,
    ariaLabel: 'Links preview',
  },
};

/**
 * Preview with blockquotes.
 */
export const Blockquotes: Story = {
  args: {
    content: `> This is a blockquote.
> It can span multiple lines.

> Nested blockquote:
>> This is nested.`,
    ariaLabel: 'Blockquotes preview',
  },
};

/**
 * Preview with a table.
 */
export const Table: Story = {
  args: {
    content: `| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
| Cell 7   | Cell 8   | Cell 9   |`,
    ariaLabel: 'Table preview',
  },
};

/**
 * XSS protection test - script tags should be sanitized.
 */
export const XSSProtection: Story = {
  args: {
    content: `# Security Test

This should be safe: <script>alert('XSS')</script>

This should also be safe: <img src="x" onerror="alert('XSS')" />

Normal content continues here.`,
    ariaLabel: 'XSS protection test',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify heading is rendered
    const heading = canvas.getByText('Security Test');
    await expect(heading).toBeInTheDocument();

    // Verify script tag is NOT in the DOM
    const scripts = canvasElement.querySelectorAll('script');
    await expect(scripts.length).toBe(0);
  },
};
