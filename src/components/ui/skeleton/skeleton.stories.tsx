import type { Meta, StoryObj } from '@storybook/react';
import { within, expect } from '@storybook/test';
import { Skeleton } from './skeleton';
import { VideoCardSkeleton } from './video-card-skeleton';
import { DocumentEditorSkeleton } from './document-editor-skeleton';

/**
 * Skeleton Component Stories
 *
 * Demonstrates loading placeholders with shimmer animation.
 */
const meta: Meta<typeof Skeleton> = {
  title: 'UI/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    width: {
      control: 'text',
      description: 'Width of the skeleton',
    },
    height: {
      control: 'text',
      description: 'Height of the skeleton',
    },
    variant: {
      control: 'select',
      options: ['text', 'rectangular', 'circular'],
      description: 'Shape variant',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

// =============================================================================
// BASIC STORIES
// =============================================================================

export const Text: Story = {
  args: {
    variant: 'text',
    width: '100%',
    height: '1rem',
  },
};

export const Rectangular: Story = {
  args: {
    variant: 'rectangular',
    width: '10rem',
    height: '6rem',
  },
};

export const Circular: Story = {
  args: {
    variant: 'circular',
    width: '4rem',
    height: '4rem',
  },
};

// =============================================================================
// PATTERN STORIES
// =============================================================================

export const TextBlock: Story = {
  render: () => (
    <div style={{ width: '100%', maxWidth: '40rem' }}>
      <Skeleton width="100%" height="1rem" variant="text" />
      <Skeleton width="100%" height="1rem" variant="text" />
      <Skeleton width="60%" height="1rem" variant="text" />
    </div>
  ),
};

export const ProfileCard: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: '1rem',
        padding: '1rem',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
      }}
    >
      <Skeleton variant="circular" width="4rem" height="4rem" />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        <Skeleton width="60%" height="1.5rem" variant="text" />
        <Skeleton width="100%" height="1rem" variant="text" />
        <Skeleton width="40%" height="1rem" variant="text" />
      </div>
    </div>
  ),
};

// =============================================================================
// SPECIALIZED SKELETONS
// =============================================================================

export const VideoCard: Story = {
  render: () => <VideoCardSkeleton />,
};

export const VideoCardGrid: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))',
        gap: '1rem',
      }}
    >
      <VideoCardSkeleton />
      <VideoCardSkeleton />
      <VideoCardSkeleton />
      <VideoCardSkeleton />
    </div>
  ),
};

export const DocumentEditor: Story = {
  render: () => <DocumentEditorSkeleton />,
};

// =============================================================================
// INTERACTION TESTS
// =============================================================================

/**
 * Test that skeleton has proper ARIA attributes
 */
export const AccessibilityAttributes: Story = {
  args: {
    variant: 'text',
    width: '10rem',
    height: '1rem',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Check for aria-busy attribute
    const skeleton = canvasElement.querySelector('[aria-busy="true"]');
    expect(skeleton).toBeInTheDocument();

    // Check for aria-label
    const labeledElement = canvas.getByLabelText('Loading');
    expect(labeledElement).toBeInTheDocument();
  },
};

/**
 * Test VideoCardSkeleton accessibility
 */
export const VideoCardAccessibility: Story = {
  render: () => <VideoCardSkeleton />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Check for aria-busy attribute
    const skeleton = canvas.getByLabelText('Loading video');
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
  },
};

/**
 * Test DocumentEditorSkeleton accessibility
 */
export const DocumentEditorAccessibility: Story = {
  render: () => <DocumentEditorSkeleton />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Check for aria-busy attribute
    const skeleton = canvas.getByLabelText('Loading document editor');
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
  },
};
