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
import { createTeamspace } from '@/server/repositories';

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

  /**
   * Create a new teamspace
   *
   * Multi-tenant mode: Creates a new teamspace with the requesting user as owner
   * Single-tenant mode: Throws FORBIDDEN if a teamspace already exists
   *
   * Requires authentication
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z
          .string()
          .min(1, 'Name is required')
          .max(100, 'Name must be 100 characters or less'),
        slug: z
          .string()
          .min(1, 'Slug is required')
          .max(50, 'Slug must be 50 characters or less')
          .regex(
            /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
            'Slug must contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen'
          ),
        mode: z
          .enum(['single-tenant', 'multi-tenant'])
          .optional()
          .default('single-tenant'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Create teamspace using repository function (handles mode constraints)
        const result = await createTeamspace(
          ctx.db,
          {
            name: input.name,
            slug: input.slug,
            mode: input.mode,
          },
          ctx.user.id
        );

        return {
          id: result.teamspace.id,
          name: result.teamspace.name,
          slug: result.teamspace.slug,
          mode: result.teamspace.mode,
          createdAt: result.teamspace.createdAt,
          role: result.membership.role,
        };
      } catch (error) {
        // Handle specific error cases
        if (error instanceof Error) {
          if (error.message.includes('SINGLE_TENANT_CONSTRAINT')) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message:
                'Cannot create multiple teamspaces in single-tenant mode',
            });
          }
          if (error.message.includes('RESERVED_SLUG')) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: error.message.replace('RESERVED_SLUG: ', ''),
            });
          }
          // Check for unique constraint violation on slug
          if (
            error.message.includes('unique') ||
            error.message.includes('duplicate')
          ) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'A teamspace with this slug already exists',
            });
          }
        }
        // Re-throw other errors as internal server errors
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create teamspace',
          cause: error,
        });
      }
    }),
});

export type TeamspaceRouter = typeof teamspaceRouter;
