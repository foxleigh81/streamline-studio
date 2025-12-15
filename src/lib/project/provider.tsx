'use client';

/**
 * Project Provider
 *
 * Provides project context to the application.
 * Fetches project data using tRPC and manages loading/error states.
 *
 * IMPORTANT: This provider must be nested inside TeamspaceProvider
 * since project access is scoped within a teamspace.
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

import React, { useMemo, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { useTeamspaceSlug } from '@/lib/teamspace';
import {
  ProjectContext,
  type ProjectContextValue,
  type ProjectData,
} from './context';
import type { ProjectRole } from '@/server/db/schema';

/**
 * Props for ProjectProvider
 */
interface ProjectProviderProps {
  /** Child components */
  children: ReactNode;
}

/**
 * Project Provider Component
 *
 * Wraps project-scoped routes to provide project context.
 * Automatically fetches project data based on the route parameters.
 *
 * IMPORTANT: Must be used inside TeamspaceProvider to access teamspace context.
 *
 * @example
 * ```tsx
 * // In layout.tsx for /t/[teamspace]/[project]
 * export default function ProjectLayout({ children }) {
 *   return (
 *     <TeamspaceProvider>
 *       <ProjectProvider>
 *         {children}
 *       </ProjectProvider>
 *     </TeamspaceProvider>
 *   );
 * }
 * ```
 */
export function ProjectProvider({
  children,
}: ProjectProviderProps): React.ReactNode {
  // Get project slug from route params
  const params = useParams();
  const projectSlug =
    typeof params.project === 'string' ? params.project : null;

  // Get teamspace slug from parent context
  const teamspaceSlug = useTeamspaceSlug();

  // Fetch project data using tRPC
  const {
    data,
    isLoading,
    error,
    refetch: refresh,
  } = trpc.project.getBySlug.useQuery(
    {
      teamspaceSlug: teamspaceSlug!,
      projectSlug: projectSlug!,
    },
    {
      enabled: !!teamspaceSlug && !!projectSlug,
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Map the project data to our context shape
  const project: ProjectData | null = useMemo(
    () =>
      data
        ? {
            id: data.id,
            name: data.name,
            slug: data.slug,
            teamspaceId: data.teamspaceId,
            mode: data.mode,
            createdAt: data.createdAt,
          }
        : null,
    [data]
  );

  const role: ProjectRole | null = data?.role ?? null;

  const value = useMemo<ProjectContextValue>(
    () => ({
      project,
      role,
      isLoading,
      error: error?.message ?? null,
      refresh: async () => {
        await refresh();
      },
    }),
    [project, role, isLoading, error, refresh]
  );

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

ProjectProvider.displayName = 'ProjectProvider';
