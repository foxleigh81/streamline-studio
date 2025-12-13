import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from './context';

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

// NOTE: workspaceProcedure, ownerProcedure, and editorProcedure are exported
// from ./procedures.ts to avoid circular dependency with middleware/workspace.ts
