import { z } from 'zod';
import { router, publicProcedure } from './trpc';
import { authRouter } from './routers/auth';
import { videoRouter } from './routers/video';
import { categoryRouter } from './routers/category';
import { documentRouter } from './routers/document';
import { revisionRouter } from './routers/revision';
import { invitationRouter } from './routers/invitation';
import { teamRouter } from './routers/team';
import { userRouter } from './routers/user';
import { teamspaceRouter } from './routers/teamspace';
import { channelRouter } from './routers/channel';

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
   * Registration always creates a new workspace (teamspace + channel)
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

  /**
   * Invitation router
   * Handles workspace invitation operations
   * @see Phase 5.2
   */
  invitation: invitationRouter,

  /**
   * Team router
   * Handles workspace team member management
   * @see Phase 5.2
   */
  team: teamRouter,

  /**
   * User router
   * Handles user profile and account management
   */
  user: userRouter,

  /**
   * Teamspace router
   * Handles teamspace operations and access control
   * @see /docs/adrs/017-teamspace-hierarchy.md
   */
  teamspace: teamspaceRouter,

  /**
   * Channel router
   * Handles channel operations within teamspaces
   * @see /docs/adrs/017-teamspace-hierarchy.md
   */
  channel: channelRouter,
});

// Export type for client-side usage
export type AppRouter = typeof appRouter;
