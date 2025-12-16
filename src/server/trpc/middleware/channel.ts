/**
 * Channel tRPC Middleware
 *
 * Ensures user has access to the requested channel within a teamspace.
 * Calculates effective role based on teamspace role and channel-specific overrides.
 *
 * IMPORTANT: This middleware must run AFTER teamspaceMiddleware.
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

import { TRPCError } from '@trpc/server';
import { eq, and } from 'drizzle-orm';
import { middleware } from '../trpc';
import { db } from '@/server/db';
import { channels, channelUsers } from '@/server/db/schema';
import type {
  Channel,
  ChannelUser,
  ChannelRole,
  TeamspaceRole,
} from '@/server/db/schema';
import {
  createChannelRepository,
  type ChannelRepository,
} from '@/server/repositories';
import type { TeamspaceContext } from './teamspace';
import { z } from 'zod';

/**
 * Extended context with channel information
 * Includes teamspace context from teamspaceMiddleware
 */
export interface ChannelContext extends TeamspaceContext {
  channel: Channel;
  channelUser: ChannelUser | null; // null if teamspace admin accessing channel
  channelRole: ChannelRole; // Effective role (with overrides applied)
  channelRepository: ChannelRepository;
}

/**
 * Resolve channel by teamspace ID and slug
 * Returns channel and user's channel membership record (if exists)
 */
async function resolveChannel(
  userId: string,
  teamspaceId: string,
  channelSlug: string
): Promise<{
  channel: Channel;
  membership: ChannelUser | null;
} | null> {
  // First, get the channel within the teamspace
  const channelResult = await db
    .select()
    .from(channels)
    .where(
      and(eq(channels.teamspaceId, teamspaceId), eq(channels.slug, channelSlug))
    )
    .limit(1);

  const channel = channelResult[0];
  if (!channel) {
    return null;
  }

  // Then check if user has direct channel membership
  const membershipResult = await db
    .select()
    .from(channelUsers)
    .where(
      and(
        eq(channelUsers.channelId, channel.id),
        eq(channelUsers.userId, userId)
      )
    )
    .limit(1);

  const membership = membershipResult[0] ?? null;

  return {
    channel,
    membership,
  };
}

/**
 * Calculate effective channel role
 *
 * Logic per ADR-017:
 * 1. Teamspace admins always have 'owner' access to all channels (prevent lockout)
 * 2. If user has channel membership with role_override, use that
 * 3. If user has channel membership without role_override, use teamspace role
 * 4. If user has no channel membership, deny access (unless teamspace admin)
 *
 * @param teamspaceRole - User's role in the teamspace
 * @param channelMembership - User's channel membership record (if exists)
 * @returns Effective role in the channel
 */
function calculateEffectiveRole(
  teamspaceRole: TeamspaceRole,
  channelMembership: ChannelUser | null
): ChannelRole | null {
  // Teamspace admins and owners always have owner access to all channels
  if (teamspaceRole === 'admin' || teamspaceRole === 'owner') {
    return 'owner';
  }

  // User must have explicit channel membership
  if (!channelMembership) {
    return null; // Access denied
  }

  // Use role override if set, otherwise use teamspace role
  // Note: teamspaceRole is already a valid ChannelRole (owner/editor/viewer)
  return channelMembership.roleOverride ?? (teamspaceRole as ChannelRole);
}

/**
 * Channel middleware - ensures user has access to channel within teamspace
 *
 * This middleware:
 * 1. Requires teamspaceMiddleware to have run first (needs teamspace context)
 * 2. Extracts channelSlug from procedure input
 * 3. Resolves the channel by (teamspaceId, slug)
 * 4. Verifies user has access (direct membership OR teamspace admin)
 * 5. Calculates effective role with overrides
 * 6. Adds channel context and scoped repository to the context
 *
 * SECURITY: Returns NOT_FOUND instead of FORBIDDEN to prevent channel enumeration
 *
 * @example
 * ```typescript
 * // In a router:
 * export const myRouter = createTRPCRouter({
 *   getData: protectedProcedure
 *     .use(teamspaceMiddleware)
 *     .use(channelMiddleware)
 *     .input(z.object({
 *       teamspaceSlug: z.string(),
 *       channelSlug: z.string()
 *     }))
 *     .query(async ({ ctx }) => {
 *       // ctx.channel, ctx.channelRole, ctx.channelRepository available
 *     }),
 * });
 * ```
 */
export const channelMiddleware = middleware(async ({ ctx, next, input }) => {
  // Verify teamspace context exists (teamspaceMiddleware must run first)
  const teamspaceCtx = ctx as Partial<TeamspaceContext>;
  if (
    !teamspaceCtx.teamspace ||
    !teamspaceCtx.teamspaceRole ||
    !teamspaceCtx.teamspaceUser
  ) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message:
        'Channel middleware requires teamspace context. Use teamspaceMiddleware first.',
    });
  }

  // Require authenticated user (should already be guaranteed by teamspaceMiddleware)
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  // Extract channelSlug from input
  const inputSchema = z.object({
    channelSlug: z.string().min(1),
  });

  const parseResult = inputSchema.safeParse(input);
  if (!parseResult.success) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid input: channelSlug is required',
      cause: parseResult.error,
    });
  }

  const { channelSlug } = parseResult.data;

  // Resolve channel within the teamspace
  const resolved = await resolveChannel(
    ctx.user.id,
    teamspaceCtx.teamspace.id,
    channelSlug
  );

  if (!resolved) {
    // Return NOT_FOUND instead of FORBIDDEN to prevent enumeration attacks
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Channel not found',
    });
  }

  const { channel, membership } = resolved;

  // Calculate effective role
  const effectiveRole = calculateEffectiveRole(
    teamspaceCtx.teamspaceRole,
    membership
  );

  if (!effectiveRole) {
    // User doesn't have access to this channel
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have access to this channel',
    });
  }

  // Create channel-scoped repository
  const channelRepository = createChannelRepository(db, channel.id);

  return next({
    ctx: {
      ...ctx,
      ...teamspaceCtx,
      session: ctx.session,
      user: ctx.user,
      // Channel context
      channel,
      channelUser: membership,
      channelRole: effectiveRole,
      channelRepository,
    },
  });
});

/**
 * Role-based middleware factory for channel roles
 *
 * Creates middleware that requires a specific minimum channel role.
 * Role hierarchy: owner > editor > viewer
 *
 * @param minimumRole - The minimum role required
 */
export function requireChannelRole(minimumRole: ChannelRole) {
  const roleHierarchy: Record<ChannelRole, number> = {
    viewer: 1,
    editor: 2,
    owner: 3,
  };

  return middleware(async ({ ctx, next }) => {
    // This middleware should be used after channelMiddleware
    const role = (ctx as { channelRole?: ChannelRole }).channelRole;

    if (!role) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Role check failed: channel context not available',
      });
    }

    const userLevel = roleHierarchy[role];
    const requiredLevel = roleHierarchy[minimumRole];

    if (userLevel === undefined || requiredLevel === undefined) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Invalid role configuration',
      });
    }

    if (userLevel < requiredLevel) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `This action requires ${minimumRole} role or higher in the channel`,
      });
    }

    return next();
  });
}

/**
 * Middleware that requires channel owner role
 */
export const requireChannelOwner = requireChannelRole('owner');

/**
 * Middleware that requires channel editor role or higher
 */
export const requireChannelEditor = requireChannelRole('editor');
