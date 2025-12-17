/**
 * User tRPC Router
 *
 * Handles user profile and account management operations.
 *
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/014-security-architecture.md
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
// eslint-disable-next-line no-restricted-imports -- User data is not workspace-scoped, direct queries are appropriate
import { eq, and } from 'drizzle-orm';
import { router, protectedProcedure } from '../procedures';
import {
  users,
  userPreferences,
  channels,
  channelUsers,
  teamspaces,
} from '@/server/db/schema';
import {
  validatePassword,
  hashPassword,
  verifyPassword,
} from '@/lib/auth/password';
import { invalidateUserSessionsExcept } from '@/lib/auth/session';
import {
  checkRateLimit,
  createPasswordChangeRateLimitKey,
  RATE_LIMITS,
} from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';

/**
 * User profile update input schema
 */
const updateProfileInputSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .optional(),
});

/**
 * Password change input schema
 */
const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(1, 'New password is required')
    .max(128, 'New password too long'),
});

/**
 * User preferences update input schema
 * All fields are optional for partial updates
 */
const updatePreferencesInputSchema = z.object({
  defaultChannelId: z.string().uuid().optional().nullable(),
  contentPlanViewMode: z.enum(['grid', 'table']).optional(),
  dateFormat: z.enum(['ISO', 'US', 'EU', 'UK']).optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),
});

/**
 * User router with profile and password management procedures
 */
export const userRouter = router({
  /**
   * Get current user profile
   *
   * Returns the authenticated user's profile information
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name,
    };
  }),

  /**
   * Update user profile
   *
   * Allows users to update their display name
   */
  updateProfile: protectedProcedure
    .input(updateProfileInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { name } = input;

      // Update user in database
      await ctx.db
        .update(users)
        .set({
          name: name ?? null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id));

      logger.info({ userId: ctx.user.id }, 'User profile updated');

      return {
        success: true,
        message: 'Profile updated successfully.',
      };
    }),

  /**
   * Change password
   *
   * Security measures:
   * - Rate limited to 5 attempts per hour per user
   * - Requires current password verification
   * - Validates new password against policy
   * - Uses Argon2id for hashing
   * - Invalidates all other sessions on successful change
   */
  changePassword: protectedProcedure
    .input(changePasswordInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { currentPassword, newPassword } = input;

      // Apply rate limiting to prevent brute force attacks
      const rateLimitKey = createPasswordChangeRateLimitKey(ctx.user.id);
      await checkRateLimit(rateLimitKey, RATE_LIMITS.passwordChange);

      // Get current user with password hash
      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found.',
        });
      }

      // Verify current password
      const isValidPassword = await verifyPassword(
        user.passwordHash,
        currentPassword
      );

      if (!isValidPassword) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Current password is incorrect.',
        });
      }

      // Validate new password against policy
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: passwordValidation.errors[0] ?? 'Invalid password',
        });
      }

      // Check that new password is different from current
      const isSamePassword = await verifyPassword(
        user.passwordHash,
        newPassword
      );

      if (isSamePassword) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'New password must be different from current password.',
        });
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password in database
      await ctx.db
        .update(users)
        .set({
          passwordHash: newPasswordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id));

      // Invalidate all other sessions except the current one
      // This is a security best practice to prevent unauthorized access
      // if the password was changed due to a suspected breach
      if (ctx.session) {
        await invalidateUserSessionsExcept(ctx.user.id, ctx.session.id);
        logger.info(
          { userId: ctx.user.id },
          'User password changed - all other sessions invalidated'
        );
      } else {
        logger.info({ userId: ctx.user.id }, 'User password changed');
      }

      return {
        success: true,
        message: 'Password changed successfully.',
      };
    }),

  /**
   * Get user preferences
   *
   * Returns the user's preferences or default values if not set
   */
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const [preferences] = await ctx.db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, ctx.user.id))
      .limit(1);

    // Return defaults if no preferences exist
    if (!preferences) {
      return {
        userId: ctx.user.id,
        defaultChannelId: null,
        contentPlanViewMode: 'grid' as const,
        dateFormat: 'ISO' as const,
        timeFormat: '24h' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return preferences;
  }),

  /**
   * Update user preferences
   *
   * Supports partial updates. Validates that default channel exists
   * and user has access to it before saving.
   */
  updatePreferences: protectedProcedure
    .input(updatePreferencesInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate default channel if provided
      if (input.defaultChannelId) {
        const [channelAccess] = await ctx.db
          .select({ channelId: channelUsers.channelId })
          .from(channelUsers)
          .where(
            and(
              eq(channelUsers.userId, ctx.user.id),
              eq(channelUsers.channelId, input.defaultChannelId)
            )
          )
          .limit(1);

        if (!channelAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message:
              'You do not have access to this channel or it does not exist.',
          });
        }
      }

      // Upsert preferences
      await ctx.db
        .insert(userPreferences)
        .values({
          userId: ctx.user.id,
          ...input,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: userPreferences.userId,
          set: {
            ...input,
            updatedAt: new Date(),
          },
        });

      logger.info({ userId: ctx.user.id }, 'User preferences updated');

      return {
        success: true,
        message: 'Preferences updated successfully.',
      };
    }),

  /**
   * Get channels available for setting as default
   *
   * Returns all channels the user has access to, ordered by name
   */
  getAvailableChannels: protectedProcedure.query(async ({ ctx }) => {
    const availableChannels = await ctx.db
      .select({
        id: channels.id,
        name: channels.name,
        slug: channels.slug,
        teamspaceName: teamspaces.name,
        teamspaceSlug: teamspaces.slug,
      })
      .from(channelUsers)
      .innerJoin(channels, eq(channelUsers.channelId, channels.id))
      .innerJoin(teamspaces, eq(channels.teamspaceId, teamspaces.id))
      .where(eq(channelUsers.userId, ctx.user.id))
      .orderBy(channels.name);

    return availableChannels;
  }),
});

export type UserRouter = typeof userRouter;
