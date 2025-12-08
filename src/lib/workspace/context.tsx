'use client';

/**
 * Workspace Context
 *
 * Provides workspace information to client components.
 * Used for workspace-aware UI rendering and workspace switching (in multi-tenant mode).
 *
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

import { createContext, useContext } from 'react';
import type { WorkspaceRole } from '@/server/db/schema';

/**
 * Workspace data shape available in context
 */
export interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
  mode: 'single-tenant' | 'multi-tenant';
}

/**
 * Workspace context value shape
 */
export interface WorkspaceContextValue {
  /** Current workspace, null if not loaded or no access */
  workspace: WorkspaceData | null;
  /** User's role in the current workspace */
  role: WorkspaceRole | null;
  /** Whether workspace data is being loaded */
  isLoading: boolean;
  /** Error message if workspace loading failed */
  error: string | null;
  /** Switch to a different workspace (multi-tenant mode only) */
  switchWorkspace: (workspaceId: string) => Promise<void>;
  /** Refresh workspace data */
  refresh: () => Promise<void>;
}

/**
 * Workspace context
 * Must be used within WorkspaceProvider
 */
export const WorkspaceContext = createContext<WorkspaceContextValue | null>(
  null
);

WorkspaceContext.displayName = 'WorkspaceContext';

/**
 * Hook to access workspace context
 *
 * @throws Error if used outside WorkspaceProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { workspace, role, isLoading } = useWorkspace();
 *
 *   if (isLoading) return <Loading />;
 *   if (!workspace) return <NoWorkspace />;
 *
 *   return <div>Workspace: {workspace.name}</div>;
 * }
 * ```
 */
export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return ctx;
}

/**
 * Hook to get workspace ID for API calls
 * Returns null if no workspace is selected
 *
 * @example
 * ```tsx
 * function useVideos() {
 *   const workspaceId = useWorkspaceId();
 *   // Use workspaceId in API calls
 * }
 * ```
 */
export function useWorkspaceId(): string | null {
  const { workspace } = useWorkspace();
  return workspace?.id ?? null;
}

/**
 * Hook to check if user has required role
 *
 * @example
 * ```tsx
 * function DeleteButton() {
 *   const canDelete = useHasRole('owner');
 *   if (!canDelete) return null;
 *   return <button>Delete</button>;
 * }
 * ```
 */
export function useHasRole(requiredRole: WorkspaceRole): boolean {
  const { role } = useWorkspace();
  if (!role) return false;

  const roleHierarchy: Record<WorkspaceRole, number> = {
    viewer: 1,
    editor: 2,
    owner: 3,
  };

  return roleHierarchy[role] >= roleHierarchy[requiredRole];
}

/**
 * Hook to check if user can edit (editor or owner)
 */
export function useCanEdit(): boolean {
  return useHasRole('editor');
}

/**
 * Hook to check if user is workspace owner
 */
export function useIsOwner(): boolean {
  return useHasRole('owner');
}
