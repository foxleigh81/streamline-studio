import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreateChannelModal } from './create-channel-modal';

/**
 * Create Channel Modal Component Story
 *
 * Modal for creating a new channel in multi-tenant mode.
 *
 * Note: This component requires Next.js App Router, so automated tests are skipped.
 * Manual testing should be done in the actual Next.js application.
 */
const meta: Meta<typeof CreateChannelModal> = {
  title: 'Channel/CreateChannelModal',
  component: CreateChannelModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs', 'skip-test'],
};

export default meta;
type Story = StoryObj<typeof CreateChannelModal>;

/**
 * Wrapper component for Default story
 */
function DefaultStory() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <CreateChannelModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
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
