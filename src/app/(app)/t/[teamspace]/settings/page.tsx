import { redirect } from 'next/navigation';
import { validateRequest } from '@/lib/auth/workspace';

/**
 * Account Settings Page - Deprecated
 *
 * Account settings have been moved to a modal accessible from the user menu
 * in the sidebar. This page redirects to the user's default channel or first
 * available channel.
 *
 * @deprecated Use UserMenu > Account Settings modal instead
 */

interface SettingsPageProps {
  params: Promise<{ teamspace: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  // Validate authentication
  const { user } = await validateRequest();
  if (!user) {
    redirect('/login');
  }

  const { teamspace } = await params;

  // Redirect to a notice page that explains where settings have moved
  redirect(`/t/${teamspace}/settings-moved`);
}
