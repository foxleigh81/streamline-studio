import { redirect } from 'next/navigation';
import { validateRequest } from '@/lib/auth/workspace';

/**
 * Preferences Page - Deprecated
 *
 * Preferences have been moved to a modal accessible from the user menu
 * in the sidebar. This page redirects to a notice page.
 *
 * @deprecated Use UserMenu > Preferences modal instead
 */

interface PreferencesPageProps {
  params: Promise<{ teamspace: string }>;
}

export default async function PreferencesPage({
  params,
}: PreferencesPageProps) {
  // Validate authentication
  const { user } = await validateRequest();
  if (!user) {
    redirect('/login');
  }

  const { teamspace } = await params;

  // Redirect to a notice page that explains where settings have moved
  redirect(`/t/${teamspace}/settings-moved?from=preferences`);
}
