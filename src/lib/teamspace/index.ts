/**
 * Teamspace Module Exports
 *
 * Central export for teamspace-related functionality.
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 */

// Context and hooks
export {
  TeamspaceContext,
  useTeamspace,
  useTeamspaceId,
  useTeamspaceSlug,
  useTeamspaceRole,
  useHasTeamspaceRole,
  useIsTeamspaceOwner,
  useIsTeamspaceAdmin,
  useCanEditTeamspace,
  type TeamspaceContextValue,
  type TeamspaceData,
} from './context';

// Provider
export { TeamspaceProvider } from './provider';
