import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { RevisionViewer } from './revision-viewer';

/**
 * RevisionViewer Stories
 *
 * Full-screen modal for viewing document revisions in read-only mode.
 */
const meta = {
  title: 'Document/RevisionViewer',
  component: RevisionViewer,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    isOpen: true,
    onClose: fn(),
    onRestore: fn(),
  },
} satisfies Meta<typeof RevisionViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleContent = `# Video Script: Introduction to React Hooks

## Opening

Hello everyone! Welcome back to my channel. Today we're going to dive deep into React Hooks, one of the most powerful features added to React in recent years.

## Main Content

### What are Hooks?

Hooks are functions that let you "hook into" React state and lifecycle features from function components. They were introduced in React 16.8 and have revolutionized how we write React components.

### Why Use Hooks?

1. **Cleaner Code**: No more class components
2. **Better Reusability**: Extract stateful logic into custom hooks
3. **Easier Testing**: Pure functions are easier to test

### Common Hooks

- \`useState\`: For managing component state
- \`useEffect\`: For side effects
- \`useContext\`: For accessing context
- \`useReducer\`: For complex state logic

## Conclusion

That's it for today! Don't forget to like and subscribe for more React content.`;

/**
 * Default revision view
 */
export const Default: Story = {
  args: {
    isOpen: true,
    version: 5,
    content: sampleContent,
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    createdBy: 'John Doe',
    isCurrentVersion: false,
    isRestoring: false,
  },
};

/**
 * Current version (no restore button)
 */
export const CurrentVersion: Story = {
  args: {
    isOpen: true,
    version: 10,
    content: sampleContent,
    createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    createdBy: 'Jane Smith',
    isCurrentVersion: true,
    isRestoring: false,
  },
};

/**
 * Restoring in progress
 */
export const Restoring: Story = {
  args: {
    isOpen: true,
    version: 7,
    content: sampleContent,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    createdBy: 'John Doe',
    isCurrentVersion: false,
    isRestoring: true,
  },
};

/**
 * Without author information
 */
export const WithoutAuthor: Story = {
  args: {
    isOpen: true,
    version: 3,
    content: sampleContent,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    createdBy: null,
    isCurrentVersion: false,
    isRestoring: false,
  },
};

/**
 * Short content
 */
export const ShortContent: Story = {
  args: {
    isOpen: true,
    version: 2,
    content: '# Quick Note\n\nThis is a brief revision with minimal content.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
    createdBy: 'John Doe',
    isCurrentVersion: false,
    isRestoring: false,
  },
};

/**
 * Long content (scrollable)
 */
export const LongContent: Story = {
  args: {
    isOpen: true,
    version: 8,
    content: `${sampleContent}\n\n${sampleContent}\n\n${sampleContent}`,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
    createdBy: 'Jane Smith',
    isCurrentVersion: false,
    isRestoring: false,
  },
};

/**
 * Closed state
 */
export const Closed: Story = {
  args: {
    isOpen: false,
    version: 5,
    content: sampleContent,
    createdAt: new Date(),
    createdBy: 'John Doe',
    isCurrentVersion: false,
    isRestoring: false,
  },
};
