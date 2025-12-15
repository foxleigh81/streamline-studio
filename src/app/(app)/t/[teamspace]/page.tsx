import { redirect } from 'next/navigation';
import { validateRequest } from '@/lib/auth/workspace';
import { db } from '@/server/db';
import { projectUsers, projects } from '@/server/db/schema';
// eslint-disable-next-line no-restricted-imports -- Landing page needs cross-project query to find user's accessible projects
import { eq } from 'drizzle-orm';

/**
 * Teamspace Landing Page
 *
 * This page handles routing to the appropriate project within a teamspace.
 * During the migration phase, it redirects to the first available project.
 *
 * Future enhancements:
 * - Show project picker UI if multiple projects exist
 * - Remember user's last accessed project
 * - Allow creating new projects within the teamspace
 */

interface TeamspacePageProps {
  params: { teamspace: string };
}

export default async function TeamspacePage({ params }: TeamspacePageProps) {
  // Validate authentication
  const { user } = await validateRequest();
  if (!user) {
    redirect('/login');
  }

  // For now, redirect to the first project the user has access to
  // Query through projectUsers table to find user's projects
  const userProjectMemberships = await db
    .select({
      projectId: projectUsers.projectId,
      projectSlug: projects.slug,
    })
    .from(projectUsers)
    .innerJoin(projects, eq(projectUsers.projectId, projects.id))
    .where(eq(projectUsers.userId, user.id))
    .limit(1);

  if (userProjectMemberships.length === 0) {
    // No projects found, redirect to setup
    redirect('/setup');
  }

  // Redirect to the first project
  const firstProject = userProjectMemberships[0];
  if (!firstProject) {
    redirect('/setup');
  }
  redirect(`/t/${params.teamspace}/${firstProject.projectSlug}/videos`);
}
