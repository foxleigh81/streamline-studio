/**
 * Workspace Access Validation
 *
 * Provides helper functions for validating user access to channels (workspaces).
 * Used by layouts and middleware that need to check channel membership.
 *
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 * @see /docs/adrs/007-api-and-auth.md
 */

import { cookies } from 'next/headers';
import { db } from '@/server/db';
import { channels, channelUsers } from '@/server/db/schema';
import type { Channel, ChannelUser } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { validateSessionToken } from './session';

/**
 * Result of workspace access validation
 */
export interface WorkspaceAccessResult {
  workspace: Channel;
  membership: ChannelUser;
}

/**
 * Result of user session validation
 */
export interface UserValidationResult {
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null;
}

/**
 * Validates the current request and returns the authenticated user
 *
 * @returns The authenticated user or null if not authenticated
 */
export async function validateRequest(): Promise<UserValidationResult> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value ?? null;

  if (!sessionToken) {
    return { user: null };
  }

  const { user } = await validateSessionToken(sessionToken);
  return { user };
}

/**
 * Validates user access to a workspace (channel) by slug
 *
 * Checks that:
 * 1. The channel exists
 * 2. The user is a member of the channel
 *
 * @param userId - The authenticated user's ID
 * @param workspaceSlug - The channel slug to validate access for
 * @returns Channel and membership info if access is valid, null otherwise
 */
export async function validateWorkspaceAccess(
  userId: string,
  workspaceSlug: string
): Promise<WorkspaceAccessResult | null> {
  const result = await db
    .select({
      workspace: channels,
      membership: channelUsers,
    })
    .from(channelUsers)
    .innerJoin(channels, eq(channelUsers.channelId, channels.id))
    .where(
      and(eq(channels.slug, workspaceSlug), eq(channelUsers.userId, userId))
    )
    .limit(1);

  const firstResult = result[0];
  if (!firstResult) {
    return null;
  }

  return {
    workspace: firstResult.workspace,
    membership: firstResult.membership,
  };
}
