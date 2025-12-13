import { redirect } from 'next/navigation';
import { validateRequest, validateWorkspaceAccess } from '@/lib/auth/workspace';
import { AppShell } from '@/components/layout/app-shell';

/**
 * Workspace Layout
 *
 * This layout wraps all workspace-scoped pages.
 * It validates the user's access to the workspace and provides the app shell.
 */

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  params: { slug: string };
}

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  // Validate authentication
  const { user } = await validateRequest();
  if (!user) {
    redirect('/login');
  }

  // Validate workspace access
  const workspaceAccess = await validateWorkspaceAccess(user.id, params.slug);
  if (!workspaceAccess) {
    redirect('/login');
  }

  return <AppShell workspaceSlug={params.slug}>{children}</AppShell>;
}
