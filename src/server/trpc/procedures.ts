/**
 * tRPC Procedure Definitions
 *
 * Defines all procedure types for the two-tier teamspace/channel hierarchy.
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

// Channel middleware (requires teamspace context)
import {
  channelMiddleware,
  requireChannelOwner,
  requireChannelEditor,
  type ChannelContext,
} from './middleware/channel';

// Simple channel middleware (single-tenant / header-based resolution)
import {
  simpleChannelMiddleware,
  requireSimpleChannelOwner,
  requireSimpleChannelEditor,
  type SimpleChannelContext,
} from './middleware/simple-channel';

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
 * Channel procedure - requires authentication AND teamspace AND channel access
 *
 * This procedure:
 * 1. Verifies the user is authenticated
 * 2. Resolves the teamspace by slug (via teamspaceMiddleware)
 * 3. Resolves the channel by slug within teamspace (from input)
 * 4. Verifies user has channel access (direct membership OR teamspace admin)
 * 5. Calculates effective role with overrides
 * 6. Adds channel-scoped repository to context
 *
 * Use this for endpoints that operate on channel-scoped data
 * (videos, documents, categories, etc).
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 */
export const channelProcedure = protectedProcedure
  .use(teamspaceMiddleware)
  .use(channelMiddleware);

/**
 * Teamspace owner procedure - requires owner role in teamspace
 * Use for destructive operations like teamspace deletion, billing changes
 */
export const teamspaceOwnerProcedure = teamspaceProcedure.use(
  requireTeamspaceOwner
);

/**
 * Teamspace admin procedure - requires admin role or higher in teamspace
 * Use for team management operations (invite users, manage channels)
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
 * Channel owner procedure - requires owner role in channel
 * Use for destructive operations like channel deletion, permission changes
 */
export const channelOwnerProcedure = channelProcedure.use(requireChannelOwner);

/**
 * Channel editor procedure - requires editor role or higher in channel
 * Use for data modification operations (create/edit videos, documents)
 */
export const channelEditorProcedure =
  channelProcedure.use(requireChannelEditor);

// ==============================================================================
// SIMPLE CHANNEL PROCEDURES (Single-tenant / Header-based resolution)
// ==============================================================================

/**
 * Simple channel procedure - requires authentication AND channel access
 *
 * This procedure:
 * 1. Verifies the user is authenticated
 * 2. Resolves the channel (from header in multi-tenant, or default in single-tenant)
 * 3. Verifies the user is a member of the channel
 * 4. Adds channel-scoped repository to context
 *
 * Use this for endpoints that need channel context without teamspace hierarchy.
 *
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */
export const simpleChannelProcedure = protectedProcedure.use(
  simpleChannelMiddleware
);

/**
 * Simple channel owner procedure - requires owner role in channel
 * Use for destructive operations like channel deletion, permission changes
 */
export const simpleChannelOwnerProcedure = simpleChannelProcedure.use(
  requireSimpleChannelOwner
);

/**
 * Simple channel editor procedure - requires editor role or higher
 * Use for data modification operations (create/edit videos, documents)
 */
export const simpleChannelEditorProcedure = simpleChannelProcedure.use(
  requireSimpleChannelEditor
);

// Re-export context types for use in routers
export type { TeamspaceContext, ChannelContext, SimpleChannelContext };
