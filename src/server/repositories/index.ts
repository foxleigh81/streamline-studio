/**
 * Repository Exports
 *
 * Central export for all repository patterns.
 * ALL scoped data access MUST go through these repositories.
 *
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 * @see /docs/adrs/017-teamspace-hierarchy.md
 */

// Teamspace Repository - for teamspace-scoped operations
export {
  TeamspaceRepository,
  createTeamspaceRepository,
  createTeamspace,
  teamspaceExists,
  getTeamspaceCount,
  DEFAULT_SINGLE_TENANT_TEAMSPACE_SLUG,
} from './teamspace-repository';

// Project Repository - for project-scoped operations (videos, documents, categories)
export {
  ProjectRepository,
  createProjectRepository,
  type PaginationOptions,
  type VideoListOptions,
  type DocumentListOptions,
  type CategoryListOptions,
} from './project-repository';
