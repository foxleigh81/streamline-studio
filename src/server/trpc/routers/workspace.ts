/**
 * Workspace tRPC Router
 *
 * Handles workspace operations: list user workspaces, create workspace, get workspace.
 *
 * @see /docs/planning/app-planning-phases.md Phase 5.3
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
// eslint-disable-next-line no-restricted-imports -- Workspace operations require direct queries for workspace access validation
import { eq, and } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import { workspaces, workspaceUsers } from '@/server/db/schema';
import { serverEnv } from '@/lib/env';

/**
 * Workspace creation input schema
 */
const createWorkspaceInputSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(100),
});

/**
 * Workspace router
 */
export const workspaceRouter = router({
  /**
   * List all workspaces the current user has access to
   * Requires authentication
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const userWorkspaces = await ctx.db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        role: workspaceUsers.role,
        joinedAt: workspaceUsers.createdAt,
      })
      .from(workspaceUsers)
      .innerJoin(workspaces, eq(workspaceUsers.workspaceId, workspaces.id))
      .where(eq(workspaceUsers.userId, ctx.user.id))
      .orderBy(workspaceUsers.createdAt);

    return userWorkspaces;
  }),

  /**
   * Get a specific workspace by slug
   * Verifies user has access to the workspace
   */
  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select({
          id: workspaces.id,
          name: workspaces.name,
          slug: workspaces.slug,
          mode: workspaces.mode,
          role: workspaceUsers.role,
        })
        .from(workspaceUsers)
        .innerJoin(workspaces, eq(workspaceUsers.workspaceId, workspaces.id))
        .where(
          and(
            eq(workspaces.slug, input.slug),
            eq(workspaceUsers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (result.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workspace not found',
        });
      }

      return result[0];
    }),

  /**
   * Create a new workspace
   * Only available in multi-tenant mode
   */
  create: protectedProcedure
    .input(createWorkspaceInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Only allow workspace creation in multi-tenant mode
      if (serverEnv.MODE !== 'multi-tenant') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Workspace creation is only available in multi-tenant mode',
        });
      }

      // Generate slug from name
      const baseSlug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Check if slug is unique, append random suffix if not
      let slug = baseSlug;
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        const existingWorkspace = await ctx.db
          .select({ id: workspaces.id })
          .from(workspaces)
          .where(eq(workspaces.slug, slug))
          .limit(1);

        if (existingWorkspace.length === 0) {
          // Slug is unique
          break;
        }

        // Append random suffix
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        slug = `${baseSlug}-${randomSuffix}`;
        attempts++;
      }

      if (attempts === maxAttempts) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate unique workspace slug',
        });
      }

      // Create workspace and add user as owner in transaction
      const result = await ctx.db.transaction(async (tx) => {
        const [workspace] = await tx
          .insert(workspaces)
          .values({
            name: input.name,
            slug,
            mode: 'multi-tenant',
          })
          .returning();

        if (!workspace) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create workspace',
          });
        }

        await tx.insert(workspaceUsers).values({
          workspaceId: workspace.id,
          userId: ctx.user.id,
          role: 'owner',
        });

        return workspace;
      });

      return {
        id: result.id,
        name: result.name,
        slug: result.slug,
      };
    }),
});

export type WorkspaceRouter = typeof workspaceRouter;
