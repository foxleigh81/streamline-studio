import { redirect } from 'next/navigation';
import { validateRequest } from '@/lib/auth/workspace';
import { db } from '@/server/db';
import { teamspaceUsers, teamspaces } from '@/server/db/schema';
// eslint-disable-next-line no-restricted-imports -- Landing page needs cross-teamspace query to find user's accessible teamspaces
import { eq } from 'drizzle-orm';

/**
 * Root Teamspace Route (/t)
 *
 * Multi-tenant mode: Redirects to first accessible teamspace
 * Single-tenant mode: Redirects to default 'workspace' teamspace
 *
 * Route: /t
 *
 * Future enhancements:
 * - Show teamspace picker UI if multiple teamspaces exist
 * - Remember user's last accessed teamspace
 * - Allow creating new teamspaces
 */

export default async function TeamspaceRootPage() {
  // Validate authentication
  const { user } = await validateRequest();
  if (!user) {
    redirect('/login');
  }

  // Find first accessible teamspace
  const userTeamspaceMemberships = await db
    .select({
      teamspaceId: teamspaceUsers.teamspaceId,
      teamspaceSlug: teamspaces.slug,
    })
    .from(teamspaceUsers)
    .innerJoin(teamspaces, eq(teamspaceUsers.teamspaceId, teamspaces.id))
    .where(eq(teamspaceUsers.userId, user.id))
    .orderBy(teamspaceUsers.joinedAt)
    .limit(1);

  if (userTeamspaceMemberships.length === 0) {
    // No teamspaces found, redirect to setup
    redirect('/setup');
  }

  const firstTeamspace = userTeamspaceMemberships[0];
  if (!firstTeamspace) {
    redirect('/setup');
  }

  // Redirect to first teamspace
  redirect(`/t/${firstTeamspace.teamspaceSlug}`);
}
