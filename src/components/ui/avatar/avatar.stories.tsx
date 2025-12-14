import type { Meta, StoryObj } from '@storybook/react';
import { within, expect } from '@storybook/test';
import { Avatar } from './avatar';

/**
 * Avatar Component Stories
 *
 * Demonstrates avatar variants with different data sources, sizes, and states.
 * Includes interaction tests for accessibility verification.
 *
 * @see /docs/adrs/003-storybook-integration.md
 */
const meta: Meta<typeof Avatar> = {
  title: 'UI/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    name: {
      control: 'text',
      description: "User's display name (used for initials)",
    },
    email: {
      control: 'text',
      description: 'User email (fallback for initials if no name)',
    },
    src: {
      control: 'text',
      description: 'Optional image URL',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size variant',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

// =============================================================================
// DATA SOURCE STORIES
// =============================================================================

/**
 * Avatar with full name (most common use case)
 */
export const Default: Story = {
  args: {
    name: 'John Doe',
    email: 'john.doe@example.com',
  },
};

/**
 * Avatar with email only (no name set)
 */
export const WithEmail: Story = {
  args: {
    email: 'alice@example.com',
  },
};

/**
 * Avatar with profile image
 */
export const WithImage: Story = {
  args: {
    name: 'Sarah Connor',
    email: 'sarah@example.com',
    src: 'https://i.pravatar.cc/150?img=1',
  },
};

/**
 * Avatar with single word name
 */
export const SingleName: Story = {
  args: {
    name: 'Alice',
    email: 'alice@example.com',
  },
};

/**
 * Avatar with long multi-word name
 */
export const LongName: Story = {
  args: {
    name: 'Mary Jane Watson Parker',
    email: 'mary.jane@example.com',
  },
};

/**
 * Avatar with no data (fallback state)
 */
export const NoData: Story = {
  args: {},
};

// =============================================================================
// SIZE STORIES
// =============================================================================

/**
 * Small avatar (32px)
 */
export const Small: Story = {
  args: {
    name: 'Small Avatar',
    size: 'sm',
  },
};

/**
 * Medium avatar (40px, default)
 */
export const Medium: Story = {
  args: {
    name: 'Medium Avatar',
    size: 'md',
  },
};

/**
 * Large avatar (56px)
 */
export const Large: Story = {
  args: {
    name: 'Large Avatar',
    size: 'lg',
  },
};

// =============================================================================
// COLOR VARIETY DEMONSTRATION
// =============================================================================

/**
 * Shows how different names generate different colors
 */
export const ColorVariety: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
      <Avatar name="Alice Anderson" />
      <Avatar name="Bob Brown" />
      <Avatar name="Charlie Chen" />
      <Avatar name="Diana Davis" />
      <Avatar name="Eve Evans" />
      <Avatar name="Frank Foster" />
      <Avatar name="Grace Green" />
      <Avatar name="Henry Harris" />
    </div>
  ),
};

/**
 * Shows all three sizes together
 */
export const SizeComparison: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
      }}
    >
      <Avatar name="Small" size="sm" />
      <Avatar name="Medium" size="md" />
      <Avatar name="Large" size="lg" />
    </div>
  ),
};

// =============================================================================
// INTERACTION TESTS
// =============================================================================

/**
 * Test that avatar has correct aria-label for accessibility
 */
export const AccessibleLabel: Story = {
  args: {
    name: 'Test User',
    email: 'test@example.com',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Avatar should have aria-label matching the name
    const avatar = canvas.getByLabelText('Test User');
    await expect(avatar).toBeInTheDocument();
  },
};

/**
 * Test that initials are generated correctly
 */
export const InitialsGeneration: Story = {
  args: {
    name: 'Jane Smith',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Avatar should exist
    const avatar = canvas.getByLabelText('Jane Smith');
    await expect(avatar).toBeInTheDocument();

    // Should contain initials "JS"
    await expect(avatar.textContent).toBe('JS');
  },
};

/**
 * Test that email fallback works when no name
 */
export const EmailFallback: Story = {
  args: {
    email: 'fallback@example.com',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Avatar should use email for aria-label
    const avatar = canvas.getByLabelText('fallback@example.com');
    await expect(avatar).toBeInTheDocument();

    // Should show first 2 letters of email username (FA)
    await expect(avatar.textContent).toBe('FA');
  },
};

/**
 * Test that image is rendered when src is provided
 */
export const ImageRendering: Story = {
  args: {
    name: 'Image User',
    src: 'https://i.pravatar.cc/150?img=5',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Should render an image with correct alt text
    const image = canvas.getByAltText('Image User');
    await expect(image).toBeInTheDocument();
    await expect(image.tagName).toBe('IMG');
  },
};

/**
 * Test fallback state with no data
 */
export const FallbackState: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Avatar should have fallback aria-label
    const avatar = canvas.getByLabelText('User avatar');
    await expect(avatar).toBeInTheDocument();

    // Should show question mark
    await expect(avatar.textContent).toBe('?');
  },
};
