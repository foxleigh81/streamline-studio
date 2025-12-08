/**
 * Repository Exports
 *
 * Central export for all repository patterns.
 * ALL workspace-scoped data access MUST go through these repositories.
 *
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

export {
  WorkspaceRepository,
  createWorkspaceRepository,
  type PaginationOptions,
  type VideoListOptions,
  type DocumentListOptions,
  type CategoryListOptions,
} from './workspace-repository';
