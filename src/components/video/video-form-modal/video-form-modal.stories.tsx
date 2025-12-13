import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { within, userEvent, expect, waitFor } from '@storybook/test';
import { VideoFormModal } from './video-form-modal';
import type { VideoFormData } from './video-form-modal';
import type { Category } from '@/components/category/category-selector';
import { Button } from '@/components/ui/button';

/**
 * VideoFormModal Component Stories
 *
 * Demonstrates the video creation/edit form modal.
 */
const meta: Meta<typeof VideoFormModal> = {
  title: 'Video/VideoFormModal',
  component: VideoFormModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof VideoFormModal>;

// Sample categories for stories
const sampleCategories: Category[] = [
  { id: '1', name: 'Tutorial', color: '#3B82F6' },
  { id: '2', name: 'Web Dev', color: '#8B5CF6' },
  { id: '3', name: 'JavaScript', color: '#F59E0B' },
  { id: '4', name: 'TypeScript', color: '#06B6D4' },
  { id: '5', name: 'React', color: '#22C55E' },
];

// =============================================================================
// INTERACTIVE WRAPPER
// =============================================================================

/**
 * Wrapper component for interactive stories
 */
function InteractiveWrapper({
  title,
  submitButtonText,
  initialValues,
  simulateDelay = false,
}: {
  title?: string;
  submitButtonText?: string;
  initialValues?: Partial<VideoFormData>;
  simulateDelay?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: VideoFormData) => {
    // Log for debugging in Storybook
    // eslint-disable-next-line no-console
    console.log('Form submitted:', data);
    if (simulateDelay) {
      setIsSubmitting(true);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setIsSubmitting(false);
    }
    setIsOpen(false);
    alert(`Video ${submitButtonText?.toLowerCase() ?? 'created'}!`);
  };

  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>{title ?? 'Create Video'}</Button>
      <VideoFormModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSubmit={handleSubmit}
        categories={sampleCategories}
        initialValues={initialValues}
        isSubmitting={isSubmitting}
        title={title}
        submitButtonText={submitButtonText}
      />
    </div>
  );
}

// =============================================================================
// BASIC STORIES
// =============================================================================

export const CreateNew: Story = {
  render: () => (
    <InteractiveWrapper title="Create Video" submitButtonText="Create" />
  ),
};

export const EditExisting: Story = {
  render: () => (
    <InteractiveWrapper
      title="Edit Video"
      submitButtonText="Save Changes"
      initialValues={{
        title: 'How to Build a Next.js App',
        description:
          'A comprehensive guide to building modern web applications.',
        status: 'scripting',
        dueDate: '2025-12-15',
        categoryIds: ['1', '2'],
      }}
    />
  ),
};

export const WithLoadingState: Story = {
  render: () => (
    <InteractiveWrapper
      title="Create Video"
      submitButtonText="Create"
      simulateDelay
    />
  ),
};

export const NoCategories: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    onSubmit: async () => {},
    categories: [],
    title: 'Create Video',
    submitButtonText: 'Create',
  },
};

export const AlreadyOpen: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    onSubmit: async (data) => {
      // Log for debugging in Storybook
      // eslint-disable-next-line no-console
      console.log('Submit:', data);
    },
    categories: sampleCategories,
    title: 'Create Video',
    submitButtonText: 'Create',
  },
};

export const Submitting: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    onSubmit: async () => {},
    categories: sampleCategories,
    isSubmitting: true,
    title: 'Create Video',
    submitButtonText: 'Create',
  },
};

// =============================================================================
// INTERACTION TESTS
// =============================================================================

/**
 * Test opening modal
 */
export const OpenModal: Story = {
  render: () => <InteractiveWrapper />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const openButton = canvas.getByRole('button', { name: /create video/i });

    // Click to open modal
    await userEvent.click(openButton);

    // Radix UI Dialog renders in a portal outside the canvas
    const body = within(document.body);
    await waitFor(() => {
      const dialog = body.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });
  },
};

/**
 * Test form validation
 */
export const FormValidation: Story = {
  render: () => <InteractiveWrapper />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Open modal
    const openButton = canvas.getByRole('button', { name: /create video/i });
    await userEvent.click(openButton);

    // Radix UI Dialog renders in a portal outside the canvas
    const body = within(document.body);
    await waitFor(() => {
      expect(body.getByRole('dialog')).toBeInTheDocument();
    });

    // Try to submit without filling title
    const submitButton = body.getByRole('button', { name: /^create$/i });
    await userEvent.click(submitButton);

    // Wait for error message
    await waitFor(() => {
      const errorMessage = body.getByText(/title is required/i);
      expect(errorMessage).toBeInTheDocument();
    });
  },
};

/**
 * Test filling form
 */
export const FillForm: Story = {
  render: () => <InteractiveWrapper />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Open modal
    const openButton = canvas.getByRole('button', { name: /create video/i });
    await userEvent.click(openButton);

    // Radix UI Dialog renders in a portal outside the canvas
    const body = within(document.body);
    await waitFor(() => {
      expect(body.getByRole('dialog')).toBeInTheDocument();
    });

    // Fill title
    const titleInput = body.getByLabelText(/title/i);
    await userEvent.type(titleInput, 'My New Video');

    // Verify value
    await expect(titleInput).toHaveValue('My New Video');
  },
};

/**
 * Test closing with cancel
 */
export const CloseWithCancel: Story = {
  render: () => <InteractiveWrapper />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Open modal
    const openButton = canvas.getByRole('button', { name: /create video/i });
    await userEvent.click(openButton);

    // Radix UI Dialog renders in a portal outside the canvas
    const body = within(document.body);
    await waitFor(() => {
      expect(body.getByRole('dialog')).toBeInTheDocument();
    });

    // Click cancel
    const cancelButton = body.getByRole('button', { name: /cancel/i });
    await userEvent.click(cancelButton);

    // Modal should close
    await waitFor(() => {
      expect(body.queryByRole('dialog')).not.toBeInTheDocument();
    });
  },
};
