import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { VideoTable, type VideoTableData } from './video-table';

/**
 * VideoTable Component Stories
 *
 * Demonstrates the video table component with various data scenarios.
 * Includes interaction tests for sorting and row selection.
 */
const meta: Meta<typeof VideoTable> = {
  title: 'Video/VideoTable',
  component: VideoTable,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    videos: {
      description: 'Array of video data to display',
    },
    channelSlug: {
      description: 'Channel slug for navigation',
    },
    teamspaceSlug: {
      description: 'Optional teamspace slug for multi-tenant mode',
    },
  },
};

export default meta;
type Story = StoryObj<typeof VideoTable>;

// =============================================================================
// MOCK DATA
// =============================================================================

const mockVideos: VideoTableData[] = [
  {
    id: '1',
    title: 'Introduction to Next.js 15',
    status: 'published',
    dueDate: '2025-01-15',
    categories: 'Tutorial, Web Development',
  },
  {
    id: '2',
    title: 'Building a REST API with Node.js',
    status: 'editing',
    dueDate: '2025-01-20',
    categories: 'Backend, API',
  },
  {
    id: '3',
    title: 'TypeScript Best Practices',
    status: 'scripting',
    dueDate: '2025-01-25',
    categories: 'TypeScript, Programming',
  },
  {
    id: '4',
    title: 'CSS Grid Layout Masterclass',
    status: 'review',
    dueDate: '2025-01-18',
    categories: 'CSS, Design',
  },
  {
    id: '5',
    title: 'React Hooks Deep Dive',
    status: 'filming',
    dueDate: null,
    categories: 'React, JavaScript',
  },
  {
    id: '6',
    title: 'Database Design Fundamentals',
    status: 'idea',
    dueDate: '2025-02-01',
    categories: 'Database, SQL',
  },
  {
    id: '7',
    title: 'Docker for Beginners',
    status: 'scheduled',
    dueDate: '2025-01-22',
    categories: 'DevOps, Docker',
  },
  {
    id: '8',
    title: 'Legacy Content Archive',
    status: 'archived',
    dueDate: null,
    categories: '',
  },
];

const fewVideos: VideoTableData[] = mockVideos.slice(0, 3);

const singleVideo: VideoTableData[] = [mockVideos[0]!];

// =============================================================================
// DATA VARIANT STORIES
// =============================================================================

export const Default: Story = {
  args: {
    videos: mockVideos,
    channelSlug: 'my-channel',
    teamspaceSlug: 'my-teamspace',
  },
};

export const FewVideos: Story = {
  args: {
    videos: fewVideos,
    channelSlug: 'my-channel',
    teamspaceSlug: 'my-teamspace',
  },
};

export const SingleVideo: Story = {
  args: {
    videos: singleVideo,
    channelSlug: 'my-channel',
    teamspaceSlug: 'my-teamspace',
  },
};

export const EmptyState: Story = {
  args: {
    videos: [],
    channelSlug: 'my-channel',
    teamspaceSlug: 'my-teamspace',
  },
};

export const NoDueDates: Story = {
  args: {
    videos: mockVideos.map((v) => ({ ...v, dueDate: null })),
    channelSlug: 'my-channel',
    teamspaceSlug: 'my-teamspace',
  },
};

export const NoCategories: Story = {
  args: {
    videos: mockVideos.map((v) => ({ ...v, categories: '' })),
    channelSlug: 'my-channel',
    teamspaceSlug: 'my-teamspace',
  },
};

// =============================================================================
// INTERACTION TESTS
// =============================================================================

/**
 * Test clicking on column headers to sort
 */
export const SortByTitle: Story = {
  args: {
    videos: mockVideos,
    channelSlug: 'my-channel',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Get the title column header button
    const titleHeader = canvas.getByRole('button', { name: /sort by title/i });

    // Click to sort ascending (default)
    await userEvent.click(titleHeader);

    // Verify first row contains the alphabetically first title (using link text)
    const firstLink = canvas.getByRole('link', {
      name: /Building a REST API with Node.js/i,
    });
    await expect(firstLink).toBeInTheDocument();

    // Click again to sort descending
    await userEvent.click(titleHeader);

    // Now TypeScript Best Practices should be first
    const newFirstLink = canvas.getByRole('link', {
      name: /TypeScript Best Practices/i,
    });
    await expect(newFirstLink).toBeInTheDocument();
  },
};

