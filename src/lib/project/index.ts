/**
 * Project Module Exports
 *
 * Central export for project-related functionality.
 *
 * Note: Projects were previously called "workspaces" in the codebase.
 * These exports provide the new project-based API while maintaining
 * backward compatibility with legacy workspace hooks.
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

// Context and hooks
export {
  ProjectContext,
  useProject,
  useProjectId,
  useProjectSlug,
  useProjectRole,
  useHasProjectRole,
  useIsProjectOwner,
  useCanEditProject,
  // Legacy aliases for backward compatibility
  useWorkspace,
  useWorkspaceId,
  useHasRole,
  useCanEdit,
  useIsOwner,
  type ProjectContextValue,
  type ProjectData,
} from './context';

// Provider
export { ProjectProvider } from './provider';
