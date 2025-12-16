import type { Meta, StoryObj } from '@storybook/react';
import { ChannelSwitcher } from './channel-switcher';

/**
 * Channel Switcher Component Story
 *
 * Displays the current channel and allows switching between channels.
 *
 * Note: This component requires Next.js App Router, so automated tests are skipped.
 * Manual testing should be done in the actual Next.js application.
 */
const meta: Meta<typeof ChannelSwitcher> = {
  title: 'Channel/ChannelSwitcher',
  component: ChannelSwitcher,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs', 'skip-test'],
};

export default meta;
type Story = StoryObj<typeof ChannelSwitcher>;

/**
 * Default channel switcher with current channel
 */
export const Default: Story = {
  args: {
    channelSlug: 'acme-corp',
    channelName: 'Acme Corporation',
  },
};

/**
 * Channel switcher with create callback
 */
export const WithCreateOption: Story = {
  args: {
    channelSlug: 'my-channel',
    channelName: 'My Channel',
    onCreateChannel: () => alert('Create channel clicked'),
  },
};

/**
 * Channel switcher without name (slug only)
 */
export const SlugOnly: Story = {
  args: {
    channelSlug: 'test-channel',
  },
};
