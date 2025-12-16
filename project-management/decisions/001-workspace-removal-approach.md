# Decision 001: Workspace Removal Approach

**Status**: Pending User Approval
**Date**: 2025-12-15
**Decision Type**: Architectural

## Context

User has requested removal of ALL "workspace" terminology and the `/w/` route pattern. The goal is to establish:

- Single-tenant mode: `/t/[project]` (no teamspace in URL)
- Multi-tenant mode: `/t/[teamspace]/[project]` (full hierarchy)

This affects ~100 files across the codebase with 829 occurrences of "workspace" terminology.

## Key Decisions Required

### 1. Backward Compatibility for Existing URLs

**Question**: Should we maintain redirect support for existing `/w/[slug]` URLs?

**Options**:

**Option A: Clean Break (Recommended)**

- Delete `/w/` routes entirely
- No redirect middleware
- Users with bookmarks will get 404
- Pros: Cleaner codebase, no technical debt
- Cons: May disrupt user experience if bookmarks exist

**Option B: Redirect Middleware**

- Keep redirect from `/w/[slug]` to `/t/[project]`
- Add Next.js middleware to handle redirects
- Maintain for 1-2 versions then remove
- Pros: Better user experience, no broken bookmarks
- Cons: Additional code to maintain, slight performance overhead

**Recommendation**: Option A (Clean Break)

- Rationale: Application appears to be in active development, not production
- If users exist, we can implement Option B, but it requires additional work

### 2. Component Migration Strategy

**Question**: Should we keep old components during transition or do direct rename?

**Option A: Direct Rename (Recommended)**

- Delete old components immediately
- Update all imports in one sweep
- Pros: Clean, no duplication
- Cons: Must be done carefully to avoid broken imports

**Option B: Gradual Migration**

- Create new components alongside old
- Deprecate old components
- Remove after confirming all imports updated
- Pros: Safer, easier to rollback
- Cons: Temporary code duplication

**Recommendation**: Option A (Direct Rename)

- Rationale: TypeScript will catch import errors at compile time
- Test suite will verify nothing breaks

### 3. Backend Router Consolidation

**Question**: Should we merge workspace router into project router or keep separate?

**Option A: Merge Completely (Recommended)**

- Move all workspace endpoints to project router
- Delete workspace router entirely
- Update all client calls to use project router
- Pros: Single source of truth, cleaner API
- Cons: Larger initial refactoring effort

**Option B: Keep Both with Deprecation**

- Add new endpoints to project router
- Mark workspace endpoints as deprecated
- Keep both routers for backward compatibility
- Remove workspace router in future version
- Pros: Safer migration path
- Cons: Duplicate code, larger bundle size

**Recommendation**: Option A (Merge Completely)

- Rationale: Cleaner long-term solution, avoids technical debt
- TypeScript ensures we catch all endpoint changes

### 4. Database Migration

**Question**: Do we need to rename database tables/columns?

**Analysis**:

- Current DB uses `projects` table (good!)
- `projectUsers` table (good!)
- No `workspaces` table found in schema
- Terminology in code layer, not data layer

**Decision**: NO database migration needed

- All DB tables already use correct terminology
- Only route patterns and component names need updating

### 5. Testing Strategy

**Question**: How comprehensive should testing be during migration?

**Recommendation**: Full test suite run between each phase

- Unit tests updated alongside code changes
- Integration tests verify routing works correctly
- E2E tests verify user flows in both deployment modes
- No deployment until all tests pass

## Implementation Approach

Based on the above decisions, the recommended approach:

1. **Feature branch**: `remove-workspace-terminology`
2. **Phase-by-phase implementation**: Follow the 9-phase plan
3. **Testing gates**: Full test suite between major phases
4. **Code review gates**: Security Architect review at Phase 5, QA review at Phase 8
5. **Single PR or multiple**: Recommend single PR to keep changes atomic

## Risk Mitigation

1. **Create comprehensive backup**
   - Full git commit before starting
   - Can revert if needed

2. **TypeScript safety**
   - Compiler will catch import errors
   - Type system ensures API contract compliance

3. **Test coverage**
   - Maintain 80% coverage requirement
   - Add new tests for routing logic

4. **Incremental validation**
   - Run tests after each phase
   - Fix issues before proceeding

## User Questions

Before proceeding, please confirm:

1. **Backward compatibility**: Are there existing users with `/w/` bookmarks we need to support?
   - If YES: We'll implement redirect middleware
   - If NO: We'll do clean deletion

2. **Breaking changes acceptable?**: Is it acceptable to have a breaking change for route patterns?
   - Affects: Bookmarks, external links, documentation

3. **Timeline**: Is the 19-25 hour estimate acceptable?
   - Can be broken into smaller chunks if needed
   - Or done as focused effort over 2-3 days

4. **Deployment window**: Will this require a maintenance window or can be deployed anytime?
   - No database changes needed
   - But users may need to re-login/re-navigate

## Next Steps (Pending Approval)

Once decisions confirmed:

1. Start Phase 1: Route structure setup
2. Assign to Senior Developer
3. Begin implementation with testing gates
4. Provide progress updates after each phase
