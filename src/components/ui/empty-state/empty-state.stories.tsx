import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { EmptyState } from './empty-state';

/**
 * Sample icon component for stories
 */
function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
      <polygon points="10 9 16 12 10 15 10 9" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

/**
 * Empty State Component Stories
 *
 * Demonstrates empty state patterns for different scenarios.
 */
const meta: Meta<typeof EmptyState> = {
  title: 'UI/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Title text',
    },
    description: {
      control: 'text',
      description: 'Description text',
    },
    actionLabel: {
      control: 'text',
      description: 'Action button label',
    },
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

// =============================================================================
// BASIC STORIES
// =============================================================================

export const Default: Story = {
  args: {
    title: 'No items found',
    description: 'There are no items to display.',
  },
};

export const WithIcon: Story = {
  args: {
    icon: <VideoIcon />,
    title: 'No videos yet',
    description: 'Create your first video project to get started.',
  },
};

export const WithAction: Story = {
  args: {
    icon: <VideoIcon />,
    title: 'No videos yet',
    description: 'Create your first video project to get started.',
    actionLabel: 'Create Video',
    onAction: () => alert('Create video clicked'),
  },
};

export const NoDescription: Story = {
  args: {
    icon: <FolderIcon />,
    title: 'No categories',
    actionLabel: 'Add Category',
    onAction: () => alert('Add category clicked'),
  },
};

export const LongDescription: Story = {
  args: {
    icon: <VideoIcon />,
    title: 'No search results',
    description:
      "We couldn't find any videos matching your search criteria. Try adjusting your filters or search terms to find what you're looking for. You can also create a new video if you don't see what you need.",
    actionLabel: 'Clear Filters',
    onAction: () => alert('Clear filters clicked'),
  },
};

// =============================================================================
// USE CASE STORIES
// =============================================================================

export const NoVideos: Story = {
  args: {
    icon: <VideoIcon />,
    title: 'No videos yet',
    description: 'Create your first video project to get started.',
    actionLabel: 'Create Video',
    onAction: () => alert('Create video'),
  },
};

export const NoCategories: Story = {
  args: {
    icon: <FolderIcon />,
    title: 'No categories',
    description: 'Organize your videos by creating categories.',
    actionLabel: 'Add Category',
    onAction: () => alert('Add category'),
  },
};

export const SearchEmpty: Story = {
  args: {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    ),
    title: 'No results found',
    description: 'Try adjusting your search or filters.',
  },
};

export const ErrorState: Story = {
  args: {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    title: 'Failed to load',
    description: 'There was a problem loading this content.',
    actionLabel: 'Try Again',
    onAction: () => alert('Try again'),
  },
};

// =============================================================================
// INTERACTION TESTS
// =============================================================================

/**
 * Test that action button is clickable
 */
export const ActionClickable: Story = {
  args: {
    title: 'Empty',
    actionLabel: 'Take Action',
    onAction: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Find action button
    const button = canvas.getByRole('button', { name: 'Take Action' });
    expect(button).toBeInTheDocument();

    // Click the button
    await userEvent.click(button);
  },
};

/**
 * Test accessibility attributes
 */
export const AccessibilityAttributes: Story = {
  args: {
    icon: <VideoIcon />,
    title: 'No content',
    description: 'Add some content to get started.',
    actionLabel: 'Add Content',
    onAction: () => {},
  },
  play: async ({ canvasElement }) => {
    // Check for role="status"
    const container = canvasElement.querySelector('[role="status"]');
    expect(container).toBeInTheDocument();

    // Check for aria-live
    expect(container).toHaveAttribute('aria-live', 'polite');

    // Check that icon is aria-hidden
    const icon = container?.querySelector('[aria-hidden="true"]');
    expect(icon).toBeInTheDocument();
  },
};

/**
 * Test that component renders without optional props
 */
export const MinimalProps: Story = {
  args: {
    title: 'Empty',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Title should be present
    const title = canvas.getByText('Empty');
    expect(title).toBeInTheDocument();

    // No icon, description, or button
    const button = canvasElement.querySelector('button');
    expect(button).not.toBeInTheDocument();
  },
};
