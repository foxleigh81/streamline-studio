import * as React from 'react';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import superjson from 'superjson';
import { trpc } from '@/lib/trpc/client';
import { httpBatchLink } from '@trpc/client';

/**
 * Mock tRPC Provider for Storybook
 *
 * Provides a tRPC context with mock responses for components that use tRPC hooks.
 * Uses MSW-like approach of returning mock data without network calls.
 */

// Create a custom fetch that returns mock data
const mockFetch = async (
  url: RequestInfo | URL,
  _options?: RequestInit
): Promise<Response> => {
  // Parse the tRPC batch request to extract procedure names
  const urlString = url.toString();

  // Extract procedure path from URL (e.g., /api/trpc/user.getPreferences)
  const match = urlString.match(/\/api\/trpc\/([^?]+)/);
  const procedures = match?.[1]?.split(',') ?? [];

  // Mock responses for different procedures
  const mockResponses: Record<string, unknown> = {
    'user.getPreferences': {
      id: 'mock-user-id',
      dateFormat: 'ISO',
      timeFormat: '24h',
      theme: 'dark',
    },
    'workspace.getSettings': {
      id: 'mock-workspace-id',
      name: 'Mock Workspace',
    },
    // Add more mocks as needed
  };

  // Build batch response
  const results = procedures.map((proc) => {
    const data = mockResponses[proc] ?? null;
    return {
      result: {
        type: 'data',
        data: data,
      },
    };
  });

  // Return a valid tRPC batch response
  const responseBody = superjson.serialize(results);

  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

/**
 * Mock tRPC Provider component for Storybook stories
 */
export function MockTRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Disable retries in Storybook to fail fast
            retry: false,
            // Use stale time to prevent refetching
            staleTime: Infinity,
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
          fetch: mockFetch,
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
