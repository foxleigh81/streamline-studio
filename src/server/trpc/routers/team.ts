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
import {
  router,
  simpleChannelProcedure,
  simpleChannelOwnerProcedure,
} from '../procedures';
import { channelUsers, users } from '@/server/db/schema';
import { workspaceRoleSchema } from '@/lib/schemas/workspace';

/**
 * Team router
 */
export const teamRouter = router({
  /**
   * List all members of the workspace
   * Requires workspace access (any role)
   */
  list: simpleChannelProcedure.query(async ({ ctx }) => {
    const members = await ctx.db
      .select({
        userId: channelUsers.userId,
        role: channelUsers.role,
        joinedAt: channelUsers.createdAt,
        email: users.email,
        name: users.name,
      })
      .from(channelUsers)
      .innerJoin(users, eq(channelUsers.userId, users.id))
      .where(eq(channelUsers.channelId, ctx.channel.id))
      .orderBy(channelUsers.createdAt);

    return members;
  }),

  /**
   * Update a member's role
   * Requires owner role
   */
  updateRole: simpleChannelOwnerProcedure
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
        .from(channelUsers)
        .where(
          and(
            eq(channelUsers.channelId, ctx.channel.id),
            eq(channelUsers.userId, userId)
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
          .select({ userId: channelUsers.userId })
          .from(channelUsers)
          .where(
            and(
              eq(channelUsers.channelId, ctx.channel.id),
              eq(channelUsers.role, 'owner')
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
        .update(channelUsers)
        .set({ role })
        .where(
          and(
            eq(channelUsers.channelId, ctx.channel.id),
            eq(channelUsers.userId, userId)
          )
        );

      // Log the change in audit log
      await ctx.channelRepository.createAuditLog({
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
  remove: simpleChannelOwnerProcedure
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
        .from(channelUsers)
        .where(
          and(
            eq(channelUsers.channelId, ctx.channel.id),
            eq(channelUsers.userId, userId)
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
          .select({ userId: channelUsers.userId })
          .from(channelUsers)
          .where(
            and(
              eq(channelUsers.channelId, ctx.channel.id),
              eq(channelUsers.role, 'owner')
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
        .delete(channelUsers)
        .where(
          and(
            eq(channelUsers.channelId, ctx.channel.id),
            eq(channelUsers.userId, userId)
          )
        );

      // Log the removal in audit log
      await ctx.channelRepository.createAuditLog({
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
