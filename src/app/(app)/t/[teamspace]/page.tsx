import { redirect } from 'next/navigation';
import { validateRequest } from '@/lib/auth/workspace';
import { db } from '@/server/db';
import {
  projectUsers,
  projects,
  teamspaces,
  teamspaceUsers,
} from '@/server/db/schema';
// eslint-disable-next-line no-restricted-imports -- Landing page needs cross-project query to find user's accessible projects
import { eq, and, desc } from 'drizzle-orm';
import { TeamspaceDashboard } from './teamspace-dashboard';

/**
 * Teamspace Landing Page
 *
 * Shows a dashboard with all projects within the teamspace.
 * Works for both single-tenant and multi-tenant modes.
 *
 * Route: /t/[teamspace] (e.g., /t/workspace or /t/my-team)
 */

interface TeamspacePageProps {
  params: Promise<{ teamspace: string }>;
}

export default async function TeamspacePage({ params }: TeamspacePageProps) {
  // Await params (Next.js 15 requirement)
  const { teamspace: teamspaceSlug } = await params;

  // Validate authentication
  const { user } = await validateRequest();
  if (!user) {
    redirect('/login');
  }

  // First, get the teamspace by slug
  const teamspaceResult = await db
    .select({
      id: teamspaces.id,
      name: teamspaces.name,
    })
    .from(teamspaces)
    .where(eq(teamspaces.slug, teamspaceSlug))
    .limit(1);

  if (teamspaceResult.length === 0) {
    // Teamspace not found, redirect to setup
    redirect('/setup');
  }

  const teamspace = teamspaceResult[0];
  if (!teamspace) {
    redirect('/setup');
  }

  // Get user's teamspace role to determine if they can create projects
  const teamspaceUserResult = await db
    .select({ role: teamspaceUsers.role })
    .from(teamspaceUsers)
    .where(
      and(
        eq(teamspaceUsers.teamspaceId, teamspace.id),
        eq(teamspaceUsers.userId, user.id)
      )
    )
    .limit(1);

  const teamspaceRole = teamspaceUserResult[0]?.role ?? null;
  const canCreateProject =
    teamspaceRole === 'admin' || teamspaceRole === 'owner';

  // Find all accessible projects within this teamspace
  const userProjectMemberships = await db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      role: projectUsers.role,
      updatedAt: projects.updatedAt,
    })
    .from(projectUsers)
    .innerJoin(projects, eq(projectUsers.projectId, projects.id))
    .where(
      and(
        eq(projectUsers.userId, user.id),
        eq(projects.teamspaceId, teamspace.id)
      )
    )
    .orderBy(desc(projects.updatedAt));

  // Convert database dates to JavaScript Date objects
  const projectsWithDates = userProjectMemberships.map((project) => ({
    ...project,
    updatedAt: new Date(project.updatedAt),
  }));

  return (
    <TeamspaceDashboard
      teamspaceSlug={teamspaceSlug}
      teamspaceName={teamspace.name}
      projects={projectsWithDates}
      canCreateProject={canCreateProject}
    />
  );
}
