/**
 * Authentication and Access Validation
 *
 * Provides helper functions for validating user sessions and project access.
 * Used by layouts and middleware that need to check project membership.
 *
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 * @see /docs/adrs/007-api-and-auth.md
 */

import { cookies } from 'next/headers';
import { db } from '@/server/db';
import { projects, projectUsers } from '@/server/db/schema';
import type { Project, ProjectUser } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { validateSessionToken } from './session';

/**
 * Result of project access validation
 */
export interface ProjectAccessResult {
  project: Project;
  membership: ProjectUser;
}

/**
 * Result of user session validation
 */
export interface UserValidationResult {
  user: {
    id: string;
    email: string;
    name: string | null;
  } | null;
}

/**
 * Validates the current request and returns the authenticated user
 *
 * @returns The authenticated user or null if not authenticated
 */
export async function validateRequest(): Promise<UserValidationResult> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value ?? null;

  if (!sessionToken) {
    return { user: null };
  }

  const { user } = await validateSessionToken(sessionToken);
  return { user };
}

/**
 * Validates user access to a project by slug
 *
 * Checks that:
 * 1. The project exists
 * 2. The user is a member of the project
 *
 * @param userId - The authenticated user's ID
 * @param projectSlug - The project slug to validate access for
 * @returns Project and membership info if access is valid, null otherwise
 */
export async function validateProjectAccess(
  userId: string,
  projectSlug: string
): Promise<ProjectAccessResult | null> {
  const result = await db
    .select({
      project: projects,
      membership: projectUsers,
    })
    .from(projectUsers)
    .innerJoin(projects, eq(projectUsers.projectId, projects.id))
    .where(and(eq(projects.slug, projectSlug), eq(projectUsers.userId, userId)))
    .limit(1);

  const firstResult = result[0];
  if (!firstResult) {
    return null;
  }

  return {
    project: firstResult.project,
    membership: firstResult.membership,
  };
}

// Re-export for backwards compatibility during migration
// TODO: Remove these aliases after all references are updated
export {
  validateProjectAccess as validateWorkspaceAccess,
  type ProjectAccessResult as WorkspaceAccessResult,
};
