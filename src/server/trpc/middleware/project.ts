/**
 * Project tRPC Middleware
 *
 * Ensures user has access to the requested project within a teamspace.
 * Calculates effective role based on teamspace role and project-specific overrides.
 *
 * IMPORTANT: This middleware must run AFTER teamspaceMiddleware.
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

import { TRPCError } from '@trpc/server';
import { eq, and } from 'drizzle-orm';
import { middleware } from '../trpc';
import { db } from '@/server/db';
import { projects, projectUsers } from '@/server/db/schema';
import type {
  Project,
  ProjectUser,
  ProjectRole,
  TeamspaceRole,
} from '@/server/db/schema';
import {
  createProjectRepository,
  type ProjectRepository,
} from '@/server/repositories';
import type { TeamspaceContext } from './teamspace';
import { z } from 'zod';

/**
 * Extended context with project information
 * Includes teamspace context from teamspaceMiddleware
 */
export interface ProjectContext extends TeamspaceContext {
  project: Project;
  projectUser: ProjectUser | null; // null if teamspace admin accessing project
  projectRole: ProjectRole; // Effective role (with overrides applied)
  projectRepository: ProjectRepository;
}

/**
 * Resolve project by teamspace ID and slug
 * Returns project and user's project membership record (if exists)
 */
async function resolveProject(
  userId: string,
  teamspaceId: string,
  projectSlug: string
): Promise<{
  project: Project;
  membership: ProjectUser | null;
} | null> {
  // First, get the project within the teamspace
  const projectResult = await db
    .select()
    .from(projects)
    .where(
      and(eq(projects.teamspaceId, teamspaceId), eq(projects.slug, projectSlug))
    )
    .limit(1);

  const project = projectResult[0];
  if (!project) {
    return null;
  }

  // Then check if user has direct project membership
  const membershipResult = await db
    .select()
    .from(projectUsers)
    .where(
      and(
        eq(projectUsers.projectId, project.id),
        eq(projectUsers.userId, userId)
      )
    )
    .limit(1);

  const membership = membershipResult[0] ?? null;

  return {
    project,
    membership,
  };
}

/**
 * Calculate effective project role
 *
 * Logic per ADR-017:
 * 1. Teamspace admins always have 'owner' access to all projects (prevent lockout)
 * 2. If user has project membership with role_override, use that
 * 3. If user has project membership without role_override, use teamspace role
 * 4. If user has no project membership, deny access (unless teamspace admin)
 *
 * @param teamspaceRole - User's role in the teamspace
 * @param projectMembership - User's project membership record (if exists)
 * @returns Effective role in the project
 */
function calculateEffectiveRole(
  teamspaceRole: TeamspaceRole,
  projectMembership: ProjectUser | null
): ProjectRole | null {
  // Teamspace admins and owners always have owner access to all projects
  if (teamspaceRole === 'admin' || teamspaceRole === 'owner') {
    return 'owner';
  }

  // User must have explicit project membership
  if (!projectMembership) {
    return null; // Access denied
  }

  // Use role override if set, otherwise use teamspace role
  // Note: teamspaceRole is already a valid ProjectRole (owner/editor/viewer)
  return projectMembership.roleOverride ?? (teamspaceRole as ProjectRole);
}

/**
 * Project middleware - ensures user has access to project within teamspace
 *
 * This middleware:
 * 1. Requires teamspaceMiddleware to have run first (needs teamspace context)
 * 2. Extracts projectSlug from procedure input
 * 3. Resolves the project by (teamspaceId, slug)
 * 4. Verifies user has access (direct membership OR teamspace admin)
 * 5. Calculates effective role with overrides
 * 6. Adds project context and scoped repository to the context
 *
 * SECURITY: Returns NOT_FOUND instead of FORBIDDEN to prevent project enumeration
 *
 * @example
 * ```typescript
 * // In a router:
 * export const myRouter = createTRPCRouter({
 *   getData: protectedProcedure
 *     .use(teamspaceMiddleware)
 *     .use(projectMiddleware)
 *     .input(z.object({
 *       teamspaceSlug: z.string(),
 *       projectSlug: z.string()
 *     }))
 *     .query(async ({ ctx }) => {
 *       // ctx.project, ctx.projectRole, ctx.projectRepository available
 *     }),
 * });
 * ```
 */
export const projectMiddleware = middleware(async ({ ctx, next, input }) => {
  // Verify teamspace context exists (teamspaceMiddleware must run first)
  const teamspaceCtx = ctx as Partial<TeamspaceContext>;
  if (
    !teamspaceCtx.teamspace ||
    !teamspaceCtx.teamspaceRole ||
    !teamspaceCtx.teamspaceUser
  ) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message:
        'Project middleware requires teamspace context. Use teamspaceMiddleware first.',
    });
  }

  // Require authenticated user (should already be guaranteed by teamspaceMiddleware)
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  // Extract projectSlug from input
  const inputSchema = z.object({
    projectSlug: z.string().min(1),
  });

  const parseResult = inputSchema.safeParse(input);
  if (!parseResult.success) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid input: projectSlug is required',
      cause: parseResult.error,
    });
  }

  const { projectSlug } = parseResult.data;

  // Resolve project within the teamspace
  const resolved = await resolveProject(
    ctx.user.id,
    teamspaceCtx.teamspace.id,
    projectSlug
  );

  if (!resolved) {
    // Return NOT_FOUND instead of FORBIDDEN to prevent enumeration attacks
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Project not found',
    });
  }

  const { project, membership } = resolved;

  // Calculate effective role
  const effectiveRole = calculateEffectiveRole(
    teamspaceCtx.teamspaceRole,
    membership
  );

  if (!effectiveRole) {
    // User doesn't have access to this project
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have access to this project',
    });
  }

  // Create project-scoped repository
  const projectRepository = createProjectRepository(db, project.id);

  return next({
    ctx: {
      ...ctx,
      ...teamspaceCtx,
      session: ctx.session,
      user: ctx.user,
      project,
      projectUser: membership,
      projectRole: effectiveRole,
      projectRepository,
      // Keep legacy workspace aliases for backward compatibility during transition
      workspace: project,
      workspaceUser: membership,
      workspaceRole: effectiveRole,
      repository: projectRepository,
    },
  });
});

/**
 * Role-based middleware factory for project roles
 *
 * Creates middleware that requires a specific minimum project role.
 * Role hierarchy: owner > editor > viewer
 *
 * @param minimumRole - The minimum role required
 */
export function requireProjectRole(minimumRole: ProjectRole) {
  const roleHierarchy: Record<ProjectRole, number> = {
    viewer: 1,
    editor: 2,
    owner: 3,
  };

  return middleware(async ({ ctx, next }) => {
    // This middleware should be used after projectMiddleware
    // so ctx should have projectRole
    const role = (ctx as { projectRole?: ProjectRole }).projectRole;

    if (!role) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Role check failed: project context not available',
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
        message: `This action requires ${minimumRole} role or higher in the project`,
      });
    }

    return next();
  });
}

/**
 * Middleware that requires project owner role
 */
export const requireProjectOwner = requireProjectRole('owner');

/**
 * Middleware that requires project editor role or higher
 */
export const requireProjectEditor = requireProjectRole('editor');
