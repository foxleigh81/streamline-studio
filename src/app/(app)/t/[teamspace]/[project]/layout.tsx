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
 * Route: /t/[teamspace]/[project]/* (e.g., /t/workspace/my-project/videos)
 *
 * Works for both single-tenant and multi-tenant modes:
 * - Single-tenant: teamspace = "workspace" (reserved)
 * - Multi-tenant: teamspace = user-created teamspace
 *
 * Note: During migration, project slugs map to workspace slugs in the database.
 * The teamspace/project hierarchy is being implemented through context providers.
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ teamspace: string; project: string }>;
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  // Await params (Next.js 15 requirement)
  const { teamspace, project } = await params;

  // Validate authentication
  const { user } = await validateRequest();
  if (!user) {
    redirect('/login');
  }

  // Validate project access (using project slug as workspace slug for now)
  const workspaceAccess = await validateWorkspaceAccess(user.id, project);
  if (!workspaceAccess) {
    redirect('/access-denied');
  }

  // Wrap children with ProjectProvider for client-side context
  // The provider will fetch project data based on the route parameters
  // Note: ProjectProvider must be inside TeamspaceProvider (from parent layout)
  return (
    <ProjectProvider>
      <AppShell projectSlug={project} teamspaceSlug={teamspace}>
        {children}
      </AppShell>
    </ProjectProvider>
  );
}
