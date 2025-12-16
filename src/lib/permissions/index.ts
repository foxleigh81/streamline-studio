/**
 * Permission Hooks
 *
 * Utility hooks for checking user permissions across teamspaces and channels.
 * These hooks combine teamspace and channel contexts to provide simple permission checks.
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 */

'use client';

import { useTeamspaceRole as getTeamspaceRole } from '@/lib/teamspace';
import { useChannelRole as getChannelRole } from '@/lib/channel';
import type { TeamspaceRole, ChannelRole } from '@/server/db/schema';
import {
  CHANNEL_ROLE_HIERARCHY,
  TEAMSPACE_ROLE_HIERARCHY,
} from '@/lib/constants/roles';

/**
 * Hook to get the current teamspace role
 * Convenience re-export for easy access
 */
export function useTeamspaceRole(): TeamspaceRole | null {
  // Re-export from teamspace module
  return getTeamspaceRole();
}

/**
 * Hook to get the current channel role (effective role)
 * Convenience re-export for easy access
 */
export function useChannelRole(): ChannelRole | null {
  // Re-export from channel module
  return getChannelRole();
}

/**
 * Hook to check if user can edit content in the current context
 *
 * This checks the effective channel role, which includes:
 * - Direct channel role with overrides
 * - Inherited teamspace role
 * - Teamspace admin/owner privileges
 *
 * @returns true if user has editor or owner role in the channel
 *
 * @example
 * ```tsx
 * function EditButton() {
 *   const canEdit = useCanEdit();
 *   if (!canEdit) return null;
 *   return <button>Edit</button>;
 * }
 * ```
 */
export function useCanEdit(): boolean {
  const channelRole = useChannelRole();
  if (!channelRole) return false;

  const hierarchy = CHANNEL_ROLE_HIERARCHY[channelRole];
  const editorLevel = CHANNEL_ROLE_HIERARCHY['editor'];
  return (
    hierarchy !== undefined &&
    editorLevel !== undefined &&
    hierarchy >= editorLevel
  );
}

/**
 * Hook to check if user can perform admin actions in the current channel
 *
 * @returns true if user has owner role in the channel (or is teamspace admin/owner)
 *
 * @example
 * ```tsx
 * function ChannelSettings() {
 *   const canAdmin = useCanAdmin();
 *   if (!canAdmin) return null;
 *   return <SettingsPanel />;
 * }
 * ```
 */
export function useCanAdmin(): boolean {
  const channelRole = useChannelRole();
  return channelRole === 'owner';
}

/**
 * Hook to check if user is the channel owner
 * Note: Teamspace admins/owners also have owner access to all channels
 *
 * @returns true if user is channel owner (or teamspace admin/owner)
 *
 * @example
 * ```tsx
 * function DeleteChannelButton() {
 *   const isOwner = useIsOwner();
 *   if (!isOwner) return null;
 *   return <button>Delete Channel</button>;
 * }
 * ```
 */
export function useIsOwner(): boolean {
  return useCanAdmin(); // Same as admin for now
}

/**
 * Hook to check if user can manage the teamspace
 * (admin or owner role in teamspace)
 *
 * @returns true if user has admin or owner role in the teamspace
 *
 * @example
 * ```tsx
 * function TeamspaceSettings() {
 *   const canManageTeamspace = useCanManageTeamspace();
 *   if (!canManageTeamspace) return null;
 *   return <TeamSettingsPanel />;
 * }
 * ```
 */
export function useCanManageTeamspace(): boolean {
  const teamspaceRole = useTeamspaceRole();
  if (!teamspaceRole) return false;

  return (
    TEAMSPACE_ROLE_HIERARCHY[teamspaceRole] >= TEAMSPACE_ROLE_HIERARCHY.admin
  );
}

/**
 * Hook to check if user is the teamspace owner
 *
 * @returns true if user is teamspace owner
 *
 * @example
 * ```tsx
 * function DeleteTeamspaceButton() {
 *   const isTeamspaceOwner = useIsTeamspaceOwner();
 *   if (!isTeamspaceOwner) return null;
 *   return <button>Delete Teamspace</button>;
 * }
 * ```
 */
export function useIsTeamspaceOwner(): boolean {
  const teamspaceRole = useTeamspaceRole();
  return teamspaceRole === 'owner';
}

/**
 * Hook to get all permission flags in one call
 * Useful when you need to check multiple permissions
 *
 * @returns Object with all permission flags
 *
 * @example
 * ```tsx
 * function ContentControls() {
 *   const { canEdit, canAdmin, isOwner } = usePermissions();
 *
 *   return (
 *     <div>
 *       {canEdit && <EditButton />}
 *       {canAdmin && <AdminPanel />}
 *       {isOwner && <DeleteButton />}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePermissions() {
  const teamspaceRole = useTeamspaceRole();
  const channelRole = useChannelRole();

  return {
    // Teamspace permissions
    teamspaceRole,
    isTeamspaceOwner: teamspaceRole === 'owner',
    isTeamspaceAdmin: teamspaceRole === 'admin' || teamspaceRole === 'owner',
    canManageTeamspace: teamspaceRole === 'admin' || teamspaceRole === 'owner',
    canEditInTeamspace:
      teamspaceRole === 'editor' ||
      teamspaceRole === 'admin' ||
      teamspaceRole === 'owner',

    // Channel permissions (effective role)
    channelRole,
    isChannelOwner: channelRole === 'owner',
    canAdmin: channelRole === 'owner',
    canEdit: channelRole === 'editor' || channelRole === 'owner',
    isOwner: channelRole === 'owner',
  };
}
