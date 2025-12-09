import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import {
  RevisionHistoryPanel,
  type DocumentRevision,
} from './revision-history-panel';

/**
 * RevisionHistoryPanel Stories
 *
 * This panel displays the version history of a document, allowing users
 * to view and restore previous versions.
 */
const meta = {
  title: 'Document/RevisionHistoryPanel',
  component: RevisionHistoryPanel,
  parameters: {
    layout: 'centered',
  },
  args: {
    onViewRevision: fn(),
    onRestoreRevision: fn(),
  },
  decorators: [
    (Story) => (
      <div
        style={{ width: '350px', height: '600px', border: '1px solid #ccc' }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RevisionHistoryPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Sample revision data
 */
const sampleRevisions: DocumentRevision[] = [
  {
    id: '1',
    version: 10,
    createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    createdBy: 'John Doe',
    contentPreview:
      'Updated the intro section with new statistics and examples',
  },
  {
    id: '2',
    version: 9,
    createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    createdBy: 'Jane Smith',
    contentPreview: 'Fixed typos and improved clarity in section 3',
  },
  {
    id: '3',
    version: 8,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
    createdBy: 'John Doe',
    contentPreview: 'Added new section about best practices',
  },
  {
    id: '4',
    version: 7,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    createdBy: 'Jane Smith',
    contentPreview: 'Initial draft of the video script',
  },
  {
    id: '5',
    version: 6,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    createdBy: 'John Doe',
    contentPreview: 'Restructured content for better flow',
  },
];

/**
 * Default state with multiple revisions
 */
export const Default: Story = {
  args: {
    revisions: sampleRevisions,
    currentVersion: 10,
    isLoading: false,
    isRestoring: false,
  },
};

/**
 * Loading state
 */
export const Loading: Story = {
  args: {
    revisions: [],
    currentVersion: 1,
    isLoading: true,
    isRestoring: false,
  },
};

/**
 * Empty state (no revisions yet)
 */
export const Empty: Story = {
  args: {
    revisions: [],
    currentVersion: 1,
    isLoading: false,
    isRestoring: false,
  },
};

/**
 * Restoring a revision
 */
export const Restoring: Story = {
  args: {
    revisions: sampleRevisions,
    currentVersion: 10,
    isLoading: false,
    isRestoring: true,
    restoringRevisionId: '3',
  },
};

/**
 * Single revision
 */
export const SingleRevision: Story = {
  args: {
    revisions: [
      {
        id: '1',
        version: 2,
        createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        createdBy: 'John Doe',
        contentPreview: 'First save after initial creation',
      },
    ],
    currentVersion: 3,
    isLoading: false,
    isRestoring: false,
  },
};

/**
 * Many revisions (scrollable)
 */
export const ManyRevisions: Story = {
  args: {
    revisions: Array.from({ length: 20 }, (_, i) => ({
      id: String(i + 1),
      version: 30 - i,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * i), // i hours ago
      createdBy: i % 2 === 0 ? 'John Doe' : 'Jane Smith',
      contentPreview: `Revision ${30 - i}: Updated content with various changes and improvements`,
    })),
    currentVersion: 30,
    isLoading: false,
    isRestoring: false,
  },
};

/**
 * Revisions without authors
 */
export const WithoutAuthors: Story = {
  args: {
    revisions: sampleRevisions.map((rev) => ({
      ...rev,
      createdBy: null,
    })),
    currentVersion: 10,
    isLoading: false,
    isRestoring: false,
  },
};

/**
 * Revisions without content preview
 */
export const WithoutPreview: Story = {
  args: {
    revisions: sampleRevisions.map((rev) => {
      const { contentPreview: _contentPreview, ...rest } = rev;
      return rest;
    }),
    currentVersion: 10,
    isLoading: false,
    isRestoring: false,
  },
};
