import type { Meta, StoryObj } from '@storybook/react';
import { ProjectSwitcher } from './project-switcher';

/**
 * Project Switcher Component Story
 *
 * Displays the current project and allows switching between projects.
 *
 * Note: This component requires Next.js App Router, so automated tests are skipped.
 * Manual testing should be done in the actual Next.js application.
 */
const meta: Meta<typeof ProjectSwitcher> = {
  title: 'Project/ProjectSwitcher',
  component: ProjectSwitcher,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs', 'skip-test'],
};

export default meta;
type Story = StoryObj<typeof ProjectSwitcher>;

/**
 * Default project switcher with current project
 */
export const Default: Story = {
  args: {
    projectSlug: 'acme-corp',
    projectName: 'Acme Corporation',
  },
};

/**
 * Project switcher with create callback
 */
export const WithCreateOption: Story = {
  args: {
    projectSlug: 'my-project',
    projectName: 'My Project',
    onCreateProject: () => alert('Create project clicked'),
  },
};

/**
 * Project switcher without name (slug only)
 */
export const SlugOnly: Story = {
  args: {
    projectSlug: 'test-project',
  },
};
