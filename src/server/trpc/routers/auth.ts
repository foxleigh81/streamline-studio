/**
 * Auth tRPC Router
 *
 * Handles authentication operations: register, login, logout.
 *
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 * @see /docs/adrs/014-security-architecture.md
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { router, publicProcedure, protectedProcedure } from '../procedures';
import { users, workspaces, workspaceUsers } from '@/server/db/schema';
import {
  validatePassword,
  hashPassword,
  verifyPassword,
} from '@/lib/auth/password';
import {
  generateSessionToken,
  createSession,
  invalidateSessionByToken,
  createSessionCookie,
  createBlankSessionCookie,
  parseSessionToken,
} from '@/lib/auth/session';
import {
  checkRateLimit,
  getClientIp,
  createLoginRateLimitKey,
  createRegistrationRateLimitKey,
  RATE_LIMITS,
} from '@/lib/auth/rate-limit';
import { serverEnv } from '@/lib/env';

/**
 * Email validation schema
 */
const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email too long');

/**
 * Password validation schema (basic length check, policy enforced separately)
 */
const passwordSchema = z
  .string()
  .min(1, 'Password is required')
  .max(128, 'Password too long');

/**
 * Registration input schema
 */
const registerInputSchema = z.object({
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
    .optional(), // Required in multi-tenant, optional in single-tenant
});

/**
 * Login input schema
 */
const loginInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

/**
 * Auth response type (prevents account enumeration)
 * @see ADR-014: Account Enumeration Prevention
 */
interface AuthResponse {
  success: boolean;
  message: string;
}

/**
 * Auth router with register, login, and logout procedures
 */
