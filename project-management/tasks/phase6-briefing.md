# Phase 6: Code Quality - Project Briefing

**Date:** 2025-12-10
**Status:** IN PROGRESS
**Orchestrator:** Project Orchestrator
**Assigned Agents:** senior-nextjs-developer (lead), code-quality-enforcer (reviewer)

## Overview

Phase 6 focuses on code quality improvements including standardizing error handling, extracting shared constants to eliminate duplication, fixing the logout button endpoint, removing unused code, and optimizing database queries.

## Exit Criteria

- Error handling patterns standardized across repositories and routers
- Shared constants extracted and deduplicated
- Logout functionality working correctly
- Unused state setters removed
- N+1 query fixed with batch operations
- All changes pass TypeScript compilation
- All changes pass test suite

## Tasks Overview

### Task 6.1: Standardize Error Handling Patterns

**Priority:** Medium
**Estimated Time:** 30 minutes
**Dependencies:** Task 4.1 (logging - already complete)

**Acceptance Criteria:**

- Consistent pattern for not-found errors (throw TRPCError vs return null)
- Documented convention for when to throw vs return
- All repository methods follow the same pattern
- JSDoc comments document error behavior

**Files to Modify:**

- `src/server/repositories/workspace-repository.ts`
- `src/server/trpc/routers/*.ts`

**Implementation Notes:**

- Recommendation: Always throw TRPCError for not-found
- Add JSDoc comments documenting error behavior
- Update tests to match new behavior if needed

---

### Task 6.2: Extract Shared Constants and Utilities

**Priority:** Medium
**Estimated Time:** 30 minutes
**Dependencies:** None

**Acceptance Criteria:**

- Status colors and labels defined in single location
- DEFAULT_CATEGORY_COLOR constant created
- All duplicated definitions replaced with imports
- Magic numbers moved to named constants

**Files to Create:**

- `src/lib/constants/status.ts`
- `src/lib/constants/colors.ts`

**Files to Modify:**

- `src/components/video/video-card/video-card.tsx`
- `src/app/(app)/w/[slug]/videos/[id]/page.tsx`
- Other files with duplicated status colors/labels

**Constants to Extract:**

```typescript
// Status colors (duplicated in video-card.tsx and video-detail-page.tsx)
const statusColors: Record<string, string> = {
  idea: '#6B7280',
  scripting: '#3B82F6',
  // ... etc
};

// Status labels (duplicated in same files)
const statusLabels: Record<string, string> = {
  idea: 'Idea',
  scripting: 'Scripting',
  // ... etc
};

// Default category color
const DEFAULT_CATEGORY_COLOR = '#6B7280';
```

---

### Task 6.3: Fix Logout Button Endpoint

**Priority:** Medium
**Estimated Time:** 30 minutes
**Dependencies:** None

**Acceptance Criteria:**

- Logout uses tRPC mutation or server action
- Session properly invalidated server-side
- User redirected to login page after logout
- Cookie cleared correctly

**Files to Modify:**

- `src/components/layout/app-shell/app-shell.tsx` (lines 126-131)

**Implementation Notes:**

- Check if `auth.logout` tRPC endpoint exists
- If not, create it or use server action
- Ensure cookie is cleared with proper attributes

---

### Task 6.4: Remove Unused State Setters

**Priority:** Medium
**Estimated Time:** 15 minutes
**Dependencies:** None

**Acceptance Criteria:**

- Unused `_setWorkspace` and `_setRole` removed
- If functionality is needed, implement it; otherwise, use non-state approach
- No underscore-prefixed variables to silence warnings

**Files to Modify:**

- `src/lib/workspace/provider.tsx` (lines 59-62)

**Implementation Notes:**

- Review if workspace/role need to be settable
- If not, remove useState and just derive from context
- Update any dependent code

---

### Task 6.5: Fix N+1 Query in setVideoCategories

**Priority:** Medium
**Estimated Time:** 30 minutes
**Dependencies:** None

**Acceptance Criteria:**

- Batch insert used instead of loop
- Operation wrapped in transaction
- Query count reduced from N+1 to 2 queries

**Files to Modify:**

- `src/server/repositories/workspace-repository.ts` (lines 532-558)

**Implementation Notes:**

- Use `db.insert().values([...])` for batch insert
- Wrap in transaction for atomicity
- Delete old categories, then insert new ones in batch

---

## Work Sequencing

All tasks can be executed in parallel except:

- Task 6.1 should reference logging from Phase 4

**Batch 1 (All Parallel):**

- Task 6.1: Error Handling
- Task 6.2: Shared Constants
- Task 6.3: Logout Button
- Task 6.4: Unused State Setters
- Task 6.5: N+1 Query Fix

**Estimated Total Time:** 2 hours (parallel execution: 30-40 minutes)

---

## Review Process

### After Each Task

1. Senior developer completes implementation
2. Code Quality Enforcer reviews for maintainability
3. Run TypeScript compilation
4. Run relevant tests

### Phase Completion Review

1. Full test suite run
2. TypeScript compilation clean
3. Code review for DRY violations
4. Update project management tracker
5. Create phase completion summary

---

## Testing Requirements

### Automated Testing

- Run existing test suite to ensure no regressions
- Update any tests affected by error handling changes
- Test logout functionality if endpoint changed

### Manual Testing

1. **Error Handling:**
   - Trigger not-found errors in various endpoints
   - Verify error messages are consistent
   - Check error logging

2. **Shared Constants:**
   - Verify status badges render correctly
   - Check category colors are unchanged

3. **Logout:**
   - Click logout button
   - Verify redirect to login
   - Verify session is cleared
   - Try accessing protected route (should redirect to login)

4. **N+1 Query:**
   - Test category assignment to videos
   - Verify categories are saved correctly
   - Check database logs for query count

---

## Success Metrics

- Zero duplicated status color/label definitions
- One consistent error handling pattern throughout codebase
- Logout functionality working 100%
- Zero unused variables with underscore prefixes
- Query count reduced from N+1 to 2 for setVideoCategories
- All changes pass TypeScript compilation
- All changes pass test suite
- No visual regressions

---

## Risk Assessment

### Low Risk Items

- Shared constants (additive, no breaking changes)
- Unused state setters (removing dead code)
- Error handling standardization (improving consistency)

### Medium Risk Items

- Logout button (affects authentication flow)
- N+1 query fix (database operations, need transaction)

### Mitigation Strategies

- Test logout thoroughly before marking complete
- Wrap N+1 fix in transaction for atomicity
- Run full test suite after each change
- Verify no breaking changes to API contracts

---

## Reference Files

- Error handling: `/Users/foxleigh81/dev/internal/streamline-studio/src/server/repositories/workspace-repository.ts`
- Logout: `/Users/foxleigh81/dev/internal/streamline-studio/src/components/layout/app-shell/app-shell.tsx`
- Workspace provider: `/Users/foxleigh81/dev/internal/streamline-studio/src/lib/workspace/provider.tsx`

---

**Next Steps:**

1. Begin with Task 6.2 (shared constants) - lowest risk
2. Execute Task 6.4 (unused state setters) - quick win
3. Complete Task 6.1 (error handling) - improves consistency
4. Implement Task 6.3 (logout) - test thoroughly
5. Finish with Task 6.5 (N+1 query) - database optimization

---

**Status Updates:**

- 2025-12-10 21:36 - Phase 6 briefing created, ready to begin execution
