import { redirect } from 'next/navigation';
import { validateRequest, validateWorkspaceAccess } from '@/lib/auth/workspace';
import { ChannelProvider } from '@/lib/channel';

/**
 * Channel Layout
 *
 * This layout wraps all channel-scoped pages within a teamspace.
 * It validates the user's access to the channel and provides ChannelProvider.
 *
 * Route: /t/[teamspace]/[channel]/* (e.g., /t/workspace/my-channel/videos)
 *
 * Note: AppShell is provided by the parent teamspace layout for consistency.
 * This layout only adds channel-specific context (ChannelProvider).
 *
 * Works for both single-tenant and multi-tenant modes:
 * - Single-tenant: teamspace = "workspace" (reserved)
 * - Multi-tenant: teamspace = user-created teamspace
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

interface ChannelLayoutProps {
  children: React.ReactNode;
  params: Promise<{ teamspace: string; channel: string }>;
}

export default async function ChannelLayout({
  children,
  params,
}: ChannelLayoutProps) {
  // Await params (Next.js 15 requirement)
  const { channel } = await params;

  // Validate authentication
  const { user } = await validateRequest();
  if (!user) {
    redirect('/login');
  }

  // Validate channel access (using channel slug as workspace slug for now)
  const workspaceAccess = await validateWorkspaceAccess(user.id, channel);
  if (!workspaceAccess) {
    redirect('/access-denied');
  }

  // Wrap children with ChannelProvider for client-side context
  // AppShell is provided by the parent teamspace layout
  return <ChannelProvider>{children}</ChannelProvider>;
}