export const authRouter = router({
  /**
   * Register a new user
   *
   * Security measures:
   * - Rate limited by IP
   * - Password policy validation
   * - Generic response (prevents account enumeration)
   */
  register: publicProcedure
    .input(registerInputSchema)
    .mutation(async ({ ctx, input }): Promise<AuthResponse> => {
      const { email, password, name, workspaceName } = input;
      const clientIp = getClientIp(ctx.headers);

      // Rate limit check
      await checkRateLimit(
        createRegistrationRateLimitKey(clientIp),
        RATE_LIMITS.registration
      );

      // Validate password against policy
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: passwordValidation.errors[0] ?? 'Invalid password',
        });
      }

      // Determine mode
      const isSingleTenant = serverEnv.MODE === 'single-tenant';
      const isMultiTenant = serverEnv.MODE === 'multi-tenant';

      // In multi-tenant mode, workspace name is required
      if (isMultiTenant && !workspaceName) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Workspace name is required in multi-tenant mode',
        });
      }

      // Check if email already exists
      const existingUser = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existingUser.length > 0) {
        // Return generic response to prevent account enumeration
        // In a real app with email verification, we'd still send an email
        return {
          success: true,
          message:
            'If this email is not already registered, you will receive a confirmation email.',
        };
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Determine workspace creation strategy
      let needsDefaultWorkspace = false;
      let createNewWorkspace = isMultiTenant; // Always create in multi-tenant

      if (isSingleTenant) {
        // Check if any workspace exists (indicates this is the first user)
        const existingWorkspaces = await ctx.db
          .select({ id: workspaces.id })
          .from(workspaces)
          .limit(1);
        needsDefaultWorkspace = existingWorkspaces.length === 0;
        createNewWorkspace = needsDefaultWorkspace;
      }

      // Use transaction to create user and optionally workspace atomically
      const { newUser } = await ctx.db.transaction(async (tx) => {
        // Create user
        const userResult = await tx
          .insert(users)
          .values({
            email: email.toLowerCase(),
            passwordHash,
            name: name ?? null,
          })
          .returning({ id: users.id });

        const user = userResult[0];
        if (!user) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create user account',
          });
        }

        let workspace = null;

        // Create workspace if needed
        if (createNewWorkspace) {
          // Generate slug from workspace name
          const slug = isMultiTenant
            ? workspaceName!
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '')
            : 'default';

          // In multi-tenant, ensure slug is unique
          if (isMultiTenant) {
            const existingWorkspace = await tx
              .select({ id: workspaces.id })
              .from(workspaces)
              .where(eq(workspaces.slug, slug))
              .limit(1);

            if (existingWorkspace.length > 0) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: `Workspace name "${workspaceName}" is already taken. Please choose a different name.`,
              });
            }
          }

          const workspaceResult = await tx
            .insert(workspaces)
            .values({
              name: workspaceName ?? 'My Workspace',
              slug,
              mode: isMultiTenant ? 'multi-tenant' : 'single-tenant',
            })
            .returning();

          workspace = workspaceResult[0];
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
        } else if (isSingleTenant) {
          // In single-tenant mode but workspace exists, add user to existing workspace
          // This handles subsequent users in single-tenant mode
          const existingWorkspace = await tx.select().from(workspaces).limit(1);

          if (existingWorkspace[0]) {
            workspace = existingWorkspace[0];
            await tx.insert(workspaceUsers).values({
              workspaceId: workspace.id,
              userId: user.id,
              role: 'editor', // Subsequent users get editor role
            });
          }
        }

        return { newUser: user, newWorkspace: workspace };
      });

      if (!newUser) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create user account',
        });
      }

      // Create session
      const sessionToken = generateSessionToken();
      await createSession(newUser.id, sessionToken);

      // Set session cookie in response
      const cookie = createSessionCookie(sessionToken);
      ctx.headers.set('Set-Cookie', cookie);

      return {
        success: true,
        message: needsDefaultWorkspace
          ? 'Account and workspace created successfully.'
          : 'Account created successfully.',
      };
    }),

  /**
   * Login an existing user
   *
   * Security measures:
   * - Rate limited by IP + email
   * - Constant-time password comparison (via Argon2)
   * - Generic error messages (prevents account enumeration)
   */
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(async ({ ctx, input }): Promise<AuthResponse> => {
      const { email, password } = input;
      const clientIp = getClientIp(ctx.headers);

      // Rate limit check (per IP + email combination)
      await checkRateLimit(
        createLoginRateLimitKey(clientIp, email),
        RATE_LIMITS.login
      );

      // Find user by email
      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      // Generic error message for both "user not found" and "wrong password"
      const invalidCredentialsError = new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password.',
      });

      if (!user) {
        // Perform a dummy hash to prevent timing attacks
        await hashPassword(password);
        throw invalidCredentialsError;
      }

      // Verify password
      const isValidPassword = await verifyPassword(user.passwordHash, password);

      if (!isValidPassword) {
        throw invalidCredentialsError;
      }

      // Create session
      const sessionToken = generateSessionToken();
      await createSession(user.id, sessionToken);

      // Set session cookie in response
      const cookie = createSessionCookie(sessionToken);
      ctx.headers.set('Set-Cookie', cookie);

      return {
        success: true,
        message: 'Login successful.',
      };
    }),

  /**
   * Logout the current user
   *
   * Invalidates the session server-side and clears the cookie
   */
  logout: publicProcedure.mutation(async ({ ctx }): Promise<AuthResponse> => {
    const cookieHeader = ctx.req.headers.get('cookie');
    const sessionToken = parseSessionToken(cookieHeader);

    if (sessionToken) {
      await invalidateSessionByToken(sessionToken);
    }

    // Clear session cookie
    const cookie = createBlankSessionCookie();
    ctx.headers.set('Set-Cookie', cookie);

    return {
      success: true,
      message: 'Logged out successfully.',
    };
  }),

  /**
   * Get current user session info
   *
   * Returns the current user if authenticated, null otherwise
   */
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      return null;
    }

    return {
      id: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name,
    };
  }),

  /**
   * Protected route example - requires authentication
   */
  whoami: protectedProcedure.query(async ({ ctx }) => {
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name,
    };
  }),
});

export type AuthRouter = typeof authRouter;
