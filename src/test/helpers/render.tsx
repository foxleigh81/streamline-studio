/**
 * Test Render Utilities
 *
 * Provides shared utilities for rendering components in tests with
 * all necessary providers (tRPC, React Query, etc.)
 *
 * @see /docs/adrs/005-testing-strategy.md
 */

import React, { type ReactElement, type ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import { trpc } from '@/lib/trpc/client';

/**
 * Create a fresh query client for testing
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Create a test tRPC client
 */
export function createTestTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: '/api/trpc',
        transformer: superjson,
      }),
    ],
  });
}

/**
 * All providers wrapper for testing
 */
interface AllProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

export function AllProviders({ children, queryClient }: AllProvidersProps) {
  const client = queryClient ?? createTestQueryClient();
  const trpcClient = createTestTRPCClient();

  return (
    <trpc.Provider client={trpcClient} queryClient={client}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}

/**
 * Custom render function with all providers
 *
 * Usage:
 * ```tsx
 * import { renderWithProviders } from '@/test/helpers/render';
 *
 * test('example', () => {
 *   const { getByText } = renderWithProviders(<MyComponent />);
 *   expect(getByText('Hello')).toBeInTheDocument();
 * });
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { queryClient?: QueryClient }
) {
  const { queryClient, ...renderOptions } = options ?? {};

  function Wrapper({ children }: { children: ReactNode }) {
    return <AllProviders queryClient={queryClient}>{children}</AllProviders>;
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient: queryClient ?? createTestQueryClient(),
  };
}

/**
 * Setup mock fetch for tRPC responses
 *
 * Usage:
 * ```tsx
 * const mockFetch = setupMockFetch();
 * mockFetch.mockSuccess({ data: { success: true } });
 * ```
 */
export function setupMockFetch() {
  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  return {
    mock: mockFetch,
    mockSuccess: (data: unknown) => {
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              result: {
                type: 'data',
                data,
              },
            },
          ]),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );
    },
    mockError: (message: string, code: string = 'BAD_REQUEST') => {
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              error: {
                message,
                code: -32004,
                data: { code },
              },
            },
          ]),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );
    },
    reset: () => mockFetch.mockReset(),
  };
}

// Import vi for the mock setup
import { vi } from 'vitest';
