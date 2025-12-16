/**
 * Project tRPC Router
 *
 * Handles project operations within teamspaces.
 * Projects are the new name for what were previously called "workspaces".
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
// eslint-disable-next-line no-restricted-imports -- Project operations require direct queries for access validation
import { eq, and } from 'drizzle-orm';
import { router, protectedProcedure } from '../procedures';
import {
  projects,
  projectUsers,
  teamspaces,
  teamspaceUsers,
} from '@/server/db/schema';
import type { ProjectRole, TeamspaceRole } from '@/server/db/schema';
import { serverEnv } from '@/lib/env';
import { generateSlug, generateUniqueSlug } from '@/lib/utils/slug';

/**
 * Map TeamspaceRole to ProjectRole
 *
 * TeamspaceRole has 'admin' which doesn't exist in ProjectRole.
 * This function provides explicit, type-safe mapping.
 */
function mapTeamspaceRoleToProjectRole(
  teamspaceRole: TeamspaceRole
): ProjectRole {
  switch (teamspaceRole) {
    case 'owner':
      return 'owner';
    case 'admin':
      return 'owner'; // Admins get owner-level project access
    case 'editor':
      return 'editor';
    case 'viewer':
      return 'viewer';
  }
}

/**
 * Calculate effective project role based on teamspace role and project membership
 *
 * Logic per ADR-017:
 * 1. Teamspace admins/owners always have 'owner' access to all projects
 * 2. If user has project membership with role_override, use that
 * 3. If user has project membership without role_override, use mapped teamspace role
 * 4. If user has no project membership, deny access (unless teamspace admin/owner)
 */
function calculateEffectiveRole(
  teamspaceRole: TeamspaceRole,
  projectRole: ProjectRole | null,
  roleOverride: ProjectRole | null
): ProjectRole | null {
  // Teamspace admins and owners always have owner access to all projects
  if (teamspaceRole === 'admin' || teamspaceRole === 'owner') {
    return 'owner';
  }

  // User must have explicit project membership
  if (!projectRole) {
    return null; // Access denied
  }

  // Use role override if set, otherwise map teamspace role to project role
  return roleOverride ?? mapTeamspaceRoleToProjectRole(teamspaceRole);
}

/**
 * Project router
 */
