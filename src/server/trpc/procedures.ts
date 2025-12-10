/**
 * tRPC Procedure Definitions
 *
 * Defines all procedure types (public, protected, workspace, owner, editor).
 * Separated from trpc.ts to avoid circular dependencies with middleware.
 *
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

import { router, publicProcedure, protectedProcedure } from './trpc';
import {
  workspaceMiddleware,
  requireOwner,
  requireEditor,
  type WorkspaceContext,
} from './middleware/workspace';

// Re-export base procedures and router for convenience
export { router, publicProcedure, protectedProcedure };

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
