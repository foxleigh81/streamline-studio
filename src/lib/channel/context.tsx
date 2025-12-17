'use client';

/**
 * Channel Context
 *
 * Provides channel information to client components.
 * Used for channel-aware UI rendering and access control.
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

import { createContext, useContext } from 'react';
import type { ChannelRole } from '@/server/db/schema';
import { CHANNEL_ROLE_HIERARCHY } from '@/lib/constants/roles';

/**
 * Channel data shape available in context
 */
export interface ChannelData {
  id: string;
  name: string;
  slug: string;
  teamspaceId: string | null; // null during migration for existing workspaces
  mode: 'single-tenant' | 'multi-tenant';
  createdAt: Date;
}

/**
 * Channel context value shape
 */
export interface ChannelContextValue {
  /** Current channel, null if not loaded or no access */
  channel: ChannelData | null;
  /** User's effective role in the current channel (calculated from teamspace + channel roles) */
  role: ChannelRole | null;
  /** Whether channel data is being loaded */
  isLoading: boolean;
  /** Error message if channel loading failed */
  error: string | null;
  /** Refresh channel data */
  refresh: () => Promise<void>;
}

/**
 * Channel context
 * Must be used within ChannelProvider
 */
export const ChannelContext = createContext<ChannelContextValue | null>(null);

ChannelContext.displayName = 'ChannelContext';

/**
 * Hook to access channel context
 *
 * @throws Error if used outside ChannelProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { channel, role, isLoading } = useChannel();
 *
 *   if (isLoading) return <Loading />;
 *   if (!channel) return <NoChannel />;
 *
 *   return <div>Channel: {channel.name}</div>;
 * }
 * ```
 */
export function useChannel(): ChannelContextValue {
  const ctx = useContext(ChannelContext);
  if (!ctx) {
    throw new Error('useChannel must be used within ChannelProvider');
  }
  return ctx;
}

/**
 * Hook to optionally access channel context
 *
 * Returns null if used outside ChannelProvider instead of throwing.
 * Useful for components that can work with or without channel context.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const channelCtx = useChannelOptional();
 *
 *   if (!channelCtx) {
 *     // Not in a channel context
 *     return <div>No channel selected</div>;
 *   }
 *
 *   return <div>Channel: {channelCtx.channel?.name}</div>;
 * }
 * ```
 */
export function useChannelOptional(): ChannelContextValue | null {
  return useContext(ChannelContext);
}

/**
 * Hook to get channel ID for API calls
 * Returns null if no channel is selected
 *
 * @example
 * ```tsx
 * function useVideos() {
 *   const channelId = useChannelId();
 *   // Use channelId in API calls
 * }
 * ```
 */
export function useChannelId(): string | null {
  const { channel } = useChannel();
  return channel?.id ?? null;
}

/**
 * Hook to get channel slug for routing
 * Returns null if no channel is selected
 *
 * @example
 * ```tsx
 * function NavigateToChannel() {
 *   const slug = useChannelSlug();
 *   return <Link href={`/t/teamspace/${slug}`}>Go to channel</Link>;
 * }
 * ```
 */
export function useChannelSlug(): string | null {
  const { channel } = useChannel();
  return channel?.slug ?? null;
}

/**
 * Hook to check if user has required channel role
 *
 * Role hierarchy: owner > editor > viewer
 *
 * Note: This checks the EFFECTIVE role, which includes teamspace role inheritance
 * and channel-specific overrides.
 *
 * @example
 * ```tsx
 * function DeleteButton() {
 *   const canDelete = useHasChannelRole('owner');
 *   if (!canDelete) return null;
 *   return <button>Delete</button>;
 * }
 * ```
 */
export function useHasChannelRole(requiredRole: ChannelRole): boolean {
  const { role } = useChannel();
  if (!role) return false;

  const userHierarchy = CHANNEL_ROLE_HIERARCHY[role];
  const requiredHierarchy = CHANNEL_ROLE_HIERARCHY[requiredRole];
  return (
    userHierarchy !== undefined &&
    requiredHierarchy !== undefined &&
    userHierarchy >= requiredHierarchy
  );
}

/**
 * Hook to get the current channel role
 * Returns null if not in a channel context
 *
 * @example
 * ```tsx
 * function RoleBadge() {
 *   const role = useChannelRole();
 *   if (!role) return null;
 *   return <Badge>{role}</Badge>;
 * }
 * ```
 */
export function useChannelRole(): ChannelRole | null {
  const { role } = useChannel();
  return role;
}

/**
 * Hook to check if user is channel owner
 * (or teamspace admin/owner, which grants owner access to all channels)
 */
export function useIsChannelOwner(): boolean {
  return useHasChannelRole('owner');
}

/**
 * Hook to check if user can edit in channel (editor or higher)
 */
export function useCanEditChannel(): boolean {
  return useHasChannelRole('editor');
}
