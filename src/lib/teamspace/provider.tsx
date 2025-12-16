'use client';

/**
 * Teamspace Provider
 *
 * Provides teamspace context to the application.
 * Fetches teamspace data using tRPC and manages loading/error states.
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 */

import React, { useMemo, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import {
  TeamspaceContext,
  type TeamspaceContextValue,
  type TeamspaceData,
} from './context';
import type { TeamspaceRole } from '@/server/db/schema';
import styles from './provider.module.scss';

/**
 * Props for TeamspaceProvider
 */
interface TeamspaceProviderProps {
  /** Child components */
  children: ReactNode;
}

/**
 * Teamspace Provider Component
 *
 * Wraps teamspace-scoped routes to provide teamspace context.
 * Automatically fetches teamspace data based on the route parameter.
 *
 * In single-tenant mode (no teamspace slug in route), provides a default
 * context with null teamspace data. This allows components to work in both
 * single-tenant (/t/[project]) and multi-tenant (/t/[teamspace]/[project]) modes.
 *
 * @example
 * ```tsx
 * // In layout.tsx for /t/[teamspace]
 * export default function TeamspaceLayout({ children }) {
 *   return (
 *     <TeamspaceProvider>
 *       {children}
 *     </TeamspaceProvider>
 *   );
 * }
 * ```
 */
export function TeamspaceProvider({
  children,
}: TeamspaceProviderProps): React.ReactNode {
  // Get teamspace slug from route params
  const params = useParams();
  const teamspaceSlug =
    typeof params.teamspace === 'string' ? params.teamspace : null;

  // Fetch teamspace data using tRPC (only if teamspace slug exists)
  const {
    data,
    isLoading,
    error,
    refetch: refresh,
  } = trpc.teamspace.getBySlug.useQuery(
    { slug: teamspaceSlug! },
    {
      enabled: !!teamspaceSlug,
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Map the teamspace data to our context shape
  const teamspace: TeamspaceData | null = useMemo(
    () =>
      data
        ? {
            id: data.id,
            name: data.name,
            slug: data.slug,
            createdAt: data.createdAt,
          }
        : null,
    [data]
  );

  const role: TeamspaceRole | null = data?.role ?? null;

  // Default context value for single-tenant mode (no teamspace)
  const defaultValue = useMemo<TeamspaceContextValue>(
    () => ({
      teamspace: null,
      role: null,
      isLoading: false,
      error: null,
      refresh: async () => {
        // No-op for single-tenant mode
      },
    }),
    []
  );

  const value = useMemo<TeamspaceContextValue>(
    () => ({
      teamspace,
      role,
      isLoading,
      error: error?.message ?? null,
      refresh: async () => {
        await refresh();
      },
    }),
    [teamspace, role, isLoading, error, refresh]
  );

  // In single-tenant mode (no teamspace slug), provide default context immediately
  if (!teamspaceSlug) {
    return (
      <TeamspaceContext.Provider value={defaultValue}>
        {children}
      </TeamspaceContext.Provider>
    );
  }

  // Show loading state while fetching teamspace data
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div
            className={styles.spinner}
            role="status"
            aria-label="Loading teamspace"
          />
          <p className={styles.loadingText}>Loading teamspace...</p>
        </div>
      </div>
    );
  }

  // Show error state if teamspace failed to load
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <h2 className={styles.errorHeading}>Failed to Load Teamspace</h2>
          <p className={styles.errorMessage}>
            {error.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => void refresh()}
            className={styles.retryButton}
            type="button"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Render children with teamspace context
  return (
    <TeamspaceContext.Provider value={value}>
      {children}
    </TeamspaceContext.Provider>
  );
}

TeamspaceProvider.displayName = 'TeamspaceProvider';
