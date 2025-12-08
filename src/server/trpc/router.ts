import { z } from 'zod';
import { router, publicProcedure } from './trpc';
import { authRouter } from './routers/auth';

/**
 * tRPC Root Router
 *
 * This is the main router that combines all sub-routers.
 *
 * @see /docs/adrs/007-api-and-auth.md
 */

export const appRouter = router({
  /**
   * Health check endpoint
   * Used to verify tRPC is working
   */
  health: publicProcedure.query(() => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }),

  /**
   * Hello world endpoint
   * Demonstrates input validation and response
   */
  hello: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
      })
    )
    .query(({ input }) => {
      return {
        greeting: `Hello, ${input.name ?? 'World'}!`,
      };
    }),

  /**
   * Authentication router
   * Handles register, login, logout
   * @see /docs/adrs/007-api-and-auth.md
   */
  auth: authRouter,

  // TODO: Phase 2.1 - Add videoRouter for video CRUD
  // video: videoRouter,

  // TODO: Phase 2.2 - Add categoryRouter for categories
  // category: categoryRouter,

  // TODO: Phase 2.3 - Add documentRouter for document editing
  // document: documentRouter,

  // TODO: Phase 1.4 - Add workspaceRouter for workspace management
  // workspace: workspaceRouter,
});

// Export type for client-side usage
export type AppRouter = typeof appRouter;
