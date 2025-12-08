'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import { trpc } from './client';

/**
 * tRPC Provider
 *
 * Wraps the application with tRPC and React Query providers.
 * This must be used in a Client Component.
 *
 * @example
 * ```tsx
 * // In a layout or page
 * import { TRPCProvider } from '@/lib/trpc/provider';
 *
 * export default function Layout({ children }) {
 *   return <TRPCProvider>{children}</TRPCProvider>;
 * }
 * ```
 *
 * @see /docs/adrs/007-api-and-auth.md
 */
export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000, // 5 seconds
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson,
          // Include credentials for session cookies
          async fetch(url, options) {
            const init: RequestInit = {
              method: options?.method ?? 'GET',
              headers: options?.headers as HeadersInit,
              body: options?.body ?? null,
              credentials: 'include',
            };
            return fetch(url, init);
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
