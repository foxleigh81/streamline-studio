import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from './context';
import {
  workspaceMiddleware,
  requireOwner,
  requireEditor,
  type WorkspaceContext,
} from './middleware/workspace';

/**
 * tRPC Initialization
 *
 * Creates the tRPC instance with context and transformer.
 *
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

// Initialize tRPC with context type
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // Add custom error data here if needed
        zodError:
          error.cause instanceof Error ? error.cause.message : undefined,
      },
    };
  },
});

// Export router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
export const createCallerFactory = t.createCallerFactory;

/**
 * Auth middleware - ensures user is authenticated
 */
const isAuthed = middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
    },
  });
});

/**
 * Protected procedure - requires authentication
 * Use this for any endpoint that requires a logged-in user
 */
export const protectedProcedure = t.procedure.use(isAuthed);

/**
 * Workspace procedure - requires authentication AND workspace access
 *
 * This procedure:
 * 1. Verifies the user is authenticated
 * 2. Resolves the workspace (from header in multi-tenant, default in single-tenant)
 * 3. Verifies the user has access to the workspace
 * 4. Adds workspace-scoped repository to context
 *
 * Use this for any endpoint that operates on workspace-scoped data.
 *
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */
export const workspaceProcedure = protectedProcedure.use(workspaceMiddleware);

/**
 * Owner procedure - requires owner role in workspace
 * Use for destructive operations like workspace deletion
 */
export const ownerProcedure = workspaceProcedure.use(requireOwner);

/**
 * Editor procedure - requires editor role or higher
 * Use for data modification operations
 */
export const editorProcedure = workspaceProcedure.use(requireEditor);

// Re-export workspace context type for use in routers
export type { WorkspaceContext };
