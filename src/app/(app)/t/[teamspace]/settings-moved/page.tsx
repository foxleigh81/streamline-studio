import { redirect } from 'next/navigation';
import Link from 'next/link';
import { validateRequest } from '@/lib/auth/workspace';
import { Info } from 'lucide-react';
import styles from './page.module.scss';

/**
 * Settings Moved Notice Page
 *
 * Informs users that account settings and preferences have been moved
 * to modals accessible from the user menu in the sidebar.
 */

interface SettingsMovedPageProps {
  params: Promise<{ teamspace: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function SettingsMovedPage({
  params,
  searchParams,
}: SettingsMovedPageProps) {
  // Validate authentication
  const { user } = await validateRequest();
  if (!user) {
    redirect('/login');
  }

  const { teamspace } = await params;
  const { from } = await searchParams;

  const settingType =
    from === 'preferences' ? 'Preferences' : 'Account Settings';

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <Info className={styles.icon} aria-hidden="true" />
        </div>

        <h1 className={styles.heading}>Settings Have Moved</h1>

        <p className={styles.description}>
          {settingType} can now be accessed from the user menu at the bottom of
          the sidebar. This allows you to manage your settings without leaving
          your current page.
        </p>

        <div className={styles.steps}>
          <h2 className={styles.stepsHeading}>How to access your settings:</h2>
          <ol className={styles.stepsList}>
            <li>Look for your user avatar at the bottom-left of the sidebar</li>
            <li>Click on it to open the user menu</li>
            <li>Select &ldquo;{settingType}&rdquo; from the menu</li>
            <li>Make your changes in the modal that appears</li>
          </ol>
        </div>

        <div className={styles.actions}>
          <Link href={`/t/${teamspace}`} className={styles.backLink}>
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
