import { redirect } from 'next/navigation';
import { validateRequest } from '@/lib/auth/workspace';
import { SettingsNav } from './settings-nav';
import styles from './layout.module.scss';

/**
 * Settings Layout Component
 *
 * Provides a consistent layout for all settings pages with sidebar navigation.
 * Includes navigation between different settings sections:
 * - Account: User profile and authentication settings
 * - Preferences: Personal preferences and customizations
 *
 * The sidebar is responsive and collapses on mobile devices.
 */

interface SettingsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ teamspace: string }>;
}

export default async function SettingsLayout({
  children,
  params,
}: SettingsLayoutProps) {
  // Await params (Next.js 15 requirement)
  const { teamspace } = await params;

  // Validate authentication
  const { user } = await validateRequest();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar} aria-label="Settings navigation">
        <SettingsNav teamspace={teamspace} />
      </aside>

      <main className={styles.main} role="main">
        {children}
      </main>
    </div>
  );
}
