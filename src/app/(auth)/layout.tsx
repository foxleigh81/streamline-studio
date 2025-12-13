import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { TRPCProvider } from '@/lib/trpc/provider';
import { isSetupComplete } from '@/lib/setup';
import { serverEnv } from '@/lib/env';
import styles from './auth.module.scss';

export const metadata: Metadata = {
  title: 'Authentication - Streamline Studio',
  description: 'Sign in or create an account for Streamline Studio',
};

/**
 * Auth Layout
 *
 * Provides a centered layout for authentication pages (login, register).
 * Wraps children with TRPCProvider for API access.
 *
 * In single-tenant mode, redirects to /setup if setup is not complete.
 */
export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // In single-tenant mode, redirect to setup if not complete
  if (serverEnv.MODE === 'single-tenant') {
    const setupComplete = await isSetupComplete();
    if (!setupComplete) {
      redirect('/setup');
    }
  }

  return (
    <TRPCProvider>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>Streamline Studio</h1>
            <p className={styles.subtitle}>YouTube Content Planner</p>
          </div>
          {children}
        </div>
      </div>
    </TRPCProvider>
  );
}
