/**
 * Teamspace tRPC Middleware
 *
 * Ensures user has access to the requested teamspace and provides
 * teamspace-scoped repository in context.
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

import { TRPCError } from '@trpc/server';
import { eq, and } from 'drizzle-orm';
import { middleware } from '../trpc';
import { db } from '@/server/db';
import { teamspaces, teamspaceUsers } from '@/server/db/schema';
import type {
  Teamspace,
  TeamspaceUser,
  TeamspaceRole,
} from '@/server/db/schema';
import {
  createTeamspaceRepository,
  type TeamspaceRepository,
} from '@/server/repositories';
import { z } from 'zod';

/**
 * Extended context with teamspace information
 */
export interface TeamspaceContext {
  teamspace: Teamspace;
  teamspaceUser: TeamspaceUser;
  teamspaceRole: TeamspaceRole;
  teamspaceRepository: TeamspaceRepository;
}

/**
 * Resolve teamspace by slug
 * Returns teamspace and user's membership record
 */
async function resolveTeamspace(
  userId: string,
  teamspaceSlug: string
): Promise<{ teamspace: Teamspace; membership: TeamspaceUser } | null> {
  // Query teamspace and user membership in a single query
  const result = await db
    .select({
      teamspace: teamspaces,
      membership: teamspaceUsers,
    })
    .from(teamspaceUsers)
    .innerJoin(teamspaces, eq(teamspaceUsers.teamspaceId, teamspaces.id))
    .where(
      and(eq(teamspaces.slug, teamspaceSlug), eq(teamspaceUsers.userId, userId))
    )
    .limit(1);

  const firstResult = result[0];
  if (!firstResult) {
    return null;
  }

  return {
    teamspace: firstResult.teamspace,
    membership: firstResult.membership,
  };
}

/**
 * Teamspace middleware - ensures user has access to teamspace
 *
 * This middleware:
 * 1. Extracts teamspaceSlug from procedure input
 * 2. Resolves the teamspace by slug
 * 3. Verifies the user is a member of the teamspace
 * 4. Adds teamspace context and scoped repository to the context
 *
 * SECURITY: Returns NOT_FOUND instead of FORBIDDEN to prevent teamspace enumeration
 *
 * @example
 * ```typescript
 * // In a router:
 * export const myRouter = createTRPCRouter({
 *   getData: protectedProcedure
 *     .use(teamspaceMiddleware)
 *     .input(z.object({ teamspaceSlug: z.string() }))
 *     .query(async ({ ctx }) => {
 *       // ctx.teamspace, ctx.teamspaceRole, ctx.teamspaceRepository available
 *     }),
 * });
 * ```
 */
export const teamspaceMiddleware = middleware(async ({ ctx, next, input }) => {
  // Require authenticated user
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  // Extract teamspaceSlug from input
  // Input must be validated by the procedure to include teamspaceSlug
  const inputSchema = z.object({
    teamspaceSlug: z.string().min(1),
  });

  const parseResult = inputSchema.safeParse(input);
  if (!parseResult.success) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid input: teamspaceSlug is required',
      cause: parseResult.error,
    });
  }

  const { teamspaceSlug } = parseResult.data;

  // Resolve teamspace and verify membership
  const resolved = await resolveTeamspace(ctx.user.id, teamspaceSlug);

  if (!resolved) {
    // Return NOT_FOUND instead of FORBIDDEN to prevent enumeration attacks
    // This is intentional security measure per ADR-017
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Teamspace not found',
    });
  }

  const { teamspace, membership } = resolved;

  // Create teamspace-scoped repository
  const teamspaceRepository = createTeamspaceRepository(db, teamspace.id);

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
      teamspace,
      teamspaceUser: membership,
      teamspaceRole: membership.role,
      teamspaceRepository,
    },
  });
});

/**
 * Role-based middleware factory for teamspace roles
 *
 * Creates middleware that requires a specific minimum teamspace role.
 * Role hierarchy: owner > admin > editor > viewer
 *
 * @param minimumRole - The minimum role required
 */
export function requireTeamspaceRole(minimumRole: TeamspaceRole) {
  const roleHierarchy: Record<TeamspaceRole, number> = {
    viewer: 1,
    editor: 2,
    admin: 3,
    owner: 4,
  };

  return middleware(async ({ ctx, next }) => {
    // This middleware should be used after teamspaceMiddleware
    // so ctx should have teamspaceRole
    const role = (ctx as { teamspaceRole?: TeamspaceRole }).teamspaceRole;

    if (!role) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Role check failed: teamspace context not available',
      });
    }

    const userLevel = roleHierarchy[role];
    const requiredLevel = roleHierarchy[minimumRole];

    if (userLevel === undefined || requiredLevel === undefined) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Invalid role configuration',
      });
    }

    if (userLevel < requiredLevel) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `This action requires ${minimumRole} role or higher in the teamspace`,
      });
    }

    return next();
  });
}

/**
 * Middleware that requires teamspace owner role
 */
export const requireTeamspaceOwner = requireTeamspaceRole('owner');

/**
 * Middleware that requires teamspace admin role or higher
 */
export const requireTeamspaceAdmin = requireTeamspaceRole('admin');

/**
 * Middleware that requires teamspace editor role or higher
 */
export const requireTeamspaceEditor = requireTeamspaceRole('editor');
