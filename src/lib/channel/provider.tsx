'use client';

/**
 * Channel Provider
 *
 * Provides channel context to the application.
 * Fetches channel data using tRPC and manages loading/error states.
 *
 * IMPORTANT: This provider must be nested inside TeamspaceProvider
 * since channel access is scoped within a teamspace.
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

import React, { useMemo, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { useTeamspaceSlug } from '@/lib/teamspace';
import {
  ChannelContext,
  type ChannelContextValue,
  type ChannelData,
} from './context';
import type { ChannelRole } from '@/server/db/schema';

/**
 * Props for ChannelProvider
 */
interface ChannelProviderProps {
  /** Child components */
  children: ReactNode;
}

/**
 * Channel Provider Component
 *
 * Wraps channel-scoped routes to provide channel context.
 * Automatically fetches channel data based on the route parameters.
 *
 * Supports both multi-tenant (/t/[teamspace]/[channel]) and single-tenant (/t/[channel]) routes:
 * - Multi-tenant: Uses teamspace slug from parent context and channel.getBySlug
 * - Single-tenant: Uses channel slug directly from params and channel.getBySlugSimple
 *
 * IMPORTANT: Must be used inside TeamspaceProvider to access teamspace context.
 *
 * @example
 * ```tsx
 * // In layout.tsx for /t/[teamspace]/[channel]
 * export default function ChannelLayout({ children }) {
 *   return (
 *     <TeamspaceProvider>
 *       <ChannelProvider>
 *         {children}
 *       </ChannelProvider>
 *     </TeamspaceProvider>
 *   );
 * }
 * ```
 */
export function ChannelProvider({
  children,
}: ChannelProviderProps): React.ReactNode {
  // Get channel slug from route params
  const params = useParams();
  const channelSlug =
    typeof params.channel === 'string' ? params.channel : null;

  // Get teamspace slug from parent context
  const teamspaceSlug = useTeamspaceSlug();

  // Determine if we're in single-tenant mode (no teamspace)
  const isSingleTenantMode = !teamspaceSlug;

  // For multi-tenant mode: fetch via channel.getBySlug
  const {
    data: multiTenantData,
    isLoading: isLoadingMultiTenant,
    error: multiTenantError,
    refetch: refreshMultiTenant,
  } = trpc.channel.getBySlug.useQuery(
    {
      teamspaceSlug: teamspaceSlug!,
      channelSlug: channelSlug!,
    },
    {
      enabled: !isSingleTenantMode && !!teamspaceSlug && !!channelSlug,
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // For single-tenant mode: fetch via channel.getBySlugSimple
  const {
    data: singleTenantData,
    isLoading: isLoadingSingleTenant,
    error: singleTenantError,
    refetch: refreshSingleTenant,
  } = trpc.channel.getBySlugSimple.useQuery(
    { slug: channelSlug! },
    {
      enabled: isSingleTenantMode && !!channelSlug,
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

  // Map the channel data to our context shape
  const channel: ChannelData | null = useMemo(() => {
    if (!data) return null;

    // Multi-tenant data (from channel.getBySlug) has teamspaceId and createdAt
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

    // Single-tenant data (from channel.getBySlugSimple) doesn't have all fields
    if (singleTenantData && isSingleTenantMode) {
      return {
        id: singleTenantData.id,
        name: singleTenantData.name,
        slug: singleTenantData.slug,
        teamspaceId: null, // Single-tenant channels have no teamspace
        mode: singleTenantData.mode,
        createdAt: new Date(), // channel.getBySlugSimple doesn't return createdAt
      };
    }

    return null;
  }, [data, multiTenantData, singleTenantData, isSingleTenantMode]);

  const role: ChannelRole | null = data?.role ?? null;

  const value = useMemo<ChannelContextValue>(
    () => ({
      channel,
      role,
      isLoading,
      error: error?.message ?? null,
      refresh: async () => {
        await refresh();
      },
    }),
    [channel, role, isLoading, error, refresh]
  );

  return (
    <ChannelContext.Provider value={value}>{children}</ChannelContext.Provider>
  );
}

ChannelProvider.displayName = 'ChannelProvider';
