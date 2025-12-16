/**
 * Permission Gate Component Stories
 *
 * Demonstrates permission-based rendering with different roles.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { PermissionGate } from './permission-gate';
import {
  ProjectContext,
  type ProjectContextValue,
} from '@/lib/project/context';
import {
  TeamspaceContext,
  type TeamspaceContextValue,
} from '@/lib/teamspace/context';

/**
 * Mock teamspace context for Storybook
 */
const mockTeamspaceContext: TeamspaceContextValue = {
  teamspace: {
    id: 'mock-teamspace-id',
    name: 'Mock Teamspace',
    slug: 'mock-teamspace',
    createdAt: new Date(),
  },
  role: 'admin',
  isLoading: false,
  error: null,
  refresh: async () => {},
};

/**
 * Mock project context for Storybook
 */
const mockProjectContext: ProjectContextValue = {
  project: {
    id: 'mock-project-id',
    name: 'Mock Project',
    slug: 'mock-project',
    teamspaceId: 'mock-teamspace-id',
    mode: 'multi-tenant',
    createdAt: new Date(),
  },
  role: 'owner',
  isLoading: false,
  error: null,
  refresh: async () => {},
};

/**
 * Decorator that provides mock context providers for permission stories
 */
const withMockProviders = (Story: React.ComponentType) => (
  <TeamspaceContext.Provider value={mockTeamspaceContext}>
    <ProjectContext.Provider value={mockProjectContext}>
      <Story />
    </ProjectContext.Provider>
  </TeamspaceContext.Provider>
);

/**
 * Permission Gate allows conditional rendering based on user permissions.
 *
 * Use cases:
 * - Show/hide edit buttons
 * - Restrict access to admin panels
 * - Display role-specific content
 */
const meta = {
  title: 'UI/PermissionGate',
  component: PermissionGate,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [withMockProviders],
} satisfies Meta<typeof PermissionGate>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic usage - content shown when user has permission
 */
export const CanEdit: Story = {
  args: {
    requires: 'canEdit',
    children: (
      <div
        style={{
          padding: '1rem',
          border: '2px solid green',
          borderRadius: '4px',
        }}
      >
        <strong>Edit Mode Enabled</strong>
        <p>User has edit permissions</p>
      </div>
    ),
  },
};

/**
 * Admin permission check
 */
export const CanAdmin: Story = {
  args: {
    requires: 'canAdmin',
    children: (
      <div
        style={{
          padding: '1rem',
          border: '2px solid blue',
          borderRadius: '4px',
        }}
      >
        <strong>Admin Panel</strong>
        <p>User has admin permissions</p>
      </div>
    ),
  },
};

/**
 * With fallback content when permission is denied
 */
export const WithFallback: Story = {
  args: {
    requires: 'isOwner',
    children: (
      <div
        style={{
          padding: '1rem',
          border: '2px solid purple',
          borderRadius: '4px',
        }}
      >
        <strong>Owner Actions</strong>
        <button>Delete Project</button>
      </div>
    ),
    fallback: (
      <div
        style={{
          padding: '1rem',
          border: '2px solid orange',
          borderRadius: '4px',
        }}
      >
        <strong>Limited Access</strong>
        <p>You need owner permissions to perform this action</p>
      </div>
    ),
  },
};

/**
 * Teamspace management permission
 */
export const TeamspaceManagement: Story = {
  args: {
    requires: 'canManageTeamspace',
    children: (
      <div
        style={{
          padding: '1rem',
          border: '2px solid teal',
          borderRadius: '4px',
        }}
      >
        <strong>Teamspace Settings</strong>
        <p>Manage teamspace members and settings</p>
      </div>
    ),
  },
};
