'use client';

/**
 * Project Context
 *
 * Provides project information to client components.
 * Used for project-aware UI rendering and access control.
 *
 * Note: Projects were previously called "workspaces" in the codebase.
 * This context replaces/extends the workspace context for the new hierarchy.
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

import { createContext, useContext } from 'react';
import type { ProjectRole } from '@/server/db/schema';
import { PROJECT_ROLE_HIERARCHY } from '@/lib/constants/roles';

/**
 * Project data shape available in context
 */
export interface ProjectData {
  id: string;
  name: string;
  slug: string;
  teamspaceId: string | null; // null during migration for existing workspaces
  mode: 'single-tenant' | 'multi-tenant';
  createdAt: Date;
}

/**
 * Project context value shape
 */
export interface ProjectContextValue {
  /** Current project, null if not loaded or no access */
  project: ProjectData | null;
  /** User's effective role in the current project (calculated from teamspace + project roles) */
  role: ProjectRole | null;
  /** Whether project data is being loaded */
  isLoading: boolean;
  /** Error message if project loading failed */
  error: string | null;
  /** Refresh project data */
  refresh: () => Promise<void>;
}

/**
 * Project context
 * Must be used within ProjectProvider
 */
export const ProjectContext = createContext<ProjectContextValue | null>(null);

ProjectContext.displayName = 'ProjectContext';

/**
 * Hook to access project context
 *
 * @throws Error if used outside ProjectProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { project, role, isLoading } = useProject();
 *
 *   if (isLoading) return <Loading />;
 *   if (!project) return <NoProject />;
 *
 *   return <div>Project: {project.name}</div>;
 * }
 * ```
 */
export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error('useProject must be used within ProjectProvider');
  }
  return ctx;
}

/**
 * Hook to get project ID for API calls
 * Returns null if no project is selected
 *
 * @example
 * ```tsx
 * function useVideos() {
 *   const projectId = useProjectId();
 *   // Use projectId in API calls
 * }
 * ```
 */
export function useProjectId(): string | null {
  const { project } = useProject();
  return project?.id ?? null;
}

/**
 * Hook to get project slug for routing
 * Returns null if no project is selected
 *
 * @example
 * ```tsx
 * function NavigateToProject() {
 *   const slug = useProjectSlug();
 *   return <Link href={`/t/teamspace/${slug}`}>Go to project</Link>;
 * }
 * ```
 */
export function useProjectSlug(): string | null {
  const { project } = useProject();
  return project?.slug ?? null;
}

/**
 * Hook to check if user has required project role
 *
 * Role hierarchy: owner > editor > viewer
 *
 * Note: This checks the EFFECTIVE role, which includes teamspace role inheritance
 * and project-specific overrides.
 *
 * @example
 * ```tsx
 * function DeleteButton() {
 *   const canDelete = useHasProjectRole('owner');
 *   if (!canDelete) return null;
 *   return <button>Delete</button>;
 * }
 * ```
 */
export function useHasProjectRole(requiredRole: ProjectRole): boolean {
  const { role } = useProject();
  if (!role) return false;

  return PROJECT_ROLE_HIERARCHY[role] >= PROJECT_ROLE_HIERARCHY[requiredRole];
}

/**
 * Hook to get the current project role
 * Returns null if not in a project context
 *
 * @example
 * ```tsx
 * function RoleBadge() {
 *   const role = useProjectRole();
 *   if (!role) return null;
 *   return <Badge>{role}</Badge>;
 * }
 * ```
 */
export function useProjectRole(): ProjectRole | null {
  const { role } = useProject();
  return role;
}

/**
 * Hook to check if user is project owner
 * (or teamspace admin/owner, which grants owner access to all projects)
 */
export function useIsProjectOwner(): boolean {
  return useHasProjectRole('owner');
}

/**
 * Hook to check if user can edit in project (editor or higher)
 */
export function useCanEditProject(): boolean {
  return useHasProjectRole('editor');
}

/**
 * LEGACY ALIASES - For backward compatibility during migration
 * These will be deprecated once all components are updated
 */

/**
 * @deprecated Use useProject instead
 */
export const useWorkspace = useProject;

/**
 * @deprecated Use useProjectId instead
 */
export const useWorkspaceId = useProjectId;

/**
 * @deprecated Use useHasProjectRole instead
 */
export const useHasRole = useHasProjectRole;

/**
 * @deprecated Use useCanEditProject instead
 */
export const useCanEdit = useCanEditProject;

/**
 * @deprecated Use useIsProjectOwner instead
 */
export const useIsOwner = useIsProjectOwner;
