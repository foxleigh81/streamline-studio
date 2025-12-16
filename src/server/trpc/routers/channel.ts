/**
 * Channel tRPC Router
 *
 * Handles channel operations within teamspaces.
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
// eslint-disable-next-line no-restricted-imports -- Channel operations require direct queries for access validation
import { eq, and } from 'drizzle-orm';
import { router, protectedProcedure } from '../procedures';
import {
  channels,
  channelUsers,
  teamspaces,
  teamspaceUsers,
} from '@/server/db/schema';
import type { ChannelRole, TeamspaceRole } from '@/server/db/schema';
import { serverEnv } from '@/lib/env';
import { generateSlug, generateUniqueSlug } from '@/lib/utils/slug';

/**
 * Map TeamspaceRole to ChannelRole
 *
 * TeamspaceRole has 'admin' which doesn't exist in ChannelRole.
 * This function provides explicit, type-safe mapping.
 */
function mapTeamspaceRoleToChannelRole(
  teamspaceRole: TeamspaceRole
): ChannelRole {
  switch (teamspaceRole) {
    case 'owner':
      return 'owner';
    case 'admin':
      return 'owner'; // Admins get owner-level channel access
    case 'editor':
      return 'editor';
    case 'viewer':
      return 'viewer';
  }
}

/**
 * Calculate effective channel role based on teamspace role and channel membership
 *
 * Logic per ADR-017:
 * 1. Teamspace admins/owners always have 'owner' access to all channels
 * 2. If user has channel membership with role_override, use that
 * 3. If user has channel membership without role_override, use mapped teamspace role
 * 4. If user has no channel membership, deny access (unless teamspace admin/owner)
 */
function calculateEffectiveRole(
  teamspaceRole: TeamspaceRole,
  channelRole: ChannelRole | null,
  roleOverride: ChannelRole | null
): ChannelRole | null {
  // Teamspace admins and owners always have owner access to all channels
  if (teamspaceRole === 'admin' || teamspaceRole === 'owner') {
    return 'owner';
  }

  // User must have explicit channel membership
  if (!channelRole) {
    return null; // Access denied
  }

  // Use role override if set, otherwise map teamspace role to channel role
  return roleOverride ?? mapTeamspaceRoleToChannelRole(teamspaceRole);
}

/**
 * Channel router
 */
