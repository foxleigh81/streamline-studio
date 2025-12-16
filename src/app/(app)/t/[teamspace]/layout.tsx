import { redirect } from 'next/navigation';
import { validateRequest } from '@/lib/auth/validate';
import { TeamspaceProvider } from '@/lib/teamspace';

/**
 * Teamspace Layout
 *
 * This layout wraps all teamspace-scoped routes to provide teamspace context.
 * It validates the user's authentication and provides the TeamspaceProvider.
 *
 * Route: /t/[teamspace]/* (e.g., /t/workspace/my-project/videos)
 *
 * In both single-tenant and multi-tenant modes, all routes use the teamspace structure:
 * - Single-tenant: Uses reserved "workspace" teamspace
 * - Multi-tenant: Uses user-created teamspaces
 *
 * Nested [project] layout handles project-specific logic and provides AppShell.
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 */

interface TeamspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<{ teamspace: string }>;
}

export default async function TeamspaceLayout({
  children,
}: TeamspaceLayoutProps) {
  // Validate authentication
  const { user } = await validateRequest();
  if (!user) {
    redirect('/login');
  }

  // TeamspaceProvider will handle teamspace validation and provide context
  // Nested [project] layout will handle project-specific validation
  return <TeamspaceProvider>{children}</TeamspaceProvider>;
}
