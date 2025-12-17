import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { validateRequest } from '@/lib/auth/workspace';
import { serverEnv } from '@/lib/env';
import { Button } from '@/components/ui/button';
import styles from './home.module.scss';

/**
 * Home Page (Root Router)
 *
 * Smart landing page that routes users based on their state:
 *
 * Single-Tenant Mode:
 * - Logged in → redirect to teamspace dashboard (/t)
 * - Not logged in → show landing with login option
 *
 * Multi-Tenant Mode:
 * - Logged in → redirect to teamspace selection (/t)
 * - Not logged in → show landing with login/register options
 *
 * @see /docs/adrs/011-self-hosting-strategy.md
 */
export default async function HomePage() {
  const isSingleTenant = serverEnv.MODE === 'single-tenant';

  // Check if user is authenticated
  const { user } = await validateRequest();

  if (user) {
    // User is logged in - redirect to their teamspace dashboard
    // The dashboard will show all available projects
    redirect('/t');
  }

  // User is not logged in - show landing page
  return (
    <div className={styles.container}>
      <main className={styles.content}>
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
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerBranding}>
          <span>Powered by</span>
          <strong>Streamline Studio</strong>
        </div>
      </footer>
    </div>
  );
}
