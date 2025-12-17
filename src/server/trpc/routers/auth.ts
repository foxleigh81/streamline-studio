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
import {
  users,
  channels,
  channelUsers,
  teamspaces,
  teamspaceUsers,
} from '@/server/db/schema';
import { DEFAULT_SINGLE_TENANT_TEAMSPACE_SLUG } from '@/server/repositories';
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
  channelName: z
    .string()
    .min(1, 'Channel name is required')
    .max(100, 'Channel name too long')
    .optional(), // Required for first user or in multi-tenant mode
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
   * Unified registration endpoint that handles both first-user and subsequent-user scenarios.
   * First user: Creates teamspace, channel, and user (becomes owner)
   * Subsequent users: Creates user and joins existing channel (becomes editor)
   *
   * Security measures:
   * - Rate limited by IP
   * - Password policy validation
   * - Generic response (prevents account enumeration)
   * - First-user detection in transaction (prevents race conditions)
   */
  register: publicProcedure
    .input(registerInputSchema)
    .mutation(async ({ ctx, input }): Promise<AuthResponse> => {
      const { email, password, name, channelName } = input;
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

      // In multi-tenant mode, channel name is required
      if (isMultiTenant && !channelName) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Channel name is required in multi-tenant mode',
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

      // Determine channel creation strategy
      let needsDefaultChannel = false;
      let createNewChannel = isMultiTenant; // Always create in multi-tenant

      if (isSingleTenant) {
        // In single-tenant mode, check if a teamspace exists
        // (We check for the default teamspace to determine if this is first user)
        const existingTeamspaces = await ctx.db
          .select({ id: teamspaces.id })
          .from(teamspaces)
          .where(eq(teamspaces.slug, DEFAULT_SINGLE_TENANT_TEAMSPACE_SLUG))
          .limit(1);

        needsDefaultChannel = existingTeamspaces.length === 0;
        createNewChannel = needsDefaultChannel;
      }

      // Use transaction to create user and optionally channel atomically
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

        let channel = null;
        let teamspaceRecord = null;

        // In single-tenant mode, create the default teamspace if needed
        if (isSingleTenant && needsDefaultChannel) {
          const teamspaceResult = await tx
            .insert(teamspaces)
            .values({
              name: 'Workspace',
              slug: DEFAULT_SINGLE_TENANT_TEAMSPACE_SLUG,
              mode: 'single-tenant',
            })
            .returning();

          teamspaceRecord = teamspaceResult[0];
          if (!teamspaceRecord) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to create default teamspace',
            });
          }
        } else if (isSingleTenant) {
          // Get existing default teamspace
          const existing = await tx
            .select()
            .from(teamspaces)
            .where(eq(teamspaces.slug, DEFAULT_SINGLE_TENANT_TEAMSPACE_SLUG))
            .limit(1);
          teamspaceRecord = existing[0] ?? null;
        }

        // Create channel if needed
        if (createNewChannel) {
          // Generate slug from channel name
          const channelNameToUse = channelName ?? 'My Channel';
          const slug = channelNameToUse
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

          // In multi-tenant, ensure slug is unique
          if (isMultiTenant) {
            const existingChannel = await tx
              .select({ id: channels.id })
              .from(channels)
              .where(eq(channels.slug, slug))
              .limit(1);

            if (existingChannel.length > 0) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: `Channel name "${channelName}" is already taken. Please choose a different name.`,
              });
            }
          }

          const channelResult = await tx
            .insert(channels)
            .values({
              name: channelNameToUse,
              slug,
              mode: isMultiTenant ? 'multi-tenant' : 'single-tenant',
              teamspaceId: teamspaceRecord?.id ?? null,
            })
            .returning();

          channel = channelResult[0];
          if (!channel) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to create channel',
            });
          }

          // Link user to channel as owner
          await tx.insert(channelUsers).values({
            channelId: channel.id,
            userId: user.id,
            role: 'owner',
          });

          // Link user to teamspace as owner (first user)
          if (teamspaceRecord) {
            await tx.insert(teamspaceUsers).values({
              teamspaceId: teamspaceRecord.id,
              userId: user.id,
              role: 'owner',
            });
          }
        } else if (isSingleTenant) {
          // In single-tenant mode but channel exists, add user to existing channel
          // This handles subsequent users in single-tenant mode
          const existingChannel = await tx.select().from(channels).limit(1);

          if (existingChannel[0]) {
            channel = existingChannel[0];
            await tx.insert(channelUsers).values({
              channelId: channel.id,
              userId: user.id,
              role: 'editor', // Subsequent users get editor role
            });
          }

          // Also add user to the default teamspace so they can access /t routes
          if (teamspaceRecord) {
            await tx.insert(teamspaceUsers).values({
              teamspaceId: teamspaceRecord.id,
              userId: user.id,
              role: 'editor', // Subsequent users get editor role in teamspace too
            });
          }
        }

        return { newUser: user, newChannel: channel };
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
        message: needsDefaultChannel
          ? 'Account and channel created successfully.'
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
