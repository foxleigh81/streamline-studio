/**
 * Teamspace tRPC Router
 *
 * Handles teamspace operations: list user teamspaces, get teamspace by slug.
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
// eslint-disable-next-line no-restricted-imports -- Teamspace operations require direct queries for access validation
import { eq, and } from 'drizzle-orm';
import { router, protectedProcedure } from '../procedures';
import { teamspaces, teamspaceUsers } from '@/server/db/schema';

/**
 * Teamspace router
 */
export const teamspaceRouter = router({
  /**
   * List all teamspaces the current user has access to
   * Requires authentication
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const userTeamspaces = await ctx.db
      .select({
        id: teamspaces.id,
        name: teamspaces.name,
        slug: teamspaces.slug,
        role: teamspaceUsers.role,
        joinedAt: teamspaceUsers.joinedAt,
        createdAt: teamspaces.createdAt,
      })
      .from(teamspaceUsers)
      .innerJoin(teamspaces, eq(teamspaceUsers.teamspaceId, teamspaces.id))
      .where(eq(teamspaceUsers.userId, ctx.user.id))
      .orderBy(teamspaceUsers.joinedAt);

    return userTeamspaces;
  }),

  /**
   * Get a specific teamspace by slug
   * Verifies user has access to the teamspace
   */
  getBySlug: protectedProcedure
    .input(
      z.object({
        slug: z
          .string()
          .regex(
            /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
            'Slug must contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen'
          ),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select({
          id: teamspaces.id,
          name: teamspaces.name,
          slug: teamspaces.slug,
          role: teamspaceUsers.role,
          createdAt: teamspaces.createdAt,
        })
        .from(teamspaceUsers)
        .innerJoin(teamspaces, eq(teamspaceUsers.teamspaceId, teamspaces.id))
        .where(
          and(
            eq(teamspaces.slug, input.slug),
            eq(teamspaceUsers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (result.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Teamspace not found',
        });
      }

      return result[0];
    }),
});

export type TeamspaceRouter = typeof teamspaceRouter;
