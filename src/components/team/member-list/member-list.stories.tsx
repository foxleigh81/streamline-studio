import type { Meta, StoryObj } from '@storybook/react';
import { MemberList } from './member-list';
import type { TeamMember } from './member-list';

/**
 * Member List Component Story
 *
 * Displays a table of workspace team members with role management.
 */
const meta: Meta<typeof MemberList> = {
  title: 'Team/MemberList',
  component: MemberList,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof MemberList>;

const mockMembers: TeamMember[] = [
  {
    userId: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'owner',
    joinedAt: new Date('2024-01-15'),
  },
  {
    userId: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'editor',
    joinedAt: new Date('2024-02-20'),
  },
  {
    userId: '3',
    name: 'Bob Wilson',
    email: 'bob@example.com',
    role: 'viewer',
    joinedAt: new Date('2024-03-10'),
  },
];

/**
 * Owner view with all members
 */
export const OwnerView: Story = {
  args: {
    members: mockMembers,
    currentUserRole: 'owner',
    currentUserId: '1',
    onRoleUpdate: async (userId, role) => {
      // eslint-disable-next-line no-console
      console.log(`Update role for ${userId} to ${role}`);
    },
    onRemove: async (userId) => {
      // eslint-disable-next-line no-console
      console.log(`Remove user ${userId}`);
    },
  },
};

/**
 * Editor view (no role management)
 */
export const EditorView: Story = {
  args: {
    members: mockMembers,
    currentUserRole: 'editor',
    currentUserId: '2',
    onRoleUpdate: async (userId, role) => {
      // eslint-disable-next-line no-console
      console.log(`Update role for ${userId} to ${role}`);
    },
    onRemove: async (userId) => {
      // eslint-disable-next-line no-console
      console.log(`Remove user ${userId}`);
    },
  },
};

/**
 * Viewer view (no role management)
 */
export const ViewerView: Story = {
  args: {
    members: mockMembers,
    currentUserRole: 'viewer',
    currentUserId: '3',
    onRoleUpdate: async (userId, role) => {
      // eslint-disable-next-line no-console
      console.log(`Update role for ${userId} to ${role}`);
    },
    onRemove: async (userId) => {
      // eslint-disable-next-line no-console
      console.log(`Remove user ${userId}`);
    },
  },
};

/**
 * Empty state
 */
export const Empty: Story = {
  args: {
    members: [],
    currentUserRole: 'owner',
    currentUserId: '1',
    onRoleUpdate: async (userId, role) => {
      // eslint-disable-next-line no-console
      console.log(`Update role for ${userId} to ${role}`);
    },
    onRemove: async (userId) => {
      // eslint-disable-next-line no-console
      console.log(`Remove user ${userId}`);
    },
  },
};

/**
 * Loading state
 */
export const Loading: Story = {
  args: {
    members: mockMembers,
    currentUserRole: 'owner',
    currentUserId: '1',
    isLoading: true,
    onRoleUpdate: async (userId, role) => {
      // eslint-disable-next-line no-console
      console.log(`Update role for ${userId} to ${role}`);
    },
    onRemove: async (userId) => {
      // eslint-disable-next-line no-console
      console.log(`Remove user ${userId}`);
    },
  },
};
