import type { Meta, StoryObj } from '@storybook/react';
import { WorkspaceSwitcher } from './workspace-switcher';

/**
 * Workspace Switcher Component Story
 *
 * Displays the current workspace and allows switching between workspaces.
 *
 * Note: This component requires Next.js App Router, so automated tests are skipped.
 * Manual testing should be done in the actual Next.js application.
 */
const meta: Meta<typeof WorkspaceSwitcher> = {
  title: 'Workspace/WorkspaceSwitcher',
  component: WorkspaceSwitcher,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs', 'skip-test'],
};

export default meta;
type Story = StoryObj<typeof WorkspaceSwitcher>;

/**
 * Default workspace switcher with current workspace
 */
export const Default: Story = {
  args: {
    workspaceSlug: 'acme-corp',
    workspaceName: 'Acme Corporation',
  },
};

/**
 * Workspace switcher with create callback
 */
export const WithCreateOption: Story = {
  args: {
    workspaceSlug: 'my-workspace',
    workspaceName: 'My Workspace',
    onCreateWorkspace: () => alert('Create workspace clicked'),
  },
};

/**
 * Workspace switcher without name (slug only)
 */
export const SlugOnly: Story = {
  args: {
    workspaceSlug: 'test-workspace',
  },
};
