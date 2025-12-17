import { redirect } from 'next/navigation';
import { validateRequest } from '@/lib/auth/validate';
import { TeamspaceProvider } from '@/lib/teamspace';
import { AppShell } from '@/components/layout/app-shell';

/**
 * Teamspace Layout
 *
 * This layout wraps all teamspace-scoped routes to provide:
 * 1. TeamspaceProvider for teamspace context
 * 2. AppShell for consistent sidebar navigation
 *
 * Route: /t/[teamspace]/* (e.g., /t/workspace/my-project/videos)
 *
 * The AppShell derives channel context from the URL automatically:
 * - /t/[teamspace]/settings/* -> No channel context
 * - /t/[teamspace]/[channel]/* -> Channel context from URL
 *
 * In both single-tenant and multi-tenant modes, all routes use the teamspace structure:
 * - Single-tenant: Uses reserved "workspace" teamspace
 * - Multi-tenant: Uses user-created teamspaces
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

  // TeamspaceProvider handles teamspace context
  // AppShell provides consistent sidebar across all routes
  // AppShell derives channel from URL pathname automatically
  return (
    <TeamspaceProvider>
      <AppShell>{children}</AppShell>
    </TeamspaceProvider>
  );
}