export const projectRouter = router({
  /**
   * List all projects in a teamspace that the current user has access to
   * Requires authentication and teamspace membership
   */
  listInTeamspace: protectedProcedure
    .input(z.object({ teamspaceSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      // First, verify user has access to the teamspace
      const teamspaceAccess = await ctx.db
        .select({
          teamspaceId: teamspaces.id,
          teamspaceRole: teamspaceUsers.role,
        })
        .from(teamspaceUsers)
        .innerJoin(teamspaces, eq(teamspaceUsers.teamspaceId, teamspaces.id))
        .where(
          and(
            eq(teamspaces.slug, input.teamspaceSlug),
            eq(teamspaceUsers.userId, ctx.user.id)
          )
        )
        .limit(1);

      const firstAccess = teamspaceAccess[0];
      if (!firstAccess) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Teamspace not found',
        });
      }

      const { teamspaceId, teamspaceRole } = firstAccess;

      // If user is teamspace admin/owner, they can see all projects
      if (teamspaceRole === 'admin' || teamspaceRole === 'owner') {
        const allProjects = await ctx.db
          .select({
            id: projects.id,
            name: projects.name,
            slug: projects.slug,
            teamspaceId: projects.teamspaceId,
            mode: projects.mode,
            createdAt: projects.createdAt,
          })
          .from(projects)
          .where(eq(projects.teamspaceId, teamspaceId))
          .orderBy(projects.createdAt);

        return allProjects.map((project) => ({
          ...project,
          role: 'owner' as ProjectRole, // Admins/owners have owner access to all projects
        }));
      }

      // Otherwise, only show projects they're explicitly members of
      const userProjects = await ctx.db
        .select({
          id: projects.id,
          name: projects.name,
          slug: projects.slug,
          teamspaceId: projects.teamspaceId,
          mode: projects.mode,
          createdAt: projects.createdAt,
          projectRole: projectUsers.role,
          roleOverride: projectUsers.roleOverride,
        })
        .from(projectUsers)
        .innerJoin(projects, eq(projectUsers.projectId, projects.id))
        .where(
          and(
            eq(projects.teamspaceId, teamspaceId),
            eq(projectUsers.userId, ctx.user.id)
          )
        )
        .orderBy(projects.createdAt);

      return userProjects.map((project) => {
        const effectiveRole = calculateEffectiveRole(
          teamspaceRole,
          project.projectRole,
          project.roleOverride
        );

        // This should never be null for users with explicit project membership
        // but TypeScript requires the check
        if (!effectiveRole) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to calculate effective role',
          });
        }

        return {
          id: project.id,
          name: project.name,
          slug: project.slug,
          teamspaceId: project.teamspaceId,
          mode: project.mode,
          createdAt: project.createdAt,
          role: effectiveRole,
        };
      });
    }),

  /**
   * Get a specific project by slug within a teamspace
   * Verifies user has access to both the teamspace and the project
   * Returns the effective role (with teamspace role and overrides applied)
   */
  getBySlug: protectedProcedure
    .input(
      z.object({
        teamspaceSlug: z.string(),
        projectSlug: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // First, verify user has access to the teamspace
      const teamspaceAccess = await ctx.db
        .select({
          teamspaceId: teamspaces.id,
          teamspaceRole: teamspaceUsers.role,
        })
        .from(teamspaceUsers)
        .innerJoin(teamspaces, eq(teamspaceUsers.teamspaceId, teamspaces.id))
        .where(
          and(
            eq(teamspaces.slug, input.teamspaceSlug),
            eq(teamspaceUsers.userId, ctx.user.id)
          )
        )
        .limit(1);

      const firstAccess = teamspaceAccess[0];
      if (!firstAccess) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Teamspace not found',
        });
      }

      const { teamspaceId, teamspaceRole } = firstAccess;

      // Get the project within the teamspace
      const projectResult = await ctx.db
        .select({
          id: projects.id,
          name: projects.name,
          slug: projects.slug,
          teamspaceId: projects.teamspaceId,
          mode: projects.mode,
          createdAt: projects.createdAt,
        })
        .from(projects)
        .where(
          and(
            eq(projects.teamspaceId, teamspaceId),
            eq(projects.slug, input.projectSlug)
          )
        )
        .limit(1);

      const project = projectResult[0];
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // If user is teamspace admin/owner, they have automatic access
      if (teamspaceRole === 'admin' || teamspaceRole === 'owner') {
        return {
          ...project,
          role: 'owner' as ProjectRole,
        };
      }

      // Check if user has explicit project membership
      const membershipResult = await ctx.db
        .select({
          role: projectUsers.role,
          roleOverride: projectUsers.roleOverride,
        })
        .from(projectUsers)
        .where(
          and(
            eq(projectUsers.projectId, project.id),
            eq(projectUsers.userId, ctx.user.id)
          )
        )
        .limit(1);

      const membership = membershipResult[0];

      if (!membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const effectiveRole = calculateEffectiveRole(
        teamspaceRole,
        membership.role,
        membership.roleOverride
      );

      if (!effectiveRole) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      return {
        ...project,
        role: effectiveRole,
      };
    }),

  /**
   * Get a specific project by slug (simple version for single-tenant mode)
   * Verifies user has access to the project
   * Does not require teamspace context
   */
  getBySlugSimple: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select({
          id: projects.id,
          name: projects.name,
          slug: projects.slug,
          mode: projects.mode,
          role: projectUsers.role,
        })
        .from(projectUsers)
        .innerJoin(projects, eq(projectUsers.projectId, projects.id))
        .where(
          and(
            eq(projects.slug, input.slug),
            eq(projectUsers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (result.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      return result[0];
    }),

  /**
   * List all projects the current user has access to (for single-tenant mode)
   * Requires authentication
   * Merged from workspace router
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const userProjects = await ctx.db
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        role: projectUsers.role,
        joinedAt: projectUsers.createdAt,
      })
      .from(projectUsers)
      .innerJoin(projects, eq(projectUsers.projectId, projects.id))
      .where(eq(projectUsers.userId, ctx.user.id))
      .orderBy(projectUsers.createdAt);

    return userProjects;
  }),

  /**
   * Create a new project
   * Only available in multi-tenant mode
   * Merged from workspace router
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Project name is required').max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only allow project creation in multi-tenant mode
      if (serverEnv.MODE !== 'multi-tenant') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Project creation is only available in multi-tenant mode',
        });
      }

      // Generate slug from name using shared utility
      const baseSlug = generateSlug(input.name, 'my-project');

      // Check if slug is unique, append random suffix if not
      let slug = baseSlug;
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        const existingProject = await ctx.db
          .select({ id: projects.id })
          .from(projects)
          .where(eq(projects.slug, slug))
          .limit(1);

        if (existingProject.length === 0) {
          // Slug is unique
          break;
        }

        // Generate unique slug with random suffix
        slug = generateUniqueSlug(baseSlug);
        attempts++;
      }

      if (attempts === maxAttempts) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate unique project slug',
        });
      }

      // Create project and add user as owner in transaction
      const result = await ctx.db.transaction(async (tx) => {
        const [project] = await tx
          .insert(projects)
          .values({
            name: input.name,
            slug,
            mode: 'multi-tenant',
            teamspaceId: null, // TODO: Set from teamspace context when needed
          })
          .returning();

        if (!project) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create project',
          });
        }

        await tx.insert(projectUsers).values({
          projectId: project.id,
          userId: ctx.user.id,
          role: 'owner',
        });

        return project;
      });

      return {
        id: result.id,
        name: result.name,
        slug: result.slug,
      };
    }),
});

export type ProjectRouter = typeof projectRouter;
