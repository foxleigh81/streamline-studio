import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { VideoCard } from './video-card';

/**
 * VideoCard Component Stories
 *
 * Demonstrates video card variations with different statuses and categories.
 */
const meta: Meta<typeof VideoCard> = {
  title: 'Video/VideoCard',
  component: VideoCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    status: {
      control: 'select',
      options: [
        'idea',
        'scripting',
        'filming',
        'editing',
        'review',
        'scheduled',
        'published',
        'archived',
      ],
      description: 'Video status',
    },
  },
};

export default meta;
type Story = StoryObj<typeof VideoCard>;

// =============================================================================
// BASIC STORIES
// =============================================================================

export const Default: Story = {
  args: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    channelSlug: 'my-channel',
    title: 'How to Build a Next.js App',
    status: 'scripting',
    dueDate: '2025-12-15',
    description:
      'A comprehensive guide to building modern web applications with Next.js 15.',
    categories: [
      { id: '1', name: 'Tutorial', color: '#3B82F6' },
      { id: '2', name: 'Web Dev', color: '#8B5CF6' },
    ],
  },
};

export const IdeaStatus: Story = {
  args: {
    id: '123e4567-e89b-12d3-a456-426614174001',
    channelSlug: 'my-channel',
    title: 'Video Idea: React Server Components',
    status: 'idea',
    dueDate: null,
    description: 'Exploring the new React Server Components paradigm.',
    categories: [{ id: '1', name: 'Research', color: '#6B7280' }],
  },
};

export const PublishedStatus: Story = {
  args: {
    id: '123e4567-e89b-12d3-a456-426614174002',
    channelSlug: 'my-channel',
    title: 'TypeScript Tips for Beginners',
    status: 'published',
    dueDate: '2025-12-01',
    description: 'Essential TypeScript tips every developer should know.',
    categories: [
      { id: '1', name: 'TypeScript', color: '#3B82F6' },
      { id: '2', name: 'Beginner', color: '#22C55E' },
    ],
  },
};

export const NoDescription: Story = {
  args: {
    id: '123e4567-e89b-12d3-a456-426614174003',
    channelSlug: 'my-channel',
    title: 'Quick CSS Animation Tutorial',
    status: 'editing',
    dueDate: '2025-12-20',
    categories: [{ id: '1', name: 'CSS', color: '#F59E0B' }],
  },
};

export const NoCategories: Story = {
  args: {
    id: '123e4567-e89b-12d3-a456-426614174004',
    channelSlug: 'my-channel',
    title: 'Uncategorized Video',
    status: 'review',
    dueDate: '2025-12-10',
    description: 'This video has not been assigned to any categories yet.',
    categories: [],
  },
};

export const NoDueDate: Story = {
  args: {
    id: '123e4567-e89b-12d3-a456-426614174005',
    channelSlug: 'my-channel',
    title: 'No Deadline Video',
    status: 'filming',
    dueDate: null,
    description: 'This video has no set deadline.',
    categories: [{ id: '1', name: 'Flexible', color: '#14B8A6' }],
  },
};

export const LongTitle: Story = {
  args: {
    id: '123e4567-e89b-12d3-a456-426614174006',
    channelSlug: 'my-channel',
    title:
      'An Extremely Long Video Title That Should Be Truncated After Two Lines to Maintain Card Layout',
    status: 'scripting',
    dueDate: '2025-12-25',
    description:
      'This video has a very long title that demonstrates text truncation.',
    categories: [{ id: '1', name: 'Demo', color: '#EC4899' }],
  },
};

export const ManyCategories: Story = {
  args: {
    id: '123e4567-e89b-12d3-a456-426614174007',
    channelSlug: 'my-channel',
    title: 'Comprehensive Web Development Guide',
    status: 'scheduled',
    dueDate: '2026-01-01',
    description: 'A complete guide covering multiple technologies.',
    categories: [
      { id: '1', name: 'JavaScript', color: '#F59E0B' },
      { id: '2', name: 'TypeScript', color: '#3B82F6' },
      { id: '3', name: 'React', color: '#06B6D4' },
      { id: '4', name: 'Next.js', color: '#8B5CF6' },
      { id: '5', name: 'Advanced', color: '#EC4899' },
    ],
  },
};

// =============================================================================
// STATUS VARIATIONS
// =============================================================================

export const AllStatuses: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1rem',
      }}
    >
      <VideoCard
        id="1"
        channelSlug="my-channel"
        title="Idea Phase"
        status="idea"
        dueDate={null}
        categories={[]}
      />
      <VideoCard
        id="2"
        channelSlug="my-channel"
        title="Scripting Phase"
        status="scripting"
        dueDate="2025-12-15"
        categories={[]}
      />
      <VideoCard
        id="3"
        channelSlug="my-channel"
        title="Filming Phase"
        status="filming"
        dueDate="2025-12-18"
        categories={[]}
      />
      <VideoCard
        id="4"
        channelSlug="my-channel"
        title="Editing Phase"
        status="editing"
        dueDate="2025-12-20"
        categories={[]}
      />
      <VideoCard
        id="5"
        channelSlug="my-channel"
        title="Review Phase"
        status="review"
        dueDate="2025-12-22"
        categories={[]}
      />
      <VideoCard
        id="6"
        channelSlug="my-channel"
        title="Scheduled Phase"
        status="scheduled"
        dueDate="2025-12-25"
        categories={[]}
      />
      <VideoCard
        id="7"
        channelSlug="my-channel"
        title="Published Phase"
        status="published"
        dueDate="2025-12-01"
        categories={[]}
      />
      <VideoCard
        id="8"
        channelSlug="my-channel"
        title="Archived Phase"
        status="archived"
        dueDate="2025-11-01"
        categories={[]}
      />
    </div>
  ),
};

// =============================================================================
// INTERACTION TESTS
// =============================================================================

/**
 * Test keyboard navigation
 */
export const KeyboardNavigation: Story = {
  args: {
    id: '123e4567-e89b-12d3-a456-426614174008',
    channelSlug: 'my-channel',
    title: 'Keyboard Accessible Card',
    status: 'scripting',
    dueDate: '2025-12-15',
    categories: [{ id: '1', name: 'Accessibility', color: '#22C55E' }],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByRole('link');

    // Tab to focus the card
    await userEvent.tab();

    // Verify card has focus
    await expect(card).toHaveFocus();
  },
};

/**
 * Test click interaction
 */
export const ClickInteraction: Story = {
  args: {
    id: '123e4567-e89b-12d3-a456-426614174009',
    channelSlug: 'my-channel',
    title: 'Clickable Card',
    status: 'editing',
    dueDate: '2025-12-20',
    categories: [{ id: '1', name: 'Interactive', color: '#8B5CF6' }],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByRole('link');

    // Verify card is clickable
    await expect(card).toHaveAttribute('href');
  },
};
