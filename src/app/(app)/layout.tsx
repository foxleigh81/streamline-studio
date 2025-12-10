import { TRPCProvider } from '@/components/providers/trpc-provider';

/**
 * App Layout
 *
 * Provides tRPC and React Query providers for all app routes.
 * This layout wraps all authenticated app pages.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <TRPCProvider>{children}</TRPCProvider>;
}
