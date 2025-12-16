# Task: Remove Workspace Terminology and /w/ Route Pattern

**Status**: In Progress
**Priority**: High
**Complexity**: High (Multi-phase architectural refactoring)
**Started**: 2025-12-15

## Goal

Remove ALL references to "workspace" and the `/w/` route pattern, establishing a clean separation between:

- **Single-tenant mode**: `/t/[project]` (no teamspace in URL)
- **Multi-tenant mode**: `/t/[teamspace]/[project]` (full hierarchy)

## Current State Analysis

### Route Structure

- `/src/app/(app)/w/[slug]/` - 21 files (workspace-based routes)
- `/src/app/(app)/t/[teamspace]/[project]/` - Multi-tenant routes
- `/src/app/(app)/workspaces/` - Workspace listing page

### Components

- `workspace-switcher` - Used in AppShell
- `create-workspace-modal` - For creating new workspaces
- Both components are in `/src/components/workspace/`

### Backend

- `workspace.ts` router - 173 lines, handles workspace CRUD
- `project.ts` router - 300 lines, handles project operations
- Need to merge workspace functionality into project router

### References

- 89 files reference "workspace"
- 829 total occurrences of "workspace" in src/
- 14 files contain `/w/` hardcoded links

### Key Dependencies

- `lib/auth/workspace.ts` - Auth validation functions
- `lib/workspace/` - Workspace context (needs merge with project context)
- AppShell - Navigation link building
- Root page - Redirect logic
- TeamspaceProvider - Needs to detect route pattern
- ProjectProvider - Needs to detect route pattern

## Implementation Plan

### Phase 1: Route Structure Setup

**Owner**: Senior Developer
**Dependencies**: None

1. **Create `/t/[project]` route structure** for single-tenant mode
   - Copy structure from `/w/[slug]/` to `/t/[project]/`
   - Update layout.tsx to NOT use teamspace param
   - Update all page.tsx files to use project slug
   - Maintain all existing pages: videos, categories, team, settings, documents

2. **Verify `/t/[teamspace]/[project]` structure** for multi-tenant mode
   - Ensure all pages are present
   - Verify layout properly handles both params

### Phase 2: Backend Refactoring

**Owner**: Senior Developer
**Dependencies**: Phase 1

