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
import { eq } from 'drizzle-orm';
import { router, protectedProcedure } from '../procedures';
import { users } from '@/server/db/schema';
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
});

export type UserRouter = typeof userRouter;
