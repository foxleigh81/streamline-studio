'use client';

/**
 * Workspace Provider
 *
 * Provides workspace context to the application.
 * Handles workspace loading and switching.
 *
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

import React, { useState, useCallback, useMemo, type ReactNode } from 'react';
import {
  WorkspaceContext,
  type WorkspaceContextValue,
  type WorkspaceData,
} from './context';
import type { WorkspaceRole } from '@/server/db/schema';

/**
 * Props for WorkspaceProvider
 */
interface WorkspaceProviderProps {
  /** Child components */
  children: ReactNode;
  /** Initial workspace data (from server-side rendering) */
  initialWorkspace?: WorkspaceData | null;
  /** Initial user role in workspace */
  initialRole?: WorkspaceRole | null;
}

/**
 * Workspace Provider Component
 *
 * Wraps the application to provide workspace context.
 * Should be placed high in the component tree, after authentication provider.
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * export default function RootLayout({ children }) {
 *   return (
 *     <AuthProvider>
 *       <WorkspaceProvider>
 *         {children}
 *       </WorkspaceProvider>
 *     </AuthProvider>
 *   );
 * }
 * ```
 */
export function WorkspaceProvider({
  children,
  initialWorkspace = null,
  initialRole = null,
}: WorkspaceProviderProps): React.ReactNode {
  // Note: setWorkspace and setRole are preserved for future use when
  // we implement workspace switching via tRPC queries
  const [workspace, _setWorkspace] = useState<WorkspaceData | null>(
    initialWorkspace
  );
  const [role, _setRole] = useState<WorkspaceRole | null>(initialRole);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Switch to a different workspace
   * Only available in multi-tenant mode
   */
  const switchWorkspace = useCallback(async (workspaceId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Store selected workspace ID in localStorage for persistence
      localStorage.setItem('selectedWorkspaceId', workspaceId);

      // In a real implementation, this would:
      // 1. Call the API to verify access to the new workspace
      // 2. Update the workspace context
      // 3. Potentially redirect to the workspace URL
      //
      // For now, we'll trigger a page reload to let the server handle it
      // This ensures the x-workspace-id header is sent with subsequent requests
      window.location.href = `/w/${workspaceId}`;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to switch workspace'
      );
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh workspace data from server
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // In a real implementation, this would fetch fresh workspace data
      // For now, we'll just reload the page
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to refresh workspace'
      );
      setIsLoading(false);
    }
  }, []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspace,
      role,
      isLoading,
      error,
      switchWorkspace,
      refresh,
    }),
    [workspace, role, isLoading, error, switchWorkspace, refresh]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

WorkspaceProvider.displayName = 'WorkspaceProvider';
