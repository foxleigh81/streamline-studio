import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { isSetupComplete } from '@/lib/setup';
import { validateRequest } from '@/lib/auth/workspace';
import { serverEnv } from '@/lib/env';
import { db } from '@/server/db';
import { projectUsers, projects } from '@/server/db/schema';
// eslint-disable-next-line no-restricted-imports -- Root page needs to query user's first project for redirect
import { eq } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import styles from './home.module.scss';

/**
 * Home Page (Root Router)
 *
 * Smart landing page that routes users based on their state:
 *
 * Single-Tenant Mode:
 * - Setup not complete → redirect to /setup
 * - Logged in → redirect to default project (/t/[project])
 * - Not logged in → show landing with login option
 *
 * Multi-Tenant Mode:
 * - Logged in → redirect to /t/[teamspace]/[project]
 * - Not logged in → show landing with login/register options
 *
 * @see /docs/adrs/011-self-hosting-strategy.md
 */
export default async function HomePage() {
  const isSingleTenant = serverEnv.MODE === 'single-tenant';

  // In single-tenant mode, check if setup is complete first
  if (isSingleTenant) {
    const setupComplete = await isSetupComplete();
    if (!setupComplete) {
      redirect('/setup');
    }
  }

  // Check if user is authenticated
  const { user } = await validateRequest();

  if (user) {
    // User is logged in - redirect to their dashboard
    if (isSingleTenant) {
      // In single-tenant mode, use reserved "workspace" teamspace
      const userProject = await db
        .select({
          projectSlug: projects.slug,
        })
        .from(projectUsers)
        .innerJoin(projects, eq(projectUsers.projectId, projects.id))
        .where(eq(projectUsers.userId, user.id))
        .limit(1);

      const firstProject = userProject[0];
      if (firstProject) {
        // Use unified routing: /t/workspace/[project]/videos
        redirect(`/t/workspace/${firstProject.projectSlug}/videos`);
      }
      // No project found - this shouldn't happen after setup, but fallback to setup
      redirect('/setup');
    } else {
      // Multi-tenant mode - redirect to first teamspace/project
      // TODO: Implement teamspace/project selection page
      redirect('/t');
    }
  }

  // User is not logged in - show landing page
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.logoSection}>
          <Image
            src="/streamline-studio-logo.png"
            alt="Streamline Studio"
            width={280}
            height={70}
            className={styles.logo}
            priority
          />
        </div>

        <div className={styles.hero}>
          <h1 className={styles.title}>
            Plan, Draft, and Manage
            <br />
            <span className={styles.titleAccent}>Your Video Scripts</span>
          </h1>
          <p className={styles.subtitle}>
            A self-hosted content planning tool for creators. Organize your
            ideas, draft scripts, and keep your video production on track.
          </p>
        </div>

        <div className={styles.actions}>
          <Link href="/login">
            <Button variant="primary" size="lg">
              Sign In
            </Button>
          </Link>
          {!isSingleTenant && (
            <Link href="/register">
              <Button variant="secondary" size="lg">
                Create Account
              </Button>
            </Link>
          )}
        </div>

        {isSingleTenant && (
          <p className={styles.hint}>
            This is a private instance. Contact your administrator if you need
            access.
          </p>
        )}
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerBranding}>
          <span>Powered by</span>
          <strong>Streamline Studio</strong>
        </div>
      </footer>
    </div>
  );
}
