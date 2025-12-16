# Decision: Comprehensive "Project" to "Channel" Rename

## Context

User has requested a complete rename from "projects" to "channels" across the entire codebase. This is a pre-release project (version < 1.0.0), so no backwards compatibility or migration paths are required.

## Scope

This is a comprehensive refactoring affecting approximately 142+ files across the codebase.

## Execution Plan

### Phase 1: Database Schema (COMPLETED)
- Renamed `projects` table to `channels`
- Renamed `projectUsers` table to `channelUsers`
- Renamed `projectId` columns to `channelId`
- Updated all foreign key references
- Updated relations
- Updated type exports (Project → Channel, ProjectUser → ChannelUser, ProjectRole → ChannelRole)

### Phase 2: Repositories (IN PROGRESS)
File: `/src/server/repositories/project-repository.ts` → `/src/server/repositories/channel-repository.ts`

Changes needed:
- Rename file
- Rename `ProjectRepository` class to `ChannelRepository`
- Update all comments referencing "project"
- Update method names: `getProjectId()` → `getChannelId()`
- Update internal variable: `this.projectId` → `this.channelId`
- Update error messages
- Update factory function: `createProjectRepository` → `createChannelRepository`

### Phase 3: tRPC Routers
Files to update:
- `/src/server/trpc/routers/project.ts` → `/src/server/trpc/routers/channel.ts`
- `/src/server/trpc/middleware/project.ts` → `/src/server/trpc/middleware/channel.ts`

Changes:
- Rename files
- Import from `channels`, `channelUsers` (schema)
- Rename `projectRouter` → `channelRouter`
- Update all procedure names and logic
- Update middleware references

### Phase 4: Context/Providers
Directory: `/src/lib/project/` → `/src/lib/channel/`

Changes:
- Rename directory
- `ProjectContext` → `ChannelContext`
- `ProjectProvider` → `ChannelProvider`
- `useProject` → `useChannel`
- `useProjectRole` → `useChannelRole`
- Update all imports

### Phase 5: Components
Directory: `/src/components/project/` → `/src/components/channel/`

Components to rename:
- `ProjectCard` → `ChannelCard`
- `ProjectSwitcher` → `ChannelSwitcher`
- `CreateProjectModal` → `CreateChannelModal`

Changes:
- Rename directory
- Rename all component files and folders
- Rename component names in code
- Update Storybook stories
- Update all imports

### Phase 6: Route Structure
Routes to update:
- `/src/app/(app)/t/[teamspace]/[project]/` → `/src/app/(app)/t/[teamspace]/[channel]/`

Changes:
- Rename `[project]` dynamic segment to `[channel]`
- Update all route params access
- Update layout and page files
- Update metadata

### Phase 7: User-Facing Text
Update all UI strings:
- "Project" → "Channel"
- "project" → "channel"
- "Projects" → "Channels"
- "projects" → "channels"

Locations:
- Button labels
- Headings
- Descriptions
- Error messages
- Empty states
- Loading states
- Form labels

### Phase 8: Types and Interfaces (PARTIAL - schema complete)
Remaining changes:
- Update all `Project*` types to `Channel*` in non-schema files
- Update prop interfaces
- Update function parameters

### Phase 9: Tests
- Update test file names if needed
- Update test descriptions
- Update assertions
- Update mock data

### Phase 10: Final Cleanup
- Comprehensive grep for remaining "project"/"Project" references
- Update ADRs if needed
- Update documentation
- Update README if needed
- Verify no hardcoded references remain

## Files Identified (from type-check errors)

### Must Update:
1. `scripts/seed.ts`
2. `src/app/(app)/t/[teamspace]/page.tsx`
3. `src/lib/auth/validate.ts`
4. `src/lib/auth/workspace.ts`
5. `src/lib/constants/roles.ts`
6. `src/lib/permissions/index.ts`
7. `src/lib/project/context.tsx`
8. `src/lib/project/provider.tsx`
9. `src/server/repositories/teamspace-repository.ts`
10. `src/server/trpc/context.ts`
11. `src/server/trpc/middleware/project.ts`
12. `src/server/trpc/middleware/workspace.ts`
13. `src/server/trpc/routers/auth.ts`
14. `src/server/trpc/routers/invitation.ts`
15. `src/server/trpc/routers/project.ts`
16. `src/server/trpc/routers/setup.ts`
17. `src/server/trpc/routers/team.ts`
18. `src/server/trpc/routers/__tests__/auth.test.ts`
19. `src/test/helpers/database.ts`
20. `src/test/helpers/trpc.ts`

## Success Criteria

1. All TypeScript compilation errors resolved
2. All tests passing
3. No references to "project"/"Project" in user-facing text
4. No references to "project"/"Project" in code (except historical comments in ADRs)
5. Database migrations generated
6. Code quality checks passing (lint, format, type-check)

## Notes

- This is pre-release (<1.0.0) - no backwards compatibility needed
- Database can be reset if needed
- Be thorough - grep for "project" and "Project" to catch everything
- Update comments and documentation
- Maintain consistent terminology throughout
