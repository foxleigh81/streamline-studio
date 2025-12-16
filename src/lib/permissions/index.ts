/**
 * Permission Hooks
 *
 * Utility hooks for checking user permissions across teamspaces and projects.
 * These hooks combine teamspace and project contexts to provide simple permission checks.
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 */

'use client';

import { useTeamspaceRole as getTeamspaceRole } from '@/lib/teamspace';
import { useProjectRole as getProjectRole } from '@/lib/project';
import type { TeamspaceRole, ProjectRole } from '@/server/db/schema';
import {
  PROJECT_ROLE_HIERARCHY,
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
 * Hook to get the current project role (effective role)
 * Convenience re-export for easy access
 */
export function useProjectRole(): ProjectRole | null {
  // Re-export from project module
  return getProjectRole();
}

/**
 * Hook to check if user can edit content in the current context
 *
 * This checks the effective project role, which includes:
 * - Direct project role with overrides
 * - Inherited teamspace role
 * - Teamspace admin/owner privileges
 *
 * @returns true if user has editor or owner role in the project
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
  const projectRole = useProjectRole();
  if (!projectRole) return false;

  return PROJECT_ROLE_HIERARCHY[projectRole] >= PROJECT_ROLE_HIERARCHY.editor;
}

/**
 * Hook to check if user can perform admin actions in the current project
 *
 * @returns true if user has owner role in the project (or is teamspace admin/owner)
 *
 * @example
 * ```tsx
 * function ProjectSettings() {
 *   const canAdmin = useCanAdmin();
 *   if (!canAdmin) return null;
 *   return <SettingsPanel />;
 * }
 * ```
 */
export function useCanAdmin(): boolean {
  const projectRole = useProjectRole();
  return projectRole === 'owner';
}

/**
 * Hook to check if user is the project owner
 * Note: Teamspace admins/owners also have owner access to all projects
 *
 * @returns true if user is project owner (or teamspace admin/owner)
 *
 * @example
 * ```tsx
 * function DeleteProjectButton() {
 *   const isOwner = useIsOwner();
 *   if (!isOwner) return null;
 *   return <button>Delete Project</button>;
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
  const projectRole = useProjectRole();

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

    // Project permissions (effective role)
    projectRole,
    isProjectOwner: projectRole === 'owner',
    canAdmin: projectRole === 'owner',
    canEdit: projectRole === 'editor' || projectRole === 'owner',

    // Legacy aliases
    isOwner: projectRole === 'owner',
  };
}
