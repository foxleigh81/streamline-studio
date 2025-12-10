/**
 * Setup tRPC Router
 *
 * Handles initial setup wizard operations.
 * Creates the first user and workspace, then locks the setup wizard.
 *
 * @see /docs/adrs/011-self-hosting-strategy.md
 * @see /docs/adrs/014-security-architecture.md
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';
import { users, workspaces, workspaceUsers } from '@/server/db/schema';
import {
  validatePassword,
  hashPassword,
  generateSessionToken,
  createSession,
  createSessionCookie,
} from '@/lib/auth';
import {
  isSetupComplete,
  markSetupComplete,
  validateSetupRequirements,
} from '@/lib/setup';

/**
 * Email validation schema
 */
const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email too long');

/**
 * Password validation schema
 */
const passwordSchema = z
  .string()
  .min(1, 'Password is required')
  .max(128, 'Password too long');

/**
 * Setup input schema
 */
const setupInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .optional(),
  workspaceName: z
    .string()
    .min(1, 'Workspace name is required')
    .max(100, 'Workspace name too long')
    .optional(),
});

/**
 * Setup response type
 */
interface SetupResponse {
  success: boolean;
  message: string;
}

/**
 * Setup router
 */
export const setupRouter = router({
  /**
   * Check if setup is complete
   *
   * Returns whether the initial setup wizard has been completed.
   * Used to determine if the setup wizard should be shown.
   */
  isComplete: publicProcedure.query(async (): Promise<boolean> => {
    return await isSetupComplete();
  }),

  /**
   * Complete initial setup
   *
   * Creates the first user and workspace, then locks the setup wizard.
   *
   * Security measures:
   * - Validates environment requirements
   * - Ensures setup can only be run once
   * - Validates password policy
   * - Creates user and workspace atomically
   * - Locks wizard after completion
   */
  complete: publicProcedure
    .input(setupInputSchema)
    .mutation(async ({ ctx, input }): Promise<SetupResponse> => {
      const { email, password, name, workspaceName } = input;

      // Check if setup is already complete
      const setupComplete = await isSetupComplete();
      if (setupComplete) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Setup has already been completed.',
        });
      }

      // Validate setup requirements (environment variables, etc.)
      const requirements = validateSetupRequirements();
      if (!requirements.valid) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Setup requirements not met: ${requirements.errors.join(', ')}`,
        });
      }

      // Validate password against policy
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: passwordValidation.errors[0] ?? 'Invalid password',
        });
      }

      // Check if any users exist (should not happen if setup not complete)
      const existingUsers = await ctx.db
        .select({ id: users.id })
        .from(users)
        .limit(1);

      if (existingUsers.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Users already exist. Setup cannot be run.',
        });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Use transaction to create user and workspace atomically
      const { newUser, newWorkspace } = await ctx.db.transaction(async (tx) => {
        // Create user
        const userResult = await tx
          .insert(users)
          .values({
            email: email.toLowerCase(),
            passwordHash,
            name: name ?? null,
          })
          .returning();

        const user = userResult[0];
        if (!user) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create user account',
          });
        }

        // Create workspace
        const workspaceResult = await tx
          .insert(workspaces)
          .values({
            name: workspaceName ?? 'My Workspace',
            slug: 'default',
            mode: 'single-tenant',
          })
          .returning();

        const workspace = workspaceResult[0];
        if (!workspace) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create workspace',
          });
        }

        // Link user to workspace as owner
        await tx.insert(workspaceUsers).values({
          workspaceId: workspace.id,
          userId: user.id,
          role: 'owner',
        });

        return { newUser: user, newWorkspace: workspace };
      });

      // Mark setup as complete (persists to file)
      try {
        await markSetupComplete();
      } catch (error) {
        console.error('[Setup] Failed to mark setup as complete:', error);
        // This is critical - if we can't persist the flag, we should fail
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message:
            'Failed to persist setup completion. Please check file permissions.',
        });
      }

      // Create session for the new user
      const sessionToken = generateSessionToken();
      await createSession(newUser.id, sessionToken);

      // Set session cookie in response
      const cookie = createSessionCookie(sessionToken);
      ctx.headers.set('Set-Cookie', cookie);

      console.log('[Setup] Initial setup completed successfully', {
        userId: newUser.id,
        workspaceId: newWorkspace.id,
      });

      return {
        success: true,
        message: 'Setup completed successfully! Welcome to Streamline Studio.',
      };
    }),
});

export type SetupRouter = typeof setupRouter;