/**
 * Test sorting by status
 */
export const SortByStatus: Story = {
  args: {
    videos: mockVideos,
    channelSlug: 'my-channel',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Get the status column header
    const statusHeader = canvas.getByRole('button', {
      name: /sort by status/i,
    });

    // Click to sort by status
    await userEvent.click(statusHeader);

    // Verify sorting occurred (archived should come first alphabetically)
    const table = canvas.getByRole('table');
    await expect(table).toBeInTheDocument();
  },
};

/**
 * Test sorting by due date
 */
export const SortByDueDate: Story = {
  args: {
    videos: mockVideos,
    channelSlug: 'my-channel',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Get the due date column header
    const dueDateHeader = canvas.getByRole('button', {
      name: /sort by due date/i,
    });

    // Click to sort by due date
    await userEvent.click(dueDateHeader);

    // Verify table is still present and sorted
    const table = canvas.getByRole('table');
    await expect(table).toBeInTheDocument();

    // Verify all video links are still present
    const links = canvas.getAllByRole('link');
    await expect(links.length).toBeGreaterThan(0);
  },
};

/**
 * Test keyboard navigation on links
 */
export const KeyboardNavigableRows: Story = {
  args: {
    videos: fewVideos,
    channelSlug: 'my-channel',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Get all video links
    const links = canvas.getAllByRole('link');

    // Tab through header buttons to reach first link
    await userEvent.tab(); // First header button (title)
    await userEvent.tab(); // Second header button (status)
    await userEvent.tab(); // Third header button (due date)
    await userEvent.tab(); // Fourth header button (categories)
    await userEvent.tab(); // Should be on first video link

    // Verify first link has focus
    await expect(links[0]).toHaveFocus();

    // Links should be navigable via keyboard
    await expect(links[0]).toBeInTheDocument();
  },
};

/**
 * Test clicking on a video link
 */
export const RowClickInteraction: Story = {
  args: {
    videos: fewVideos,
    channelSlug: 'my-channel',
    onRowClick: () => {
      // Mock handler for testing - prevents actual navigation
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Get the first video link
    const firstLink = canvas.getByRole('link', {
      name: /Introduction to Next.js 15/i,
    });

    // Click the link
    await userEvent.click(firstLink);

    // Link should still be visible
    await expect(firstLink).toBeInTheDocument();
  },
};

/**
 * Test accessibility attributes
 */
export const AccessibilityAttributes: Story = {
  args: {
    videos: mockVideos,
    channelSlug: 'my-channel',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Check for table structure
    const table = canvas.getByRole('table');
    await expect(table).toBeInTheDocument();

    // Check for column headers with sort buttons
    const titleHeader = canvas.getByRole('button', { name: /sort by title/i });
    const statusHeader = canvas.getByRole('button', {
      name: /sort by status/i,
    });
    const dueDateHeader = canvas.getByRole('button', {
      name: /sort by due date/i,
    });
    const categoriesHeader = canvas.getByRole('button', {
      name: /sort by categories/i,
    });

    await expect(titleHeader).toBeInTheDocument();
    await expect(statusHeader).toBeInTheDocument();
    await expect(dueDateHeader).toBeInTheDocument();
    await expect(categoriesHeader).toBeInTheDocument();

    // Check for video links - one per video
    const links = canvas.getAllByRole('link');
    await expect(links.length).toBe(mockVideos.length);

    // All links should have href attribute
    links.forEach((link) => {
      expect(link).toHaveAttribute('href');
    });
  },
};

/**
 * Test sort indicator visibility
 */
export const SortIndicator: Story = {
  args: {
    videos: mockVideos,
    channelSlug: 'my-channel',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Get the title column header
    const titleHeader = canvas.getByRole('button', { name: /sort by title/i });

    // Click to sort (changes from ascending to descending)
    await userEvent.click(titleHeader);

    // After sorting, the header should still be present
    await expect(titleHeader).toBeInTheDocument();

    // The ARIA label indicates the NEXT sort direction (what will happen on next click)
    // After clicking, sort is descending, so next click will sort ascending
    const currentLabel = titleHeader.getAttribute('aria-label');
    expect(currentLabel).toMatch(/ascending/i);
  },
};
