import { redirect } from 'next/navigation';
import { validateRequest } from '@/lib/auth/workspace';
import styles from './page.module.scss';

/**
 * Project Settings Page
 *
 * Handles project-level settings including:
 * - Project name and description
 * - Project visibility and access
 * - Danger zone (delete project)
 *
 * Note: This is a placeholder during the migration phase.
 * Full settings functionality will be implemented in Phase 5-6.
 */

interface SettingsPageProps {
  params: Promise<{ teamspace: string; project: string }>;
}

export default async function ProjectSettingsPage({
  params,
}: SettingsPageProps) {
  // Await params (Next.js 15 requirement)
  const { project } = await params;

  // Validate authentication
  const { user } = await validateRequest();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Project Settings</h1>
      <p className={styles.projectInfo}>
        Project: <span className={styles.projectName}>{project}</span>
      </p>
      <div className={styles.infoCard}>
        <h2 className={styles.infoHeading}>Coming Soon</h2>
        <p className={styles.infoText}>Project settings will include:</p>
        <ul className={styles.featureList}>
          <li>Project name and description</li>
          <li>Default video settings</li>
          <li>Category management</li>
          <li>Export and backup options</li>
          <li>Danger zone (archive/delete project)</li>
        </ul>
        <p className={styles.footnote}>
          This functionality will be implemented in Phase 5-6 of the account
          management system.
        </p>
      </div>
    </div>
  );
}
