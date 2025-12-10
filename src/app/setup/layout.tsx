import { TRPCProvider } from '@/components/providers/trpc-provider';

/**
 * Setup Layout
 *
 * Provides tRPC provider for the setup wizard.
 */
export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TRPCProvider>{children}</TRPCProvider>;
}
