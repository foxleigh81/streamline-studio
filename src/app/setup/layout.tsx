import { redirect } from 'next/navigation';
import { TRPCProvider } from '@/components/providers/trpc-provider';
import { isSetupComplete } from '@/lib/setup';
import { serverEnv } from '@/lib/env';

/**
 * Setup Layout
 *
 * Provides tRPC provider for the setup wizard.
 *
 * In multi-tenant mode, setup wizard is disabled - redirect to home.
 * If setup is already complete, redirect to home.
 */
export default async function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // In multi-tenant mode, setup wizard is disabled
  if (serverEnv.MODE === 'multi-tenant') {
    redirect('/');
  }

  // If setup is already complete, redirect to home
  const setupComplete = await isSetupComplete();
  if (setupComplete) {
    redirect('/');
  }

  return <TRPCProvider>{children}</TRPCProvider>;
}
