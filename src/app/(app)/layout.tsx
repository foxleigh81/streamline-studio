import { redirect } from 'next/navigation';
import { TRPCProvider } from '@/components/providers/trpc-provider';
import { isSetupComplete } from '@/lib/setup';
import { serverEnv } from '@/lib/env';

/**
 * App Layout
 *
 * Provides tRPC and React Query providers for all app routes.
 * This layout wraps all authenticated app pages.
 *
 * In single-tenant mode, redirects to /setup if setup is not complete.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // In single-tenant mode, redirect to setup if not complete
  if (serverEnv.MODE === 'single-tenant') {
    const setupComplete = await isSetupComplete();
    if (!setupComplete) {
      redirect('/setup');
    }
  }

  return <TRPCProvider>{children}</TRPCProvider>;
}
