import { redirect } from 'next/navigation';
import { validateRequest } from '@/lib/auth/workspace';
import styles from './page.module.scss';

/**
 * Account Settings Page
 *
 * Displays user account information and provides access to account management features:
 * - View user profile (name, email)
 * - Change password (coming soon)
 * - Account security settings (coming soon)
 * - Account deletion (coming soon)
 *
 * This is the main landing page for the settings section.
 */

interface SettingsPageProps {
  params: Promise<{ teamspace: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  // Await params (Next.js 15 requirement)
  await params;

  // Validate authentication
  const { user } = await validateRequest();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Account Settings</h1>
        <p className={styles.description}>
          Manage your account information and security settings
        </p>
      </div>

      {/* Profile Information */}
      <div className={styles.section}>
        <h2 className={styles.sectionHeading}>Profile Information</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <dt className={styles.infoLabel}>Name</dt>
            <dd className={styles.infoValue}>{user.name ?? 'Not set'}</dd>
          </div>
          <div className={styles.infoItem}>
            <dt className={styles.infoLabel}>Email</dt>
            <dd className={styles.infoValue}>{user.email}</dd>
          </div>
          <div className={styles.infoItem}>
            <dt className={styles.infoLabel}>User ID</dt>
            <dd className={styles.infoValue}>{user.id}</dd>
          </div>
        </div>
      </div>

      {/* Coming Soon Sections */}
      <div className={styles.section}>
        <h2 className={styles.sectionHeading}>Authentication</h2>
        <div className={styles.comingSoon}>
          <p className={styles.comingSoonText}>
            Password change and authentication management features coming soon.
          </p>
          <ul className={styles.featureList}>
            <li>Change password</li>
            <li>Two-factor authentication</li>
            <li>Active sessions management</li>
          </ul>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionHeading}>Security</h2>
        <div className={styles.comingSoon}>
          <p className={styles.comingSoonText}>
            Advanced security settings and audit logs coming soon.
          </p>
          <ul className={styles.featureList}>
            <li>Login history</li>
            <li>Security notifications</li>
            <li>API tokens management</li>
          </ul>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionHeading}>Danger Zone</h2>
        <div className={styles.comingSoon}>
          <p className={styles.comingSoonText}>
            Account deletion and data export features coming soon.
          </p>
          <ul className={styles.featureList}>
            <li>Export account data</li>
            <li>Delete account</li>
          </ul>
        </div>
      </div>

      <p className={styles.footnote}>
        Additional account management features will be implemented in Phase 5-6
        of the account management system.
      </p>
    </div>
  );
}
