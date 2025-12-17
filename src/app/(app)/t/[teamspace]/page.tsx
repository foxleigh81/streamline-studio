import { redirect } from 'next/navigation';
import { validateRequest } from '@/lib/auth/workspace';
import { db } from '@/server/db';
import {
  channelUsers,
  channels,
  teamspaces,
  teamspaceUsers,
  userPreferences,
} from '@/server/db/schema';
// eslint-disable-next-line no-restricted-imports -- Landing page needs cross-channel query to find user's accessible channels
import { eq, and, desc } from 'drizzle-orm';
import { TeamspaceDashboard } from './teamspace-dashboard';

/**
 * Teamspace Landing Page
 *
 * Shows a dashboard with all channels within the teamspace.
 * Works for both single-tenant and multi-tenant modes.
 *
 * If user has set a default channel preference, redirects to that channel's
 * content-plan page instead of showing the dashboard.
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

  // Check if user has a default channel preference
  const [preferences] = await db
    .select({
      defaultChannelId: userPreferences.defaultChannelId,
    })
    .from(userPreferences)
    .where(eq(userPreferences.userId, user.id))
    .limit(1);

  // If user has a default channel set, try to redirect to it
  if (preferences?.defaultChannelId) {
    // Verify the user still has access to this channel and it belongs to this teamspace
    const [defaultChannel] = await db
      .select({
        slug: channels.slug,
        teamspaceId: channels.teamspaceId,
      })
      .from(channelUsers)
      .innerJoin(channels, eq(channelUsers.channelId, channels.id))
      .where(
        and(
          eq(channelUsers.userId, user.id),
          eq(channelUsers.channelId, preferences.defaultChannelId),
          eq(channels.teamspaceId, teamspace.id)
        )
      )
      .limit(1);

    // If channel is valid and belongs to this teamspace, redirect to content-plan
    if (defaultChannel) {
      redirect(`/t/${teamspaceSlug}/${defaultChannel.slug}/content-plan`);
    }
    // If channel is invalid (deleted, no access, or different teamspace), continue to dashboard
  }

  // Get user's teamspace role to determine if they can create channels
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
  const canCreateChannel =
    teamspaceRole === 'admin' || teamspaceRole === 'owner';

  // Find all accessible channels within this teamspace
  const userChannelMemberships = await db
    .select({
      id: channels.id,
      name: channels.name,
      slug: channels.slug,
      role: channelUsers.role,
      updatedAt: channels.updatedAt,
    })
    .from(channelUsers)
    .innerJoin(channels, eq(channelUsers.channelId, channels.id))
    .where(
      and(
        eq(channelUsers.userId, user.id),
        eq(channels.teamspaceId, teamspace.id)
      )
    )
    .orderBy(desc(channels.updatedAt));

  // Convert database dates to JavaScript Date objects
  const channelsWithDates = userChannelMemberships.map((channel) => ({
    ...channel,
    updatedAt: new Date(channel.updatedAt),
  }));

  return (
    <TeamspaceDashboard
      teamspaceSlug={teamspaceSlug}
      teamspaceName={teamspace.name}
      channels={channelsWithDates}
      canCreateChannel={canCreateChannel}
    />
  );
}
