import { redirect } from 'next/navigation';
import { validateRequest } from '@/lib/auth/workspace';
import styles from './page.module.scss';

/**
 * Teamspace Settings Page
 *
 * This page will handle teamspace-level settings including:
 * - Team member management across all projects
 * - Billing and subscription management
 * - Teamspace-level preferences
 *
 * Note: This is a placeholder during the migration phase.
 * Full teamspace settings functionality will be implemented in Phase 5-6.
 */

interface TeamspaceSettingsPageProps {
  params: { teamspace: string };
}

export default async function TeamspaceSettingsPage({
  params,
}: TeamspaceSettingsPageProps) {
  // Validate authentication
  const { user } = await validateRequest();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Teamspace Settings</h1>
      <p className={styles.teamspaceInfo}>
        Teamspace:{' '}
        <span className={styles.teamspaceName}>{params.teamspace}</span>
      </p>
      <div className={styles.infoCard}>
        <h2 className={styles.infoHeading}>Coming Soon</h2>
        <p className={styles.infoText}>Teamspace settings will include:</p>
        <ul className={styles.featureList}>
          <li>Team member management across all projects</li>
          <li>Billing and subscription management</li>
          <li>Teamspace-level preferences and branding</li>
          <li>Access control and permissions</li>
        </ul>
        <p className={styles.footnote}>
          This functionality will be implemented in Phase 5-6 of the account
          management system.
        </p>
      </div>
    </div>
  );
}
