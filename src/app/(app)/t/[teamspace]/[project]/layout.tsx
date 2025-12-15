import { redirect } from 'next/navigation';
import { validateRequest, validateWorkspaceAccess } from '@/lib/auth/workspace';
import { AppShell } from '@/components/layout/app-shell';
import { ProjectProvider } from '@/lib/project';

/**
 * Project Layout
 *
 * This layout wraps all project-scoped pages within a teamspace.
 * It validates the user's access to the project and provides the app shell.
 *
 * Note: During migration, project slugs map to workspace slugs in the database.
 * The teamspace/project hierarchy is being implemented through context providers.
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: { teamspace: string; project: string };
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  // Validate authentication
  const { user } = await validateRequest();
  if (!user) {
    redirect('/login');
  }

  // Validate project access (using project slug as workspace slug for now)
  const workspaceAccess = await validateWorkspaceAccess(
    user.id,
    params.project
  );
  if (!workspaceAccess) {
    redirect('/access-denied');
  }

  // Wrap children with ProjectProvider for client-side context
  // The provider will fetch project data based on the route parameters
  // Note: ProjectProvider must be inside TeamspaceProvider (from parent layout)
  return (
    <ProjectProvider>
      <AppShell workspaceSlug={params.project}>{children}</AppShell>
    </ProjectProvider>
  );
}
