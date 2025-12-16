/**
 * Invitation tRPC Router
 *
 * Handles workspace invitation operations: create, list, revoke, accept, validate.
 *
 * @see /docs/planning/app-planning-phases.md Phase 5.2
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 * @see /docs/adrs/014-security-architecture.md
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
// eslint-disable-next-line no-restricted-imports -- Invitation operations require direct queries for public token validation (not workspace-scoped)
import { eq, and, gt, isNull } from 'drizzle-orm';
import { router, publicProcedure, ownerProcedure } from '../procedures';
import { invitations, users, projectUsers, auditLog } from '@/server/db/schema';
import {
  generateInvitationToken,
  calculateInvitationExpiry,
  isInvitationExpired,
  hasExceededAttempts,
  compareTokensConstantTime,
} from '@/lib/invitation';
import { sendInvitationEmail } from '@/lib/email';
import { hashPassword } from '@/lib/auth/password';
import {
  generateSessionToken,
  createSession,
  createSessionCookie,
} from '@/lib/auth/session';
import { workspaceRoleSchema } from '@/lib/schemas/workspace';
import { logger } from '@/lib/logger';

/**
 * Email validation schema
 */
const emailSchema = z.string().email('Invalid email address').max(255);

/**
 * Create invitation input schema
 */
const createInvitationInputSchema = z.object({
  email: emailSchema,
  role: workspaceRoleSchema.default('editor'),
});

/**
 * Accept invitation input schema
 */