1. **Update Project Router** (`src/server/trpc/routers/project.ts`)
   - Add new endpoint: `list` (for single-tenant, lists all user's projects)
   - Add new endpoint: `getBySlug` (single-tenant variant, no teamspace required)
   - Update existing `listInTeamspace` to remain multi-tenant specific
   - Update existing `getBySlug` to remain multi-tenant specific
   - Add logic to detect deployment mode and route to correct endpoint

2. **Create migration plan for workspace router**
   - Move `workspace.create` logic to `project.create`
   - Move `workspace.list` logic to `project.list`
   - Add deprecation warnings to workspace endpoints
   - Plan for eventual removal in future version

3. **Update tRPC Router Registration**
   - Ensure both workspace and project routers are available during transition
   - Add type exports for new project endpoints

### Phase 3: Component Refactoring

**Owner**: Senior Developer
**Dependencies**: Phase 2

1. **Rename WorkspaceSwitcher to ProjectSwitcher**
   - Create new directory: `/src/components/project/project-switcher/`
   - Copy and rename all files
   - Update component to use `project.list` instead of `workspace.list`
   - Update navigation logic to detect deployment mode
   - Single-tenant: navigate to `/t/[project]/videos`
   - Multi-tenant: navigate to `/t/[teamspace]/[project]/videos`
   - Update all imports throughout codebase

2. **Rename CreateWorkspaceModal to CreateProjectModal**
   - Create new directory: `/src/components/project/create-project-modal/`
   - Copy and rename all files
   - Update to use `project.create` instead of `workspace.create`
   - Update success navigation to use correct route pattern
   - Update all imports throughout codebase

3. **Update AppShell Navigation**
   - Update `buildLink` function to detect deployment mode
   - Single-tenant: build `/t/[project]{href}` links
   - Multi-tenant: build `/t/[teamspace]/[project]{href}` links
   - Update `isActive` function to handle both patterns
   - Update teamspace info display logic
   - Import and use ProjectSwitcher instead of WorkspaceSwitcher
   - Import and use CreateProjectModal instead of CreateWorkspaceModal

### Phase 4: Provider Updates

**Owner**: Senior Developer
**Dependencies**: Phase 3

1. **Update TeamspaceProvider**
   - Already handles single-tenant mode correctly (returns null teamspace)
   - Verify behavior when no teamspace param exists
   - Ensure loading states work correctly

2. **Update ProjectProvider**
   - Update slug detection logic:
     ```typescript
     const projectSlug =
       typeof params.project === 'string'
         ? params.project // Multi-tenant: /t/[teamspace]/[project]
         : typeof params.slug === 'string'
           ? params.slug // Potential legacy /w/[slug]
           : null;
     ```
   - Add new detection for single-tenant `/t/[project]`:
     ```typescript
     // Single-tenant: /t/[project]
     const isSingleTenant = !params.teamspace && params.project;
     ```
   - Update query logic to use correct endpoint based on mode
   - Ensure context provides correct data for both modes

3. **Merge or deprecate lib/workspace/**
   - Evaluate if workspace context is still needed
   - If not, create migration plan to remove
   - Update all imports to use project context instead

### Phase 5: Auth and Validation Updates

**Owner**: Security Architect
**Dependencies**: Phase 4

1. **Create new auth functions** (`lib/auth/project.ts`)
   - `validateProjectAccess(userId, projectSlug)` - Single-tenant variant
   - `validateProjectAccessInTeamspace(userId, teamspaceSlug, projectSlug)` - Multi-tenant
   - Keep existing `validateWorkspaceAccess` for backward compatibility during transition

2. **Update layout auth validation**
   - `/t/[project]/layout.tsx` - Use `validateProjectAccess`
   - `/t/[teamspace]/[project]/layout.tsx` - Use `validateProjectAccessInTeamspace`
   - Maintain security boundaries

### Phase 6: Navigation and Link Updates

**Owner**: Lead Developer
**Dependencies**: Phase 5

1. **Update root page** (`src/app/page.tsx`)
   - Line 59: Change redirect from `/w/${firstProject.projectSlug}/videos`
   - To: `/t/${firstProject.projectSlug}/videos` (single-tenant)

2. **Find and update all `/w/` links**
   - Search for `/w/` in src/ (14 files found)
   - Update each to use `/t/[project]` pattern
   - Files to update:
     - `src/lib/project/provider.tsx`
     - `src/lib/teamspace/provider.tsx`
     - `src/lib/hooks/use-breadcrumbs.ts`
     - `src/app/(app)/w/[slug]/page.tsx`
     - `src/app/(app)/w/[slug]/categories/categories-page-client.tsx`
     - `src/app/(app)/w/[slug]/videos/[id]/page.tsx`
     - `src/lib/workspace/provider.tsx`
     - `src/app/(auth)/invite/[token]/page.tsx`
     - `src/app/(app)/workspaces/page.tsx`
     - `src/components/ui/breadcrumb/breadcrumb.tsx`
     - Other files as needed

3. **Update breadcrumb generation**
   - Ensure breadcrumbs work for both route patterns
   - Single-tenant: Project > Section
   - Multi-tenant: Teamspace > Project > Section

### Phase 7: Cleanup and Removal

**Owner**: Lead Developer
**Dependencies**: Phase 6, All tests passing

1. **Delete deprecated routes**
   - Delete entire `/src/app/(app)/w/` directory (21 files)
   - Delete `/src/app/(app)/workspaces/page.tsx`
   - Verify no imports reference deleted files

2. **Delete deprecated components**
   - Delete `/src/components/workspace/workspace-switcher/`
   - Delete `/src/components/workspace/create-workspace-modal/`
   - Delete entire `/src/components/workspace/` directory if empty

3. **Delete deprecated lib/workspace/**
   - After confirming all imports updated to project context
   - Delete `/src/lib/workspace/` directory

4. **Update workspace router**
   - Add deprecation notices
   - Consider keeping for backward compatibility or remove entirely
   - Update documentation

### Phase 8: Testing

**Owner**: QA Architect
**Dependencies**: Phase 7

1. **Unit Tests**
   - Update component tests for ProjectSwitcher
   - Update component tests for CreateProjectModal
   - Update provider tests
   - Update router tests
   - Target: Maintain 80% coverage

2. **Integration Tests**
   - Test single-tenant routing: `/t/[project]`
   - Test multi-tenant routing: `/t/[teamspace]/[project]`
   - Test navigation between projects
   - Test project creation
   - Test auth validation for both modes

3. **E2E Tests**
   - Update E2E tests for new route patterns
   - Test user flows in single-tenant mode
   - Test user flows in multi-tenant mode
   - Test switching between projects
   - Verify all pages load correctly

### Phase 9: Documentation

**Owner**: Technical Writer (or Lead Developer)
**Dependencies**: Phase 8

1. **Update ADRs**
   - Create new ADR documenting workspace → project terminology change
   - Update ADR-017 (teamspace hierarchy) with route pattern decisions
   - Update ADR-008 (multi-tenancy) with routing details

2. **Update CLAUDE.md**
   - Remove all workspace references
   - Document new route patterns
   - Update component architecture section
   - Update common patterns section

3. **Update CONTRIBUTING.md**
   - Update routing documentation
   - Update component creation guidelines
   - Document single-tenant vs multi-tenant development

4. **Update README.md**
   - Update route structure documentation
   - Update deployment mode descriptions

## Risk Assessment

### High Risks

1. **Breaking existing user bookmarks/links**
   - Mitigation: Consider redirect middleware from `/w/*` to `/t/*`
   - Decision needed: Support redirects or clean break?

2. **Auth validation gaps**
   - Mitigation: Security Architect review at Phase 5
   - Ensure no routes bypass validation

3. **Data loss during migration**
   - Mitigation: This is route-only change, no DB migration
   - But verify no hardcoded URLs in database

### Medium Risks

1. **Test coverage gaps**
   - Mitigation: QA review before Phase 7 cleanup
   - Run full test suite between phases

2. **Component import errors**
   - Mitigation: TypeScript will catch at compile time
   - Use global search/replace carefully

3. **Performance impact**
   - Mitigation: Route detection logic is lightweight
   - No DB query changes needed

## Success Criteria

- [ ] Zero references to `/w/` routes in codebase
- [ ] All components use "project" terminology, not "workspace"
- [ ] Single-tenant mode uses `/t/[project]` pattern
- [ ] Multi-tenant mode uses `/t/[teamspace]/[project]` pattern
- [ ] All tests pass (unit, integration, E2E)
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Documentation updated
- [ ] Code review approved by Senior Developer and Security Architect

## Timeline Estimate

- Phase 1: 2-3 hours
- Phase 2: 3-4 hours
- Phase 3: 2-3 hours
- Phase 4: 2 hours
- Phase 5: 2-3 hours
- Phase 6: 2-3 hours
- Phase 7: 1 hour
- Phase 8: 3-4 hours
- Phase 9: 2 hours

**Total**: 19-25 hours

## Notes

- This is a major refactoring that touches ~100 files
- Requires careful coordination to avoid breaking changes
- Should be done in a feature branch with comprehensive testing
- Consider breaking into multiple PRs if too large
- May want to implement redirect middleware for backward compatibility
- User communication may be needed if bookmarks/links will break
