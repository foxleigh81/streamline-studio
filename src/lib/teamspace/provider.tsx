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

  // Fetch teamspace data using tRPC
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

  // Show loading state while fetching teamspace data
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '1rem',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            color: 'var(--color-foreground-muted)',
          }}
        >
          <div
            style={{
              width: '2rem',
              height: '2rem',
              margin: '0 auto 1rem',
              border: '3px solid var(--color-border)',
              borderTopColor: 'var(--color-primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
            role="status"
            aria-label="Loading teamspace"
          />
          <p style={{ margin: 0 }}>Loading teamspace...</p>
        </div>
      </div>
    );
  }

  // Show error state if teamspace failed to load
  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '1rem',
        }}
      >
        <div
          style={{
            maxWidth: '28rem',
            padding: '1.5rem',
            textAlign: 'center',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-destructive)',
            borderRadius: 'var(--border-radius-lg)',
          }}
        >
          <h2
            style={{
              margin: '0 0 0.5rem 0',
              fontSize: 'var(--font-size-xl)',
              color: 'var(--color-foreground)',
            }}
          >
            Failed to Load Teamspace
          </h2>
          <p
            style={{
              margin: '0 0 1rem 0',
              color: 'var(--color-foreground-muted)',
            }}
          >
            {error.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => void refresh()}
            style={{
              padding: '0.5rem 1.5rem',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-primary-foreground)',
              background: 'var(--color-primary)',
              border: 'none',
              borderRadius: 'var(--border-radius-md)',
              cursor: 'pointer',
            }}
            type="button"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Only render children when teamspace data is loaded successfully
  return (
    <TeamspaceContext.Provider value={value}>
      {children}
    </TeamspaceContext.Provider>
  );
}

TeamspaceProvider.displayName = 'TeamspaceProvider';
