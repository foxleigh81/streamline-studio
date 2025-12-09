import { z } from 'zod';
import { router, publicProcedure } from './trpc';
import { authRouter } from './routers/auth';
import { videoRouter } from './routers/video';
import { categoryRouter } from './routers/category';
import { documentRouter } from './routers/document';
import { revisionRouter } from './routers/revision';

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

  /**
   * Video router
   * Handles video CRUD operations with workspace scoping
   * @see Phase 2.1
   */
  video: videoRouter,

  /**
   * Category router
   * Handles category management with workspace scoping
   * @see Phase 2.2
   */
  category: categoryRouter,

  /**
   * Document router
   * Handles document retrieval and updates
   * @see Phase 2.3
   */
  document: documentRouter,

  /**
   * Revision router
   * Handles document revision history operations
   * @see Phase 3.2
   */
  revision: revisionRouter,

  // TODO: Phase 1.4 - Add workspaceRouter for workspace management
  // workspace: workspaceRouter,
});

// Export type for client-side usage
export type AppRouter = typeof appRouter;