const acceptInvitationInputSchema = z.object({
  token: z.string().length(64, 'Invalid invitation token'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(100).optional(),
});

/**
 * Invitation router
 */
export const invitationRouter = router({
  /**
   * Create a new invitation
   * Requires owner role
   */
  create: ownerProcedure
    .input(createInvitationInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { email, role } = input;

      // Check if user already exists and is already a member
      const existingUser = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existingUser.length > 0) {
        const userId = existingUser[0]!.id;

        // Check if user is already a member of this workspace
        const existingMembership = await ctx.db
          .select()
          .from(projectUsers)
          .where(
            and(
              eq(projectUsers.projectId, ctx.workspace.id),
              eq(projectUsers.userId, userId)
            )
          )
          .limit(1);

        if (existingMembership.length > 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'This user is already a member of this workspace',
          });
        }
      }

      // Check if there's already a pending invitation for this email
      const existingInvitation = await ctx.db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.workspaceId, ctx.workspace.id),
            eq(invitations.email, email.toLowerCase()),
            isNull(invitations.acceptedAt),
            gt(invitations.expiresAt, new Date()) // Not expired
          )
        )
        .limit(1);

      if (existingInvitation.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'There is already a pending invitation for this email address',
        });
      }

      // Generate token and expiry
      const token = generateInvitationToken();
      const expiresAt = calculateInvitationExpiry();

      // Create invitation
      const [invitation] = await ctx.db
        .insert(invitations)
        .values({
          workspaceId: ctx.workspace.id,
          email: email.toLowerCase(),
          role,
          token,
          expiresAt,
          createdBy: ctx.user.id,
        })
        .returning();

      if (!invitation) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create invitation',
        });
      }

      // Log invitation creation in audit log
      await ctx.repository.createAuditLog({
        userId: ctx.user.id,
        action: 'invitation.created',
        entityType: 'invitation',
        entityId: invitation.id,
        metadata: {
          email: invitation.email,
          role: invitation.role,
        },
      });

      // Send invitation email (async, non-blocking in production)
      const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`;

      // Fire and forget - log errors but don't fail the request
      sendInvitationEmail(
        email,
        ctx.workspace.name,
        ctx.user.name || ctx.user.email,
        invitationUrl
      ).catch((error) => {
        logger.error({ error }, '[Invitation] Failed to send invitation email');
      });

      return {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      };
    }),

  /**
   * List all pending invitations for the workspace
   * Requires owner role
   */
  list: ownerProcedure.query(async ({ ctx }) => {
    const pendingInvitations = await ctx.db
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        expiresAt: invitations.expiresAt,
        createdAt: invitations.createdAt,
        createdBy: invitations.createdBy,
      })
      .from(invitations)
      .where(
        and(
          eq(invitations.workspaceId, ctx.workspace.id),
          isNull(invitations.acceptedAt)
        )
      )
      .orderBy(invitations.createdAt);

    return pendingInvitations;
  }),

  /**
   * Revoke (delete) an invitation
   * Requires owner role
   */
  revoke: ownerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .delete(invitations)
        .where(
          and(
            eq(invitations.id, input.id),
            eq(invitations.workspaceId, ctx.workspace.id)
          )
        )
        .returning({ id: invitations.id, email: invitations.email });

      if (result.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invitation not found',
        });
      }

      // Log invitation revocation in audit log
      await ctx.repository.createAuditLog({
        userId: ctx.user.id,
        action: 'invitation.revoked',
        entityType: 'invitation',
        entityId: result[0]!.id,
        metadata: {
          email: result[0]!.email,
        },
      });

      return { success: true };
    }),

  /**
   * Validate an invitation token (public endpoint)
   * Returns invitation details without accepting
   */
  validate: publicProcedure
    .input(z.object({ token: z.string().length(64) }))
    .query(async ({ ctx, input }) => {
      const [invitation] = await ctx.db
        .select({
          id: invitations.id,
          email: invitations.email,
          role: invitations.role,
          token: invitations.token,
          expiresAt: invitations.expiresAt,
          attempts: invitations.attempts,
          acceptedAt: invitations.acceptedAt,
          workspaceId: invitations.workspaceId,
        })
        .from(invitations)
        .where(eq(invitations.token, input.token))
        .limit(1);

      if (!invitation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid invitation token',
        });
      }

      // Additional constant-time token validation to prevent timing attacks
      if (!compareTokensConstantTime(invitation.token, input.token)) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invalid invitation token',
        });
      }

      if (invitation.acceptedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This invitation has already been accepted',
        });
      }

      if (isInvitationExpired(invitation.expiresAt)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This invitation has expired',
        });
      }

      if (hasExceededAttempts(invitation.attempts)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'This invitation has exceeded the maximum number of attempts',
        });
      }

      // Get workspace name
      const workspace = await ctx.db.query.projects.findFirst({
        where: (projects, { eq }) => eq(projects.id, invitation.workspaceId),
        columns: {
          name: true,
          slug: true,
        },
      });

      return {
        email: invitation.email,
        role: invitation.role,
        workspaceName: workspace?.name || 'Unknown Workspace',
        workspaceSlug: workspace?.slug || '',
      };
    }),

  /**
   * Accept an invitation (public endpoint)
   * Creates user account and adds to workspace
   */
  accept: publicProcedure
    .input(acceptInvitationInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { token, password, name } = input;

      // Start transaction
      return await ctx.db.transaction(async (tx) => {
        // Get invitation with FOR UPDATE lock
        const [invitation] = await tx
          .select()
          .from(invitations)
          .where(eq(invitations.token, token))
          .for('update')
          .limit(1);

        if (!invitation) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Invalid invitation token',
          });
        }

        // Additional constant-time token validation to prevent timing attacks
        if (!compareTokensConstantTime(invitation.token, token)) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Invalid invitation token',
          });
        }

        // Increment attempts
        await tx
          .update(invitations)
          .set({ attempts: invitation.attempts + 1 })
          .where(eq(invitations.id, invitation.id));

        // Validate invitation
        if (invitation.acceptedAt) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'This invitation has already been accepted',
          });
        }

        if (isInvitationExpired(invitation.expiresAt)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'This invitation has expired',
          });
        }

        if (hasExceededAttempts(invitation.attempts + 1)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              'This invitation has exceeded the maximum number of attempts',
          });
        }

        // Check if user already exists
        const existingUser = await tx
          .select()
          .from(users)
          .where(eq(users.email, invitation.email))
          .limit(1);

        let userId: string;

        if (existingUser.length > 0) {
          // User exists - just add to workspace
          userId = existingUser[0]!.id;

          // Check if already a member
          const existingMembership = await tx
            .select()
            .from(projectUsers)
            .where(
              and(
                eq(projectUsers.projectId, invitation.workspaceId),
                eq(projectUsers.userId, userId)
              )
            )
            .limit(1);

          if (existingMembership.length > 0) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'You are already a member of this workspace',
            });
          }
        } else {
          // Create new user
          const passwordHash = await hashPassword(password);

          const [newUser] = await tx
            .insert(users)
            .values({
              email: invitation.email,
              passwordHash,
              name: name || null,
            })
            .returning({ id: users.id });

          if (!newUser) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to create user account',
            });
          }

          userId = newUser.id;
        }

        // Add user to workspace
        await tx.insert(projectUsers).values({
          projectId: invitation.workspaceId,
          userId,
          role: invitation.role,
        });

        // Mark invitation as accepted
        await tx
          .update(invitations)
          .set({ acceptedAt: new Date() })
          .where(eq(invitations.id, invitation.id));

        // Create session for the user so they're automatically logged in
        const sessionToken = generateSessionToken();
        await createSession(userId, sessionToken);

        // Set session cookie (HttpOnly, Secure, SameSite)
        const cookie = createSessionCookie(sessionToken);
        ctx.headers.set('Set-Cookie', cookie);

        // Log invitation acceptance in audit log
        await tx.insert(auditLog).values({
          workspaceId: invitation.workspaceId,
          userId,
          action: 'invitation.accepted',
          entityType: 'invitation',
          entityId: invitation.id,
          metadata: {
            email: invitation.email,
            role: invitation.role,
          },
        });

        return {
          success: true,
          message: 'Invitation accepted successfully',
          // Note: sessionToken is NOT returned in response for security
          // Cookie is set via Set-Cookie header instead
        };
      });
    }),
});

export type InvitationRouter = typeof invitationRouter;
