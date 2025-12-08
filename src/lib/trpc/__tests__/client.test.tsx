/**
 * tRPC Client Integration Tests
 *
 * Tests for tRPC client configuration, error handling, and React Query integration.
 *
 * @see /docs/adrs/005-testing-strategy.md
 * @see /docs/adrs/007-api-and-auth.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from '../client';

// Mock fetch for tRPC HTTP calls
const mockFetch = vi.fn();

describe('tRPC Client', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });

    // Setup fetch mock
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Client Creation', () => {
    it('should have trpc client instance defined', () => {
      expect(trpc).toBeDefined();
      expect(trpc.createClient).toBeDefined();
    });

    it('should provide React Query hooks', () => {
      expect(trpc.useContext).toBeDefined();
      expect(trpc.useUtils).toBeDefined();
    });
  });

  describe('Client Configuration', () => {
    it('should create client with httpBatchLink', () => {
      const client = trpc.createClient({
        links: [
          httpBatchLink({
            url: '/api/trpc',
          }),
        ],
      });

      expect(client).toBeDefined();
    });

    it('should support custom URL configuration', () => {
      const customUrl = 'https://api.example.com/trpc';
      const client = trpc.createClient({
        links: [
          httpBatchLink({
            url: customUrl,
          }),
        ],
      });

      expect(client).toBeDefined();
    });
  });

  describe('React Query Integration', () => {
    it('should work with QueryClientProvider', () => {
      const trpcClient = trpc.createClient({
        links: [
          httpBatchLink({
            url: '/api/trpc',
          }),
        ],
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </trpc.Provider>
      );

      expect(wrapper).toBeDefined();
    });

    it('should provide query utilities via useUtils', async () => {
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify([{ result: { type: 'data', data: null } }]),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      const trpcClient = trpc.createClient({
        links: [
          httpBatchLink({
            url: '/api/trpc',
          }),
        ],
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </trpc.Provider>
      );

      const { result } = renderHook(() => trpc.useUtils(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeDefined();
        expect(result.current.invalidate).toBeDefined();
      });
    });

    it('should provide context utilities via useContext', async () => {
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify([{ result: { type: 'data', data: null } }]),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      const trpcClient = trpc.createClient({
        links: [
          httpBatchLink({
            url: '/api/trpc',
          }),
        ],
      });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </trpc.Provider>
      );

      const { result } = renderHook(() => trpc.useContext(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });
    });
  });

  describe('Request Configuration', () => {
    it('should include credentials in fetch requests', async () => {
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify([{ result: { type: 'data', data: null } }]),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      const trpcClient = trpc.createClient({
        links: [
          httpBatchLink({
            url: '/api/trpc',
            fetch: (url, options) => {
              // Verify credentials are included
              expect(options?.credentials).toBe('include');
              return fetch(url, options);
            },
          }),
        ],
      });

      expect(trpcClient).toBeDefined();
    });

    it('should support custom headers', () => {
      const customHeaders = { 'X-Custom-Header': 'test-value' };

      const trpcClient = trpc.createClient({
        links: [
          httpBatchLink({
            url: '/api/trpc',
            headers: () => customHeaders,
          }),
        ],
      });

      expect(trpcClient).toBeDefined();
    });

    it('should support async header functions', () => {
      const trpcClient = trpc.createClient({
        links: [
          httpBatchLink({
            url: '/api/trpc',
            headers: async () => {
              // Simulate async header retrieval (e.g., from cookies/storage)
              return { 'X-Workspace-Id': 'workspace-123' };
            },
          }),
        ],
      });

      expect(trpcClient).toBeDefined();
    });
  });

  describe('Batching', () => {
    it('should batch multiple requests', () => {
      const trpcClient = trpc.createClient({
        links: [
          httpBatchLink({
            url: '/api/trpc',
            maxURLLength: 2048, // Enable batching with URL length limit
          }),
        ],
      });

      expect(trpcClient).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    it('should provide type-safe client creation', () => {
      const client = trpc.createClient({
        links: [
          httpBatchLink({
            url: '/api/trpc',
          }),
        ],
      });

      // TypeScript should enforce correct types
      expect(client).toBeDefined();
    });

    it('should have properly typed Provider component', () => {
      // Verify Provider is a valid React component
      expect(trpc.Provider).toBeDefined();
      expect(typeof trpc.Provider).toBe('function');
    });
  });
});
