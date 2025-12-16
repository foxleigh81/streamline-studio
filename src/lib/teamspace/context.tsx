'use client';

/**
 * Teamspace Context
 *
 * Provides teamspace information to client components.
 * Used for teamspace-aware UI rendering and access control.
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 */

import { createContext, useContext } from 'react';
import type { TeamspaceRole } from '@/server/db/schema';
import { TEAMSPACE_ROLE_HIERARCHY } from '@/lib/constants/roles';

/**
 * Teamspace data shape available in context
 */
export interface TeamspaceData {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

/**
 * Teamspace context value shape
 */
export interface TeamspaceContextValue {
  /** Current teamspace, null if not loaded or no access */
  teamspace: TeamspaceData | null;
  /** User's role in the current teamspace */
  role: TeamspaceRole | null;
  /** Whether teamspace data is being loaded */
  isLoading: boolean;
  /** Error message if teamspace loading failed */
  error: string | null;
  /** Refresh teamspace data */
  refresh: () => Promise<void>;
}

/**
 * Teamspace context
 * Must be used within TeamspaceProvider
 */
export const TeamspaceContext = createContext<TeamspaceContextValue | null>(
  null
);

TeamspaceContext.displayName = 'TeamspaceContext';

/**
 * Hook to access teamspace context
 *
 * @throws Error if used outside TeamspaceProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { teamspace, role, isLoading } = useTeamspace();
 *
 *   if (isLoading) return <Loading />;
 *   if (!teamspace) return <NoTeamspace />;
 *
 *   return <div>Teamspace: {teamspace.name}</div>;
 * }
 * ```
 */
export function useTeamspace(): TeamspaceContextValue {
  const ctx = useContext(TeamspaceContext);
  if (!ctx) {
    throw new Error('useTeamspace must be used within TeamspaceProvider');
  }
  return ctx;
}

/**
 * Hook to get teamspace ID for API calls
 * Returns null if no teamspace is selected
 *
 * @example
 * ```tsx
 * function useProjects() {
 *   const teamspaceId = useTeamspaceId();
 *   // Use teamspaceId in API calls
 * }
 * ```
 */
export function useTeamspaceId(): string | null {
  const { teamspace } = useTeamspace();
  return teamspace?.id ?? null;
}

/**
 * Hook to get teamspace slug for routing
 * Returns null if no teamspace is selected
 *
 * @example
 * ```tsx
 * function NavigateToTeamspace() {
 *   const slug = useTeamspaceSlug();
 *   return <Link href={`/t/${slug}`}>Go to teamspace</Link>;
 * }
 * ```
 */
export function useTeamspaceSlug(): string | null {
  const { teamspace } = useTeamspace();
  return teamspace?.slug ?? null;
}

/**
 * Hook to check if user has required teamspace role
 *
 * Role hierarchy: owner > admin > editor > viewer
 *
 * @example
 * ```tsx
 * function DeleteButton() {
 *   const canDelete = useHasTeamspaceRole('admin');
 *   if (!canDelete) return null;
 *   return <button>Delete</button>;
 * }
 * ```
 */
export function useHasTeamspaceRole(requiredRole: TeamspaceRole): boolean {
  const { role } = useTeamspace();
  if (!role) return false;

  return (
    TEAMSPACE_ROLE_HIERARCHY[role] >= TEAMSPACE_ROLE_HIERARCHY[requiredRole]
  );
}

/**
 * Hook to get the current teamspace role
 * Returns null if not in a teamspace context
 *
 * @example
 * ```tsx
 * function RoleBadge() {
 *   const role = useTeamspaceRole();
 *   if (!role) return null;
 *   return <Badge>{role}</Badge>;
 * }
 * ```
 */
export function useTeamspaceRole(): TeamspaceRole | null {
  const { role } = useTeamspace();
  return role;
}

/**
 * Hook to check if user is teamspace owner
 */
export function useIsTeamspaceOwner(): boolean {
  return useHasTeamspaceRole('owner');
}

/**
 * Hook to check if user is teamspace admin or owner
 */
export function useIsTeamspaceAdmin(): boolean {
  return useHasTeamspaceRole('admin');
}

/**
 * Hook to check if user can edit in teamspace (editor or higher)
 */
export function useCanEditTeamspace(): boolean {
  return useHasTeamspaceRole('editor');
}
