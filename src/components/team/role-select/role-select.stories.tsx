import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { RoleSelect } from './role-select';

/**
 * Role Select Component Story
 *
 * A dropdown for selecting user roles in a workspace.
 */
const meta: Meta<typeof RoleSelect> = {
  title: 'Team/RoleSelect',
  component: RoleSelect,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof RoleSelect>;

/**
 * Wrapper component for Default story
 */
function DefaultStory() {
  const [role, setRole] = useState<'owner' | 'editor' | 'viewer'>('editor');
  return <RoleSelect value={role} onChange={setRole} label="User Role" />;
}

/**
 * Default role select
 */
export const Default: Story = {
  render: () => <DefaultStory />,
};

/**
 * Wrapper component for OwnerSelected story
 */
function OwnerSelectedStory() {
  const [role, setRole] = useState<'owner' | 'editor' | 'viewer'>('owner');
  return <RoleSelect value={role} onChange={setRole} label="User Role" />;
}

/**
 * Role select with owner selected
 */
export const OwnerSelected: Story = {
  render: () => <OwnerSelectedStory />,
};

/**
 * Wrapper component for Disabled story
 */
function DisabledStory() {
  const [role, setRole] = useState<'owner' | 'editor' | 'viewer'>('editor');
  return (
    <RoleSelect value={role} onChange={setRole} label="User Role" disabled />
  );
}

/**
 * Disabled role select
 */
export const Disabled: Story = {
  render: () => <DisabledStory />,
};

/**
 * Wrapper component for WithError story
 */
function WithErrorStory() {
  const [role, setRole] = useState<'owner' | 'editor' | 'viewer'>('editor');
  return (
    <RoleSelect
      value={role}
      onChange={setRole}
      label="User Role"
      error="Cannot change role at this time"
    />
  );
}

/**
 * Role select with error
 */
export const WithError: Story = {
  render: () => <WithErrorStory />,
};
