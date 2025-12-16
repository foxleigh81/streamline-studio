import type { Meta, StoryObj } from '@storybook/react';
import { ProjectCard } from './project-card';

const meta = {
  title: 'Components/Project/ProjectCard',
  component: ProjectCard,
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
} satisfies Meta<typeof ProjectCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default project card showing owner role
 */
export const Default: Story = {
  args: {
    name: 'My Awesome Project',
    slug: 'my-awesome-project',
    role: 'owner',
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    teamspaceSlug: 'workspace',
  },
};

/**
 * Project card with owner role
 */
export const OwnerRole: Story = {
  args: {
    name: 'Main Project',
    slug: 'main-project',
    role: 'owner',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago (shows as Today)
    teamspaceSlug: 'workspace',
  },
};

/**
 * Project card with editor role
 */
export const EditorRole: Story = {
  args: {
    name: 'Collaborative Project',
    slug: 'collaborative-project',
    role: 'editor',
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    teamspaceSlug: 'workspace',
  },
};

/**
 * Project card with viewer role
 */
export const ViewerRole: Story = {
  args: {
    name: 'Read-Only Project',
    slug: 'read-only-project',
    role: 'viewer',
    updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
    teamspaceSlug: 'workspace',
  },
};

/**
 * Project card with long name
 */
export const LongName: Story = {
  args: {
    name: 'This is a Very Long Project Name That Should Wrap to Multiple Lines',
    slug: 'long-name-project',
    role: 'owner',
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    teamspaceSlug: 'workspace',
  },
};

/**
 * Old project (shows full date)
 */
export const OldProject: Story = {
  args: {
    name: 'Legacy Project',
    slug: 'legacy-project',
    role: 'viewer',
    updatedAt: new Date('2023-03-15'),
    teamspaceSlug: 'workspace',
  },
};

/**
 * Multiple project cards in a grid
 */
export const Grid: Story = {
  args: {
    name: 'Project Alpha',
    slug: 'project-alpha',
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
      <ProjectCard {...args} />
      <ProjectCard
        name="Project Beta"
        slug="project-beta"
        role="editor"
        updatedAt={new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)}
        teamspaceSlug="workspace"
      />
      <ProjectCard
        name="Project Gamma"
        slug="project-gamma"
        role="viewer"
        updatedAt={new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)}
        teamspaceSlug="workspace"
      />
      <ProjectCard
        name="Project Delta"
        slug="project-delta"
        role="owner"
        updatedAt={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
        teamspaceSlug="workspace"
      />
    </div>
  ),
};
