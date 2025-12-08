/**
 * Workspace Module Exports
 *
 * Central export for workspace-related functionality.
 *
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

// Context and hooks
export {
  WorkspaceContext,
  useWorkspace,
  useWorkspaceId,
  useHasRole,
  useCanEdit,
  useIsOwner,
  type WorkspaceContextValue,
  type WorkspaceData,
} from './context';

// Provider
export { WorkspaceProvider } from './provider';
