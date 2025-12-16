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
 * Supports both multi-tenant (/t/[teamspace]/[project]) and single-tenant (/t/[project]) routes:
 * - Multi-tenant: Uses teamspace slug from parent context and project.getBySlug
 * - Single-tenant: Uses project slug directly from params and project.getBySlugSimple
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
  // Always use params.project in the unified routing structure
  const params = useParams();
  const projectSlug =
    typeof params.project === 'string' ? params.project : null;

  // Get teamspace slug from parent context
  const teamspaceSlug = useTeamspaceSlug();

  // Determine if we're in single-tenant mode (no teamspace)
  const isSingleTenantMode = !teamspaceSlug;

  // For multi-tenant mode: fetch via project.getBySlug
  const {
    data: multiTenantData,
    isLoading: isLoadingMultiTenant,
    error: multiTenantError,
    refetch: refreshMultiTenant,
  } = trpc.project.getBySlug.useQuery(
    {
      teamspaceSlug: teamspaceSlug!,
      projectSlug: projectSlug!,
    },
    {
      enabled: !isSingleTenantMode && !!teamspaceSlug && !!projectSlug,
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // For single-tenant mode: fetch via project.getBySlugSimple
  const {
    data: singleTenantData,
    isLoading: isLoadingSingleTenant,
    error: singleTenantError,
    refetch: refreshSingleTenant,
  } = trpc.project.getBySlugSimple.useQuery(
    { slug: projectSlug! },
    {
      enabled: isSingleTenantMode && !!projectSlug,
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Consolidate data from whichever endpoint is active
  const data = isSingleTenantMode ? singleTenantData : multiTenantData;
  const isLoading = isSingleTenantMode
    ? isLoadingSingleTenant
    : isLoadingMultiTenant;
  const error = isSingleTenantMode ? singleTenantError : multiTenantError;
  const refresh = isSingleTenantMode ? refreshSingleTenant : refreshMultiTenant;

  // Map the project data to our context shape
  const project: ProjectData | null = useMemo(() => {
    if (!data) return null;

    // Multi-tenant data (from project.getBySlug) has teamspaceId and createdAt
    if (multiTenantData && !isSingleTenantMode) {
      return {
        id: multiTenantData.id,
        name: multiTenantData.name,
        slug: multiTenantData.slug,
        teamspaceId: multiTenantData.teamspaceId,
        mode: multiTenantData.mode,
        createdAt: multiTenantData.createdAt,
      };
    }

    // Single-tenant data (from project.getBySlugSimple) doesn't have all fields
    if (singleTenantData && isSingleTenantMode) {
      return {
        id: singleTenantData.id,
        name: singleTenantData.name,
        slug: singleTenantData.slug,
        teamspaceId: null, // Single-tenant projects have no teamspace
        mode: singleTenantData.mode,
        createdAt: new Date(), // project.getBySlugSimple doesn't return createdAt
      };
    }

    return null;
  }, [data, multiTenantData, singleTenantData, isSingleTenantMode]);

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
