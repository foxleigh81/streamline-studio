/**
 * tRPC Procedure Definitions
 *
 * Defines all procedure types for the two-tier teamspace/project hierarchy.
 * Separated from trpc.ts to avoid circular dependencies with middleware.
 *
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 * @see /docs/adrs/017-teamspace-hierarchy.md
 */

import { router, publicProcedure, protectedProcedure } from './trpc';

// Teamspace middleware
import {
  teamspaceMiddleware,
  requireTeamspaceOwner,
  requireTeamspaceAdmin,
  requireTeamspaceEditor,
  type TeamspaceContext,
} from './middleware/teamspace';

// Project middleware
import {
  projectMiddleware,
  requireProjectOwner,
  requireProjectEditor,
  type ProjectContext,
} from './middleware/project';

// Legacy workspace middleware (kept for backward compatibility)
import {
  workspaceMiddleware,
  requireOwner,
  requireEditor,
  type WorkspaceContext,
} from './middleware/workspace';

// Re-export base procedures and router for convenience
export { router, publicProcedure, protectedProcedure };

/**
 * Teamspace procedure - requires authentication AND teamspace access
 *
 * This procedure:
 * 1. Verifies the user is authenticated
 * 2. Resolves the teamspace by slug (from input)
 * 3. Verifies the user is a member of the teamspace
 * 4. Adds teamspace-scoped repository to context
 *
 * Use this for endpoints that operate on teamspace-scoped data
 * (team settings, members, billing, etc).
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 */
export const teamspaceProcedure = protectedProcedure.use(teamspaceMiddleware);

/**
 * Project procedure - requires authentication AND teamspace AND project access
 *
 * This procedure:
 * 1. Verifies the user is authenticated
 * 2. Resolves the teamspace by slug (via teamspaceMiddleware)
 * 3. Resolves the project by slug within teamspace (from input)
 * 4. Verifies user has project access (direct membership OR teamspace admin)
 * 5. Calculates effective role with overrides
 * 6. Adds project-scoped repository to context
 *
 * Use this for endpoints that operate on project-scoped data
 * (videos, documents, categories, etc).
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 */
export const projectProcedure = protectedProcedure
  .use(teamspaceMiddleware)
  .use(projectMiddleware);

/**
 * Teamspace owner procedure - requires owner role in teamspace
 * Use for destructive operations like teamspace deletion, billing changes
 */
export const teamspaceOwnerProcedure = teamspaceProcedure.use(
  requireTeamspaceOwner
);

/**
 * Teamspace admin procedure - requires admin role or higher in teamspace
 * Use for team management operations (invite users, manage projects)
 */
export const teamspaceAdminProcedure = teamspaceProcedure.use(
  requireTeamspaceAdmin
);

/**
 * Teamspace editor procedure - requires editor role or higher in teamspace
 * Use for content creation within the teamspace
 */
export const teamspaceEditorProcedure = teamspaceProcedure.use(
  requireTeamspaceEditor
);

/**
 * Project owner procedure - requires owner role in project
 * Use for destructive operations like project deletion, permission changes
 */
export const projectOwnerProcedure = projectProcedure.use(requireProjectOwner);

/**
 * Project editor procedure - requires editor role or higher in project
 * Use for data modification operations (create/edit videos, documents)
 */
export const projectEditorProcedure =
  projectProcedure.use(requireProjectEditor);

// ==============================================================================
// LEGACY PROCEDURES (Backward Compatibility)
// ==============================================================================

/**
 * @deprecated Use projectProcedure instead
 * Workspace procedure - requires authentication AND workspace access
 *
 * This is kept for backward compatibility during the transition to the
 * two-tier teamspace/project hierarchy.
 *
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */
export const workspaceProcedure = protectedProcedure.use(workspaceMiddleware);

/**
 * @deprecated Use projectOwnerProcedure instead
 * Owner procedure - requires owner role in workspace
 */
export const ownerProcedure = workspaceProcedure.use(requireOwner);

/**
 * @deprecated Use projectEditorProcedure instead
 * Editor procedure - requires editor role or higher
 */
export const editorProcedure = workspaceProcedure.use(requireEditor);

// Re-export context types for use in routers
export type { TeamspaceContext, ProjectContext, WorkspaceContext };
