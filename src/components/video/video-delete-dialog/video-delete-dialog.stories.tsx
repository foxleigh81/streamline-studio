import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { within, userEvent, expect, waitFor } from '@storybook/test';
import { VideoDeleteDialog } from './video-delete-dialog';
import { Button } from '@/components/ui/button';

/**
 * VideoDeleteDialog Component Stories
 *
 * Demonstrates the video deletion confirmation dialog.
 */
const meta: Meta<typeof VideoDeleteDialog> = {
  title: 'Video/VideoDeleteDialog',
  component: VideoDeleteDialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof VideoDeleteDialog>;

// =============================================================================
// INTERACTIVE WRAPPER
// =============================================================================

/**
 * Wrapper component for interactive stories
 */
function InteractiveWrapper({
  videoTitle,
  simulateDelay = false,
}: {
  videoTitle: string;
  simulateDelay?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (simulateDelay) {
      setIsDeleting(true);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setIsDeleting(false);
    }
    setIsOpen(false);
    alert('Video deleted!');
  };

  return (
    <div>
      <Button onClick={() => setIsOpen(true)} variant="destructive">
        Delete Video
      </Button>
      <VideoDeleteDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleConfirm}
        videoTitle={videoTitle}
        isDeleting={isDeleting}
      />
    </div>
  );
}

// =============================================================================
// BASIC STORIES
// =============================================================================

export const Default: Story = {
  render: () => <InteractiveWrapper videoTitle="How to Build a Next.js App" />,
};

export const LongTitle: Story = {
  render: () => (
    <InteractiveWrapper videoTitle="An Extremely Long Video Title That Should Wrap Properly in the Dialog" />
  ),
};

export const WithLoadingState: Story = {
  render: () => (
    <InteractiveWrapper videoTitle="TypeScript Tutorial" simulateDelay />
  ),
};

export const AlreadyOpen: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    onConfirm: async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    },
    videoTitle: 'React Hooks Deep Dive',
    isDeleting: false,
  },
};

export const DeletingState: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    onConfirm: async () => {},
    videoTitle: 'CSS Grid Tutorial',
    isDeleting: true,
  },
};

// =============================================================================
// INTERACTION TESTS
// =============================================================================

/**
 * Test opening dialog
 */
export const OpenDialog: Story = {
  render: () => <InteractiveWrapper videoTitle="Test Video" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const openButton = canvas.getByRole('button', { name: /delete video/i });

    // Click to open dialog
    await userEvent.click(openButton);

    // Radix UI AlertDialog renders in a portal outside the canvas
    const body = within(document.body);
    await waitFor(() => {
      const dialog = body.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });
  },
};

/**
 * Test closing with cancel button
 */
export const CloseWithCancel: Story = {
  render: () => <InteractiveWrapper videoTitle="Test Video" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Open dialog
    const openButton = canvas.getByRole('button', { name: /delete video/i });
    await userEvent.click(openButton);

    // Radix UI AlertDialog renders in a portal outside the canvas
    const body = within(document.body);
    await waitFor(() => {
      expect(body.getByRole('dialog')).toBeInTheDocument();
    });

    // Click cancel
    const cancelButton = body.getByRole('button', { name: /cancel/i });
    await userEvent.click(cancelButton);

    // Dialog should close
    await waitFor(() => {
      expect(body.queryByRole('dialog')).not.toBeInTheDocument();
    });
  },
};

/**
 * Test closing with X button
 */
export const CloseWithX: Story = {
  render: () => <InteractiveWrapper videoTitle="Test Video" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Open dialog
    const openButton = canvas.getByRole('button', { name: /delete video/i });
    await userEvent.click(openButton);

    // Radix UI AlertDialog renders in a portal outside the canvas
    const body = within(document.body);
    await waitFor(() => {
      expect(body.getByRole('dialog')).toBeInTheDocument();
    });

    // Click X button
    const closeButton = body.getByRole('button', { name: /close/i });
    await userEvent.click(closeButton);

    // Dialog should close
    await waitFor(() => {
      expect(body.queryByRole('dialog')).not.toBeInTheDocument();
    });
  },
};

/**
 * Test keyboard accessibility (Escape key)
 */
export const KeyboardClose: Story = {
  render: () => <InteractiveWrapper videoTitle="Test Video" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Open dialog
    const openButton = canvas.getByRole('button', { name: /delete video/i });
    await userEvent.click(openButton);

    // Radix UI AlertDialog renders in a portal outside the canvas
    const body = within(document.body);
    await waitFor(() => {
      expect(body.getByRole('dialog')).toBeInTheDocument();
    });

    // Press Escape
    await userEvent.keyboard('{Escape}');

    // Dialog should close
    await waitFor(() => {
      expect(body.queryByRole('dialog')).not.toBeInTheDocument();
    });
  },
};
