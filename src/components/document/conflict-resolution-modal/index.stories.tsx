import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ConflictResolutionModal } from './conflict-resolution-modal';

/**
 * ConflictResolutionModal Stories
 *
 * This modal is displayed when a document save fails due to a version mismatch
 * (optimistic locking conflict). It provides two options:
 * 1. Reload and discard changes
 * 2. Force save as new version
 */
const meta = {
  title: 'Document/ConflictResolutionModal',
  component: ConflictResolutionModal,
  parameters: {
    layout: 'centered',
  },
  args: {
    isOpen: true,
    onClose: fn(),
    onReload: fn(),
    onForceSave: fn(),
  },
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Whether the modal is open',
    },
    currentVersion: {
      control: 'number',
      description: 'Current version number on the server',
    },
    expectedVersion: {
      control: 'number',
      description: 'Version number the user was editing',
    },
    serverContentPreview: {
      control: 'text',
      description: 'Preview of server content (first 200 chars)',
    },
  },
} satisfies Meta<typeof ConflictResolutionModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default conflict scenario
 * Shows a basic conflict with version numbers
 */
export const Default: Story = {
  args: {
    isOpen: true,
    currentVersion: 5,
    expectedVersion: 4,
  },
};

/**
 * Conflict with content preview
 * Shows what changed on the server
 */
export const WithContentPreview: Story = {
  args: {
    isOpen: true,
    currentVersion: 12,
    expectedVersion: 10,
    serverContentPreview:
      '# Updated Video Script\n\nHello everyone! Welcome back to my channel. Today we are going to talk about...',
  },
};

/**
 * Large version gap
 * Shows a conflict where many versions were created
 */
export const LargeVersionGap: Story = {
  args: {
    isOpen: true,
    currentVersion: 25,
    expectedVersion: 15,
    serverContentPreview:
      '# Video Script - Major Revision\n\nThis script has been completely rewritten by another user. The original content has been replaced with...',
  },
};

/**
 * Long content preview
 * Demonstrates truncation at 200 characters
 */
export const LongContentPreview: Story = {
  args: {
    isOpen: true,
    currentVersion: 8,
    expectedVersion: 7,
    serverContentPreview:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  },
};

/**
 * Closed modal
 * Shows the initial state (not visible)
 */
export const Closed: Story = {
  args: {
    isOpen: false,
    currentVersion: 5,
    expectedVersion: 4,
  },
};