export const channelRouter = router({
  /**
   * List all channels in a teamspace that the current user has access to
   * Requires authentication and teamspace membership
   */
  listInTeamspace: protectedProcedure
    .input(z.object({ teamspaceSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      // First, verify user has access to the teamspace
      const teamspaceAccess = await ctx.db
        .select({
          teamspaceId: teamspaces.id,
          teamspaceRole: teamspaceUsers.role,
        })
        .from(teamspaceUsers)
        .innerJoin(teamspaces, eq(teamspaceUsers.teamspaceId, teamspaces.id))
        .where(
          and(
            eq(teamspaces.slug, input.teamspaceSlug),
            eq(teamspaceUsers.userId, ctx.user.id)
          )
        )
        .limit(1);

      const firstAccess = teamspaceAccess[0];
      if (!firstAccess) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Teamspace not found',
        });
      }

      const { teamspaceId, teamspaceRole } = firstAccess;

      // If user is teamspace admin/owner, they can see all channels
      if (teamspaceRole === 'admin' || teamspaceRole === 'owner') {
        const allChannels = await ctx.db
          .select({
            id: channels.id,
            name: channels.name,
            slug: channels.slug,
            teamspaceId: channels.teamspaceId,
            mode: channels.mode,
            createdAt: channels.createdAt,
          })
          .from(channels)
          .where(eq(channels.teamspaceId, teamspaceId))
          .orderBy(channels.createdAt);

        return allChannels.map((channel) => ({
          ...channel,
          role: 'owner' as ChannelRole, // Admins/owners have owner access to all channels
        }));
      }

      // Otherwise, only show channels they're explicitly members of
      const userChannels = await ctx.db
        .select({
          id: channels.id,
          name: channels.name,
          slug: channels.slug,
          teamspaceId: channels.teamspaceId,
          mode: channels.mode,
          createdAt: channels.createdAt,
          channelRole: channelUsers.role,
          roleOverride: channelUsers.roleOverride,
        })
        .from(channelUsers)
        .innerJoin(channels, eq(channelUsers.channelId, channels.id))
        .where(
          and(
            eq(channels.teamspaceId, teamspaceId),
            eq(channelUsers.userId, ctx.user.id)
          )
        )
        .orderBy(channels.createdAt);

      return userChannels.map((channel) => {
        const effectiveRole = calculateEffectiveRole(
          teamspaceRole,
          channel.channelRole,
          channel.roleOverride
        );

        // This should never be null for users with explicit channel membership
        // but TypeScript requires the check
        if (!effectiveRole) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to calculate effective role',
          });
        }

        return {
          id: channel.id,
          name: channel.name,
          slug: channel.slug,
          teamspaceId: channel.teamspaceId,
          mode: channel.mode,
          createdAt: channel.createdAt,
          role: effectiveRole,
        };
      });
    }),

  /**
   * Get a specific channel by slug within a teamspace
   * Verifies user has access to both the teamspace and the channel
   * Returns the effective role (with teamspace role and overrides applied)
   */
  getBySlug: protectedProcedure
    .input(
      z.object({
        teamspaceSlug: z.string(),
        channelSlug: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // First, verify user has access to the teamspace
      const teamspaceAccess = await ctx.db
        .select({
          teamspaceId: teamspaces.id,
          teamspaceRole: teamspaceUsers.role,
        })
        .from(teamspaceUsers)
        .innerJoin(teamspaces, eq(teamspaceUsers.teamspaceId, teamspaces.id))
        .where(
          and(
            eq(teamspaces.slug, input.teamspaceSlug),
            eq(teamspaceUsers.userId, ctx.user.id)
          )
        )
        .limit(1);

      const firstAccess = teamspaceAccess[0];
      if (!firstAccess) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Teamspace not found',
        });
      }

      const { teamspaceId, teamspaceRole } = firstAccess;

      // Get the channel within the teamspace
      const channelResult = await ctx.db
        .select({
          id: channels.id,
          name: channels.name,
          slug: channels.slug,
          teamspaceId: channels.teamspaceId,
          mode: channels.mode,
          createdAt: channels.createdAt,
        })
        .from(channels)
        .where(
          and(
            eq(channels.teamspaceId, teamspaceId),
            eq(channels.slug, input.channelSlug)
          )
        )
        .limit(1);

      const channel = channelResult[0];
      if (!channel) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Channel not found',
        });
      }

      // If user is teamspace admin/owner, they have automatic access
      if (teamspaceRole === 'admin' || teamspaceRole === 'owner') {
        return {
          ...channel,
          role: 'owner' as ChannelRole,
        };
      }

      // Check if user has explicit channel membership
      const membershipResult = await ctx.db
        .select({
          role: channelUsers.role,
          roleOverride: channelUsers.roleOverride,
        })
        .from(channelUsers)
        .where(
          and(
            eq(channelUsers.channelId, channel.id),
            eq(channelUsers.userId, ctx.user.id)
          )
        )
        .limit(1);

      const membership = membershipResult[0];

      if (!membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Channel not found',
        });
      }

      const effectiveRole = calculateEffectiveRole(
        teamspaceRole,
        membership.role,
        membership.roleOverride
      );

      if (!effectiveRole) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Channel not found',
        });
      }

      return {
        ...channel,
        role: effectiveRole,
      };
    }),

  /**
   * Get a specific channel by slug (simple version for single-tenant mode)
   * Verifies user has access to the channel
   * Does not require teamspace context
   */
  getBySlugSimple: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select({
          id: channels.id,
          name: channels.name,
          slug: channels.slug,
          mode: channels.mode,
          role: channelUsers.role,
        })
        .from(channelUsers)
        .innerJoin(channels, eq(channelUsers.channelId, channels.id))
        .where(
          and(
            eq(channels.slug, input.slug),
            eq(channelUsers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (result.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Channel not found',
        });
      }

      return result[0];
    }),

  /**
   * List all channels the current user has access to (for single-tenant mode)
   * Requires authentication
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const userChannels = await ctx.db
      .select({
        id: channels.id,
        name: channels.name,
        slug: channels.slug,
        role: channelUsers.role,
        joinedAt: channelUsers.createdAt,
      })
      .from(channelUsers)
      .innerJoin(channels, eq(channelUsers.channelId, channels.id))
      .where(eq(channelUsers.userId, ctx.user.id))
      .orderBy(channelUsers.createdAt);

    return userChannels;
  }),

  /**
   * Create a new channel
   * Only available in multi-tenant mode
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Channel name is required').max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only allow channel creation in multi-tenant mode
      if (serverEnv.MODE !== 'multi-tenant') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Channel creation is only available in multi-tenant mode',
        });
      }

      // Generate slug from name using shared utility
      const baseSlug = generateSlug(input.name, 'my-channel');

      // Check if slug is unique, append random suffix if not
      let slug = baseSlug;
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        const existingChannel = await ctx.db
          .select({ id: channels.id })
          .from(channels)
          .where(eq(channels.slug, slug))
          .limit(1);

        if (existingChannel.length === 0) {
          // Slug is unique
          break;
        }

        // Generate unique slug with random suffix
        slug = generateUniqueSlug(baseSlug);
        attempts++;
      }

      if (attempts === maxAttempts) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate unique channel slug',
        });
      }

      // Create channel and add user as owner in transaction
      const result = await ctx.db.transaction(async (tx) => {
        const [channel] = await tx
          .insert(channels)
          .values({
            name: input.name,
            slug,
            mode: 'multi-tenant',
            teamspaceId: null, // TODO: Set from teamspace context when needed
          })
          .returning();

        if (!channel) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create channel',
          });
        }

        await tx.insert(channelUsers).values({
          channelId: channel.id,
          userId: ctx.user.id,
          role: 'owner',
        });

        return channel;
      });

      return {
        id: result.id,
        name: result.name,
        slug: result.slug,
      };
    }),
});

export type ChannelRouter = typeof channelRouter;
