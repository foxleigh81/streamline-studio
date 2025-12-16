import type { Meta, StoryObj } from '@storybook/react';
import { ChannelCard } from './channel-card';

const meta = {
  title: 'Components/Channel/ChannelCard',
  component: ChannelCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    role: {
      control: 'select',
      options: ['owner', 'editor', 'viewer'],
    },
  },
} satisfies Meta<typeof ChannelCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default channel card showing owner role
 */
export const Default: Story = {
  args: {
    name: 'My Awesome Channel',
    slug: 'my-awesome-channel',
    role: 'owner',
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    teamspaceSlug: 'workspace',
  },
};

/**
 * Channel card with owner role
 */
export const OwnerRole: Story = {
  args: {
    name: 'Main Channel',
    slug: 'main-channel',
    role: 'owner',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago (shows as Today)
    teamspaceSlug: 'workspace',
  },
};

/**
 * Channel card with editor role
 */
export const EditorRole: Story = {
  args: {
    name: 'Collaborative Channel',
    slug: 'collaborative-channel',
    role: 'editor',
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    teamspaceSlug: 'workspace',
  },
};

/**
 * Channel card with viewer role
 */
export const ViewerRole: Story = {
  args: {
    name: 'Read-Only Channel',
    slug: 'read-only-channel',
    role: 'viewer',
    updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
    teamspaceSlug: 'workspace',
  },
};

/**
 * Channel card with long name
 */
export const LongName: Story = {
  args: {
    name: 'This is a Very Long Channel Name That Should Wrap to Multiple Lines',
    slug: 'long-name-channel',
    role: 'owner',
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    teamspaceSlug: 'workspace',
  },
};

/**
 * Old channel (shows full date)
 */
export const OldChannel: Story = {
  args: {
    name: 'Legacy Channel',
    slug: 'legacy-channel',
    role: 'viewer',
    updatedAt: new Date('2023-03-15'),
    teamspaceSlug: 'workspace',
  },
};

/**
 * Multiple channel cards in a grid
 */
export const Grid: Story = {
  args: {
    name: 'Channel Alpha',
    slug: 'channel-alpha',
    role: 'owner',
    updatedAt: new Date(),
    teamspaceSlug: 'workspace',
  },
  render: (args) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1rem',
        padding: '1rem',
      }}
    >
      <ChannelCard {...args} />
      <ChannelCard
        name="Channel Beta"
        slug="channel-beta"
        role="editor"
        updatedAt={new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)}
        teamspaceSlug="workspace"
      />
      <ChannelCard
        name="Channel Gamma"
        slug="channel-gamma"
        role="viewer"
        updatedAt={new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)}
        teamspaceSlug="workspace"
      />
      <ChannelCard
        name="Channel Delta"
        slug="channel-delta"
        role="owner"
        updatedAt={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
        teamspaceSlug="workspace"
      />
    </div>
  ),
};
