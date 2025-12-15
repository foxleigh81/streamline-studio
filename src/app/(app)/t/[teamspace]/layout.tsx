import { redirect } from 'next/navigation';
import { validateRequest } from '@/lib/auth/workspace';
import { TeamspaceProvider } from '@/lib/teamspace';

/**
 * Teamspace Layout
 *
 * This layout wraps all teamspace-scoped pages.
 * It validates the user's authentication and provides context for the teamspace.
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 */

interface TeamspaceLayoutProps {
  children: React.ReactNode;
  params: { teamspace: string };
}

export default async function TeamspaceLayout({
  children,
  params: _params,
}: TeamspaceLayoutProps) {
  // Validate authentication
  const { user } = await validateRequest();
  if (!user) {
    redirect('/login');
  }

  // Wrap children with TeamspaceProvider for client-side context
  // The provider will fetch teamspace data based on the route parameter
  return <TeamspaceProvider>{children}</TeamspaceProvider>;
}
