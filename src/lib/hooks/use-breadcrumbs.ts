/**
 * Breadcrumb Hooks
 *
 * Utility hooks for building breadcrumb navigation with teamspace/project hierarchy.
 * Automatically adapts to single-tenant vs multi-tenant deployment modes.
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 */

'use client';

import { useMemo } from 'react';
import { useTeamspace } from '@/lib/teamspace';
import { useProject } from '@/lib/project';
import { isMultiTenant } from '@/lib/constants';
import type { BreadcrumbItem } from '@/components/ui/breadcrumb';

/**
 * Hook to generate breadcrumbs with teamspace/project hierarchy
 *
 * Returns a base breadcrumb array that includes teamspace (if multi-tenant)
 * and project. Additional page-specific breadcrumbs can be appended.
 *
 * @param additionalCrumbs - Additional breadcrumb items to append
 * @returns Complete breadcrumb array
 *
 * @example
 * ```tsx
 * function VideoPage() {
 *   const breadcrumbs = useBreadcrumbs([
 *     { label: 'Content Plan', href: `/t/${teamspaceSlug}/${projectSlug}/content-plan` },
 *     { label: videoTitle }
 *   ]);
 *
 *   return <Breadcrumb items={breadcrumbs} />;
 * }
 * ```
 */
export function useBreadcrumbs(
  additionalCrumbs: BreadcrumbItem[] = []
): BreadcrumbItem[] {
  const { teamspace } = useTeamspace();
  const { project } = useProject();
  const multiTenant = isMultiTenant();

  return useMemo(() => {
    const baseCrumbs: BreadcrumbItem[] = [];

    // Add teamspace breadcrumb in multi-tenant mode only (hide "Workspace" in single-tenant)
    if (multiTenant && teamspace) {
      baseCrumbs.push({
        label: teamspace.name,
        href: `/t/${teamspace.slug}`,
      });
    }

    // Add project breadcrumb (always uses unified routing)
    if (project && teamspace) {
      baseCrumbs.push({
        label: project.name,
        href: `/t/${teamspace.slug}/${project.slug}/content-plan`,
      });
    }

    return [...baseCrumbs, ...additionalCrumbs];
  }, [teamspace, project, multiTenant, additionalCrumbs]);
}

/**
 * Hook to get base URL for building links in the current context
 *
 * Returns the base path including teamspace and project slugs.
 * Always uses unified routing: /t/[teamspace]/[project]
 *
 * @returns Base URL path (e.g., '/t/workspace/my-project' or '/t/my-team/my-project')
 *
 * @example
 * ```tsx
 * function VideoLink({ videoId }: { videoId: string }) {
 *   const baseUrl = useBaseUrl();
 *   return <Link href={`${baseUrl}/content-plan/${videoId}`}>View Video</Link>;
 * }
 * ```
 */
export function useBaseUrl(): string {
  const { teamspace } = useTeamspace();
  const { project } = useProject();

  return useMemo(() => {
    if (!project || !teamspace) return '/';

    // Always use unified routing structure
    return `/t/${teamspace.slug}/${project.slug}`;
  }, [teamspace, project]);
}
