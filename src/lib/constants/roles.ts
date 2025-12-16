/**
 * Role Hierarchy Constants
 *
 * Centralized role hierarchy definitions to ensure consistency
 * across authorization checks.
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

import type {
  ChannelRole,
  TeamspaceRole,
  WorkspaceRole,
} from '@/server/db/schema';

/**
 * Channel role hierarchy (owner > editor > viewer)
 * Used for permission checks in channel-scoped contexts
 */
export const CHANNEL_ROLE_HIERARCHY: Record<ChannelRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

// Legacy alias
export const PROJECT_ROLE_HIERARCHY = CHANNEL_ROLE_HIERARCHY;

/**
 * Teamspace role hierarchy (owner > admin > editor > viewer)
 * Used for permission checks in teamspace-scoped contexts
 * Note: Teamspace has an additional 'admin' role
 */
export const TEAMSPACE_ROLE_HIERARCHY: Record<TeamspaceRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
};

/**
 * Workspace role hierarchy (owner > editor > viewer)
 * Used for permission checks in workspace-scoped contexts (legacy)
 * This is identical to PROJECT_ROLE_HIERARCHY (workspaces are now called projects)
 */
export const WORKSPACE_ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};
