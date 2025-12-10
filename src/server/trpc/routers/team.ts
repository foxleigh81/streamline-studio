/**
 * Team Management tRPC Router
 *
 * Handles workspace team member operations: list, update role, remove.
 *
 * @see /docs/planning/app-planning-phases.md Phase 5.2
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
// eslint-disable-next-line no-restricted-imports -- Team operations require direct queries for membership validation and role checks
import { eq, and } from 'drizzle-orm';
import { router, workspaceProcedure, ownerProcedure } from '../trpc';
import { workspaceUsers, users } from '@/server/db/schema';
import { workspaceRoleSchema } from '@/lib/schemas/workspace';

/**
 * Team router
 */
export const teamRouter = router({
  /**
   * List all members of the workspace
   * Requires workspace access (any role)
   */
  list: workspaceProcedure.query(async ({ ctx }) => {
    const members = await ctx.db
      .select({
        userId: workspaceUsers.userId,
        role: workspaceUsers.role,
        joinedAt: workspaceUsers.createdAt,
        email: users.email,
        name: users.name,
      })
      .from(workspaceUsers)
      .innerJoin(users, eq(workspaceUsers.userId, users.id))
      .where(eq(workspaceUsers.workspaceId, ctx.workspace.id))
      .orderBy(workspaceUsers.createdAt);

    return members;
  }),

  /**
   * Update a member's role
   * Requires owner role
   */
  updateRole: ownerProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        role: workspaceRoleSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, role } = input;

      // Prevent owner from changing their own role
      if (userId === ctx.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot change your own role',
        });
      }

      // Verify the user is a member of this workspace
      const [existingMember] = await ctx.db
        .select()
        .from(workspaceUsers)
        .where(
          and(
            eq(workspaceUsers.workspaceId, ctx.workspace.id),
            eq(workspaceUsers.userId, userId)
          )
        )
        .limit(1);

      if (!existingMember) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User is not a member of this workspace',
        });
      }

      // Check if this would leave the workspace without an owner
      if (existingMember.role === 'owner' && role !== 'owner') {
        const ownerCount = await ctx.db
          .select({ userId: workspaceUsers.userId })
          .from(workspaceUsers)
          .where(
            and(
              eq(workspaceUsers.workspaceId, ctx.workspace.id),
              eq(workspaceUsers.role, 'owner')
            )
          );

        if (ownerCount.length === 1) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              'Cannot change role: workspace must have at least one owner',
          });
        }
      }

      // Update the role
      await ctx.db
        .update(workspaceUsers)
        .set({ role })
        .where(
          and(
            eq(workspaceUsers.workspaceId, ctx.workspace.id),
            eq(workspaceUsers.userId, userId)
          )
        );

      // Log the change in audit log
      await ctx.repository.createAuditLog({
        userId: ctx.user.id,
        action: 'team.role_changed',
        entityType: 'workspace_user',
        entityId: userId,
        metadata: {
          previousRole: existingMember.role,
          newRole: role,
        },
      });

      return { success: true };
    }),

  /**
   * Remove a member from the workspace
   * Requires owner role
   */
  remove: ownerProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = input;

      // Prevent owner from removing themselves
      if (userId === ctx.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot remove yourself from the workspace',
        });
      }

      // Verify the user is a member of this workspace
      const [existingMember] = await ctx.db
        .select()
        .from(workspaceUsers)
        .where(
          and(
            eq(workspaceUsers.workspaceId, ctx.workspace.id),
            eq(workspaceUsers.userId, userId)
          )
        )
        .limit(1);

      if (!existingMember) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User is not a member of this workspace',
        });
      }

      // Check if this would leave the workspace without an owner
      if (existingMember.role === 'owner') {
        const ownerCount = await ctx.db
          .select({ userId: workspaceUsers.userId })
          .from(workspaceUsers)
          .where(
            and(
              eq(workspaceUsers.workspaceId, ctx.workspace.id),
              eq(workspaceUsers.role, 'owner')
            )
          );

        if (ownerCount.length === 1) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot remove: workspace must have at least one owner',
          });
        }
      }

      // Remove the member
      await ctx.db
        .delete(workspaceUsers)
        .where(
          and(
            eq(workspaceUsers.workspaceId, ctx.workspace.id),
            eq(workspaceUsers.userId, userId)
          )
        );

      // Log the removal in audit log
      await ctx.repository.createAuditLog({
        userId: ctx.user.id,
        action: 'team.member_removed',
        entityType: 'workspace_user',
        entityId: userId,
        metadata: {
          role: existingMember.role,
        },
      });

      return { success: true };
    }),
});

export type TeamRouter = typeof teamRouter;
