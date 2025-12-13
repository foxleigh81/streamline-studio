import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/trpc/router';
import { createContext } from '@/server/trpc/context';

// Force Node.js runtime (not Edge) to support all dependencies
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * tRPC API Route Handler
 *
 * Handles all tRPC requests via the App Router.
 * Uses fetchRequestHandler for native Request/Response handling.
 * Includes cookie handling for authentication and Content-Type validation.
 *
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/014-security-architecture.md
 */

const handler = async (req: Request) => {
  // Content-Type validation for POST requests (CSRF defense-in-depth)
  // @see ADR-014: Additional Defense - Content-Type Validation
  if (req.method === 'POST') {
    const contentType = req.headers.get('Content-Type');
    if (!contentType?.includes('application/json')) {
      return new Response('Invalid Content-Type', { status: 400 });
    }
  }

  // Store headers from context for cookie setting
  let responseHeaders: Headers | null = null;

  const options = {
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: async (opts: FetchCreateContextFnOptions) => {
      const ctx = await createContext(opts);
      responseHeaders = ctx.headers;
      return ctx;
    },
    responseMeta: () => {
      // Apply cookies set by procedures
      if (responseHeaders) {
        const setCookie = responseHeaders.get('Set-Cookie');
        if (setCookie) {
          return {
            headers: {
              'Set-Cookie': setCookie,
            },
          };
        }
      }
      return {};
    },
  };

  // Add error handler in development
  if (process.env.NODE_ENV === 'development') {
    return fetchRequestHandler({
      ...options,
      onError: ({ path, error }) => {
        console.error(`[tRPC] Error on ${path ?? '<no-path>'}:`, error.message);
      },
    });
  }

  return fetchRequestHandler(options);
};

export { handler as GET, handler as POST };
