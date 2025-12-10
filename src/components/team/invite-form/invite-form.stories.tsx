import type { Meta, StoryObj } from '@storybook/react';
import { InviteForm } from './invite-form';
import type { PendingInvitation } from './invite-form';

/**
 * Invite Form Component Story
 *
 * Form for inviting new members to a workspace.
 */
const meta: Meta<typeof InviteForm> = {
  title: 'Team/InviteForm',
  component: InviteForm,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof InviteForm>;

const mockPendingInvitations: PendingInvitation[] = [
  {
    id: '1',
    email: 'colleague@example.com',
    role: 'editor',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    createdAt: new Date(),
  },
  {
    id: '2',
    email: 'viewer@example.com',
    role: 'viewer',
    expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
  },
];

/**
 * Default invite form without pending invitations
 */
export const Default: Story = {
  args: {
    onInvite: async (email, role) => {
      // eslint-disable-next-line no-console
      console.log(`Invite ${email} as ${role}`);
    },
    onRevoke: async (id) => {
      // eslint-disable-next-line no-console
      console.log(`Revoke invitation ${id}`);
    },
  },
};

/**
 * Invite form with pending invitations
 */
export const WithPendingInvitations: Story = {
  args: {
    pendingInvitations: mockPendingInvitations,
    onInvite: async (email, role) => {
      // eslint-disable-next-line no-console
      console.log(`Invite ${email} as ${role}`);
    },
    onRevoke: async (id) => {
      // eslint-disable-next-line no-console
      console.log(`Revoke invitation ${id}`);
    },
  },
};

/**
 * Loading state
 */
export const Loading: Story = {
  args: {
    pendingInvitations: mockPendingInvitations,
    isLoading: true,
    onInvite: async (email, role) => {
      // eslint-disable-next-line no-console
      console.log(`Invite ${email} as ${role}`);
    },
    onRevoke: async (id) => {
      // eslint-disable-next-line no-console
      console.log(`Revoke invitation ${id}`);
    },
  },
};
