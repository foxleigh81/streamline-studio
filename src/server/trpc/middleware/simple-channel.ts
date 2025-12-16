/**
 * Simple Channel tRPC Middleware
 *
 * Ensures user has access to the requested channel without requiring teamspace context.
 * This is used for simpler operations that don't need the full teamspace/channel hierarchy.
 *
 * For single-tenant mode, this auto-selects the user's channel.
 * For multi-tenant mode, the channel ID is resolved from headers.
 *
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

import { TRPCError } from '@trpc/server';
import { eq, and } from 'drizzle-orm';
import { middleware } from '../trpc';
import { db } from '@/server/db';
import { channels, channelUsers } from '@/server/db/schema';
import type { Channel, ChannelUser, ChannelRole } from '@/server/db/schema';
import {
  createChannelRepository,
  type ChannelRepository,
} from '@/server/repositories';
import { serverEnv } from '@/lib/env';

/**
 * Extended context with channel information (simple version)
 */
export interface SimpleChannelContext {
  channel: Channel;
  channelUser: ChannelUser;
  channelRole: ChannelRole;
  channelRepository: ChannelRepository;
}

/**
 * Get channel from request headers or default channel for single-tenant mode
 */
async function resolveChannel(
  userId: string,
  headers: Headers
): Promise<{ channel: Channel; membership: ChannelUser } | null> {
  const mode = serverEnv.MODE;

  if (mode === 'single-tenant') {
    // In single-tenant mode, get the user's channel (should be exactly one)
    const result = await db
      .select({
        channel: channels,
        membership: channelUsers,
      })
      .from(channelUsers)
      .innerJoin(channels, eq(channelUsers.channelId, channels.id))
      .where(eq(channelUsers.userId, userId))
      .limit(1);

    const firstResult = result[0];
    if (!firstResult) {
      return null;
    }

    return {
      channel: firstResult.channel,
      membership: firstResult.membership,
    };
  }

  // In multi-tenant mode, channel ID is required from headers
  const channelId = headers.get('x-channel-id');
  if (!channelId) {
    return null;
  }

  // Verify user has access to this channel
  const result = await db
    .select({
      channel: channels,
      membership: channelUsers,
    })
    .from(channelUsers)
    .innerJoin(channels, eq(channelUsers.channelId, channels.id))
    .where(
      and(
        eq(channelUsers.channelId, channelId),
        eq(channelUsers.userId, userId)
      )
    )
    .limit(1);

  const firstResult = result[0];
  if (!firstResult) {
    return null;
  }

  return {
    channel: firstResult.channel,
    membership: firstResult.membership,
  };
}

/**
 * Simple channel middleware - ensures user has access to a channel
 *
 * This middleware:
 * 1. Resolves the channel (from header in multi-tenant, or default in single-tenant)
 * 2. Verifies the user is a member of the channel
 * 3. Adds channel context and scoped repository to the context
 *
 * SECURITY: Returns NOT_FOUND instead of FORBIDDEN to prevent channel enumeration
 */
export const simpleChannelMiddleware = middleware(async ({ ctx, next }) => {
  // Require authenticated user
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  const resolved = await resolveChannel(ctx.user.id, ctx.headers);

  if (!resolved) {
    // Return NOT_FOUND instead of FORBIDDEN to prevent enumeration attacks
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Channel not found',
    });
  }

  const { channel, membership } = resolved;

  // Create channel-scoped repository
  const channelRepository = createChannelRepository(db, channel.id);

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
      // Channel context
      channel,
      channelUser: membership,
      channelRole: membership.role,
      channelRepository,
    },
  });
});

/**
 * Role-based middleware factory
 *
 * Creates middleware that requires a specific minimum role.
 * Role hierarchy: owner > editor > viewer
 */
export function requireSimpleChannelRole(minimumRole: ChannelRole) {
  const roleHierarchy: Record<ChannelRole, number> = {
    viewer: 1,
    editor: 2,
    owner: 3,
  };

  return middleware(async ({ ctx, next }) => {
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
        message: `This action requires ${minimumRole} role or higher`,
      });
    }

    return next();
  });
}

/**
 * Middleware that requires owner role
 */
export const requireSimpleChannelOwner = requireSimpleChannelRole('owner');

/**
 * Middleware that requires editor role or higher
 */
export const requireSimpleChannelEditor = requireSimpleChannelRole('editor');
