import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { SaveIndicator } from './save-indicator';

/**
 * SaveIndicator component displays the current save status
 * and last saved timestamp for documents.
 */
const meta = {
  title: 'Document/SaveIndicator',
  component: SaveIndicator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['saved', 'saving', 'failed', 'idle'],
      description: 'Current save status',
    },
    lastSaved: {
      control: 'date',
      description: 'Last saved timestamp',
    },
  },
} satisfies Meta<typeof SaveIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Saved state with recent timestamp.
 */
export const Saved: Story = {
  args: {
    status: 'saved',
    lastSaved: new Date(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify saved text is displayed
    const savedText = canvas.getByText('Saved');
    await expect(savedText).toBeInTheDocument();

    // Verify timestamp is displayed
    const timestamp = canvas.getByText(/just now|seconds ago/);
    await expect(timestamp).toBeInTheDocument();
  },
};

/**
 * Saving state with spinner.
 */
export const Saving: Story = {
  args: {
    status: 'saving',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify saving text is displayed
    const savingText = canvas.getByText('Saving...');
    await expect(savingText).toBeInTheDocument();

    // Verify spinner is present
    const indicator = canvasElement.querySelector('[role="status"]');
    await expect(indicator).toBeInTheDocument();
  },
};

/**
 * Failed state.
 */
export const Failed: Story = {
  args: {
    status: 'failed',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify failed text is displayed (using regex to match partial text)
    const failedText = canvas.getByText(/failed to save/i);
    await expect(failedText).toBeInTheDocument();
  },
};

/**
 * Idle state (no status shown).
 */
export const Idle: Story = {
  args: {
    status: 'idle',
  },
};

/**
 * Saved one minute ago.
 */
export const SavedOneMinuteAgo: Story = {
  args: {
    status: 'saved',
    lastSaved: new Date(Date.now() - 60 * 1000),
  },
};

/**
 * Saved 5 minutes ago.
 */
export const SavedFiveMinutesAgo: Story = {
  args: {
    status: 'saved',
    lastSaved: new Date(Date.now() - 5 * 60 * 1000),
  },
};

/**
 * Saved 1 hour ago.
 */
export const SavedOneHourAgo: Story = {
  args: {
    status: 'saved',
    lastSaved: new Date(Date.now() - 60 * 60 * 1000),
  },
};

/**
 * Saved yesterday.
 */
export const SavedYesterday: Story = {
  args: {
    status: 'saved',
    lastSaved: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
};
