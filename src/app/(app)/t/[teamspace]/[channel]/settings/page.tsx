import { redirect } from 'next/navigation';
import { validateRequest } from '@/lib/auth/workspace';
import styles from './page.module.scss';

/**
 * Channel Settings Page
 *
 * Handles channel-level settings including:
 * - Channel name and description
 * - Channel visibility and access
 * - Danger zone (delete channel)
 *
 * Note: This is a placeholder during the migration phase.
 * Full settings functionality will be implemented in Phase 5-6.
 */

interface SettingsPageProps {
  params: Promise<{ teamspace: string; channel: string }>;
}

export default async function ChannelSettingsPage({
  params,
}: SettingsPageProps) {
  // Await params (Next.js 15 requirement)
  const { channel } = await params;

  // Validate authentication
  const { user } = await validateRequest();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Channel Settings</h1>
      <p className={styles.channelInfo}>
        Channel: <span className={styles.channelName}>{channel}</span>
      </p>
      <div className={styles.infoCard}>
        <h2 className={styles.infoHeading}>Coming Soon</h2>
        <p className={styles.infoText}>Channel settings will include:</p>
        <ul className={styles.featureList}>
          <li>Channel name and description</li>
          <li>Default video settings</li>
          <li>Category management</li>
          <li>Export and backup options</li>
          <li>Danger zone (archive/delete channel)</li>
        </ul>
        <p className={styles.footnote}>
          This functionality will be implemented in Phase 5-6 of the account
          management system.
        </p>
      </div>
    </div>
  );
}
