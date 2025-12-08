import type { Metadata } from 'next';
import { TRPCProvider } from '@/lib/trpc/provider';
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
 */
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
