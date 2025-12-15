import { redirect } from 'next/navigation';

/**
 * Legacy Workspace Route Redirect
 *
 * This page provides backward compatibility for old workspace URLs.
 * It redirects from /w/[slug] to /t/default/[slug]
 *
 * During the migration phase, all workspaces are mapped to the 'default' teamspace.
 * This ensures existing links and bookmarks continue to work.
 */

interface LegacyWorkspacePageProps {
  params: { slug: string };
}

export default function LegacyWorkspacePage({
  params,
}: LegacyWorkspacePageProps) {
  // Redirect to the new teamspace/project structure
  // Using 'default' as the teamspace for all legacy routes
  redirect(`/t/default/${params.slug}/videos`);
}
