import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreateWorkspaceModal } from './create-workspace-modal';

/**
 * Create Workspace Modal Component Story
 *
 * Modal for creating a new workspace in multi-tenant mode.
 *
 * Note: This component requires Next.js App Router, so automated tests are skipped.
 * Manual testing should be done in the actual Next.js application.
 */
const meta: Meta<typeof CreateWorkspaceModal> = {
  title: 'Workspace/CreateWorkspaceModal',
  component: CreateWorkspaceModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs', 'skip-test'],
};

export default meta;
type Story = StoryObj<typeof CreateWorkspaceModal>;

/**
 * Wrapper component for Default story
 */
function DefaultStory() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <CreateWorkspaceModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

/**
 * Default modal (closed)
 */
export const Default: Story = {
  render: () => <DefaultStory />,
};

/**
 * Modal open by default
 */
export const Open: Story = {
  args: {
    isOpen: true,
    // eslint-disable-next-line no-console
    onClose: () => console.log('Modal closed'),
  },
};
