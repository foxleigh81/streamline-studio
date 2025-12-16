# Unified Routing Implementation Plan

**Status:** In Progress
**Started:** 2025-12-15
**Priority:** High
**Coordinator:** Project Orchestrator

## Executive Summary

Implementing the unified routing approach that was unanimously approved by QA, UX, and Security reviewers. This refactoring eliminates mode-conditional routing logic by ensuring BOTH single-tenant and multi-tenant modes use the same route pattern: `/t/[teamspace]/[project]/...`

### Key Decision

Single-tenant mode will auto-create a fixed teamspace with slug `workspace`, allowing both modes to use identical route structures.

---

## Audit Results

### Critical Bug (FIXED)

- **File:** `/src/lib/hooks/use-breadcrumbs.ts`
- **Issue:** Lines 62 and 101 used `/w/` instead of `/t/` for single-tenant routes
- **Status:** ✅ FIXED

### Current Route Structure

```
src/app/(app)/t/[slug]/
├── layout.tsx                    # Mode-conditional (needs update)
├── page.tsx                      # Mode-conditional (needs update)
├── error.tsx                     # OK (shared error page)
├── error.module.scss            # OK (shared styles)
├── settings/                     # Teamspace settings (multi-tenant only)
└── [project]/                   # Nested project routes
    ├── layout.tsx               # Multi-tenant only (needs to work for both)
    ├── error.tsx                # OK
    ├── error.module.scss        # OK
    ├── videos/                  # ✅ Project routes
    ├── categories/              # ✅ Project routes
    ├── team/                    # ✅ Project routes
    ├── settings/                # ✅ Project settings
    └── documents/               # ✅ Project routes
```

### Files with Mode-Conditional Logic

#### Routing Files

1. `/src/app/(app)/t/[slug]/layout.tsx` - **CRITICAL**
   - Lines 43-63: Branches on `isMultiTenant()`
   - Single-tenant: treats slug as project
   - Multi-tenant: treats slug as teamspace

2. `/src/app/(app)/t/[slug]/page.tsx` - **CRITICAL**
   - Lines 37-62: Different redirect logic per mode
   - Single-tenant: `/t/[slug]/videos`
   - Multi-tenant: `/t/[slug]/[project]/videos`

3. `/src/app/page.tsx` - **UPDATE REQUIRED**
   - Lines 46-67: Mode-conditional redirects
   - Single-tenant: `/t/[project-slug]/videos`
   - Multi-tenant: `/t` (placeholder)

#### Provider Files

4. `/src/lib/teamspace/provider.tsx` - **UPDATE REQUIRED**
   - Lines 57-58: Looks for `params.teamspace` (doesn't exist yet)
   - Lines 119-125: Provides null context in single-tenant mode
   - Needs to always expect teamspace in route

5. `/src/lib/project/provider.tsx` - **UPDATE REQUIRED**
   - Lines 66-72: Checks both `params.project` and `params.slug`
   - Lines 75-78: Determines mode based on teamspace presence
   - Lines 81-111: Dual query logic for both modes
   - Should simplify to single query path

#### UI Components

6. `/src/lib/hooks/use-breadcrumbs.ts` - **FIXED** ✅
   - Previously had `/w/` references
   - Now uses `/t/` consistently

7. `/src/components/layout/app-shell/app-shell.tsx`
   - Lines 112-125: Mode-conditional link building
   - Should simplify once routes are unified

8. `/src/components/project/project-switcher/project-switcher.tsx`
   - Lines 132-134, 162-164, 232-234: Mode-conditional paths
   - Should simplify once routes are unified

### Database & Repository Layer

#### Schema (`/src/server/db/schema.ts`)

- Has `teamspaces` table
- Has `teamspaceUsers` table
- Has `projects.teamspaceId` column
- **Action needed:** Verify handling of null `teamspaceId` for legacy single-tenant projects

#### TeamspaceRepository

- Located: `/src/server/repositories/teamspace-repository.ts`
- Currently has `createProject()` method
- **Action needed:** Add `createTeamspace()` method with single-tenant guard

#### Teamspace tRPC Router

- Located: `/src/server/trpc/routers/teamspace.ts`
- Has `list` and `getBySlug` queries
- **Action needed:** Add `create` mutation with mode guard

---

## Implementation Plan

### Phase 1: Foundation (Setup & DB)

#### Task 1.1: Add Teamspace Creation API

**Files:**

- `/src/server/trpc/routers/teamspace.ts`
- `/src/server/repositories/teamspace-repository.ts` (create if needed)

**Actions:**

1. Add `createTeamspace` function to repository
2. Add single-tenant mode check (throw FORBIDDEN if attempting to create second teamspace)
3. Add `create` mutation to teamspace router
4. Reserve `workspace` slug in multi-tenant mode

**Acceptance Criteria:**

- ✅ Can create teamspace in multi-tenant mode
- ✅ Cannot create second teamspace in single-tenant mode
- ✅ `workspace` slug is reserved in multi-tenant mode
- ✅ Proper error messages for violations

#### Task 1.2: Setup Wizard Auto-Creation

**Files:**

- `/src/app/setup/page.tsx` or wherever setup logic lives
- Initial app bootstrap code

**Actions:**

1. Locate setup wizard code
2. Add teamspace auto-creation step for single-tenant mode
3. Create teamspace with:
   - `slug: 'workspace'`
   - `name: 'Workspace'`
4. Associate admin user as owner

**Acceptance Criteria:**

- ✅ Single-tenant setup creates `workspace` teamspace
- ✅ Admin user is added as teamspace owner
- ✅ Projects are associated with the teamspace
- ✅ Multi-tenant setup unchanged

---

### Phase 2: Route Structure Refactoring

#### Task 2.1: Rename Directory

**Action:**

```bash
mv src/app/(app)/t/[slug] src/app/(app)/t/[teamspace]
```

**Files affected:**

- All files in `/src/app/(app)/t/[slug]/` directory

**Acceptance Criteria:**

- ✅ Directory renamed to `[teamspace]`
- ✅ All nested files intact
- ✅ Git history preserved

#### Task 2.2: Update [teamspace]/layout.tsx

**File:** `/src/app/(app)/t/[teamspace]/layout.tsx`

**Current state:** Mode-conditional logic
**Target state:** Always validates teamspace access

**Changes:**

```typescript
interface TeamspaceLayoutProps {
  children: React.ReactNode;
  params: { teamspace: string };  // Changed from 'slug'
}

export default async function TeamspaceLayout({
  children,
  params,
}: TeamspaceLayoutProps) {
  // Validate authentication
  const { user } = await validateRequest();
  if (!user) {
    redirect('/login');
  }

  // ALWAYS validate teamspace access (no mode branching)
  const teamspaceAccess = await validateTeamspaceAccess(user.id, params.teamspace);
  if (!teamspaceAccess) {
    redirect('/access-denied');
  }

  // Always provide TeamspaceProvider
  return <TeamspaceProvider>{children}</TeamspaceProvider>;
}
```

**Acceptance Criteria:**

- ✅ No `isMultiTenant()` checks
- ✅ Always validates teamspace access
- ✅ Always provides TeamspaceProvider
- ✅ Works for both `workspace` and custom teamspace slugs

#### Task 2.3: Update [teamspace]/page.tsx

**File:** `/src/app/(app)/t/[teamspace]/page.tsx`

**Current state:** Mode-conditional redirect
**Target state:** Always redirects to first project

**Changes:**

```typescript
interface TeamspacePageProps {
  params: { teamspace: string };
}

export default async function TeamspacePage({ params }: TeamspacePageProps) {
  const { user } = await validateRequest();
  if (!user) {
    redirect('/login');
  }

  // Find first accessible project in this teamspace
  const userProjects = await db
    .select({
      projectSlug: projects.slug,
    })
    .from(projectUsers)
    .innerJoin(projects, eq(projectUsers.projectId, projects.id))
    .innerJoin(teamspaces, eq(projects.teamspaceId, teamspaces.id))
    .where(
      and(
        eq(teamspaces.slug, params.teamspace),
        eq(projectUsers.userId, user.id)
      )
    )
    .limit(1);

  if (userProjects.length === 0) {
    // TODO: Show "no projects" page with option to create
    redirect('/setup');
  }

  const firstProject = userProjects[0];
  if (!firstProject) {
    redirect('/setup');
  }

  redirect(`/t/${params.teamspace}/${firstProject.projectSlug}/videos`);
}
```

**Acceptance Criteria:**

- ✅ No mode checks
- ✅ Always uses teamspace slug from params
- ✅ Queries projects within teamspace
- ✅ Redirects to `/t/[teamspace]/[project]/videos`

#### Task 2.4: Update [project]/layout.tsx

**File:** `/src/app/(app)/t/[teamspace]/[project]/layout.tsx`

**Current state:** Multi-tenant only
**Target state:** Works for both modes

**Changes:**

```typescript
interface ProjectLayoutProps {
  children: React.ReactNode;
  params: { teamspace: string; project: string };
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { user } = await validateRequest();
  if (!user) {
    redirect('/login');
  }

  // Validate project access within teamspace
  const projectAccess = await validateProjectAccess(
    user.id,
    params.teamspace,
    params.project
  );
  if (!projectAccess) {
    redirect('/access-denied');
  }

  return (
    <ProjectProvider>
      <AppShell
        projectSlug={params.project}
        teamspaceSlug={params.teamspace}
      >
        {children}
      </AppShell>
    </ProjectProvider>
  );
}
```

**Acceptance Criteria:**

- ✅ Always expects both teamspace and project params
- ✅ Validates access to project within teamspace
- ✅ Passes both slugs to AppShell
- ✅ No mode checks

---

### Phase 3: Provider Updates

#### Task 3.1: Update TeamspaceProvider

**File:** `/src/lib/teamspace/provider.tsx`

**Changes:**

- Line 57-58: Always get `params.teamspace` (no fallback to null)
- Lines 119-125: Remove default null context branch
- Always fetch teamspace data
- Show error if teamspace not found

**Acceptance Criteria:**

- ✅ Always expects teamspace in route
- ✅ Always fetches teamspace data
- ✅ No null teamspace fallback
- ✅ Proper error handling

#### Task 3.2: Update ProjectProvider

**File:** `/src/lib/project/provider.tsx`

**Changes:**

- Lines 66-72: Only look for `params.project`
- Remove `params.slug` fallback
- Lines 75-78: Remove mode detection
- Lines 81-111: Use single query endpoint
- Simplify to always use `project.getBySlug` with teamspace

**Acceptance Criteria:**

- ✅ Only uses `params.project`
- ✅ No mode branching
- ✅ Single query path
- ✅ Always uses teamspace context

---

### Phase 4: UI Component Updates

#### Task 4.1: Update use-breadcrumbs.ts

**File:** `/src/lib/hooks/use-breadcrumbs.ts`
**Status:** ✅ ALREADY FIXED

#### Task 4.2: Update app-shell.tsx

**File:** `/src/components/layout/app-shell/app-shell.tsx`

**Changes:**

- Lines 112-125: Remove mode checks from `buildLink()`
- Always use `/t/${teamspaceSlug}/${projectSlug}${href}`
- Make `teamspaceSlug` prop required
- Lines 159-178: Keep teamspace info section but hide label in single-tenant

**Acceptance Criteria:**

- ✅ `teamspaceSlug` is required prop
- ✅ Always builds links with teamspace
- ✅ Teamspace section hidden in single-tenant (via CSS or conditional)
- ✅ No mode checks in link building

#### Task 4.3: Update project-switcher.tsx

**File:** `/src/components/project/project-switcher/project-switcher.tsx`

**Changes:**

- Make `teamspaceSlug` required prop
- Lines 132-134, 162-164, 232-234: Always use `/t/${teamspaceSlug}/${slug}/videos`
- Remove mode checks
- Simplify link building

**Acceptance Criteria:**

- ✅ `teamspaceSlug` is required
- ✅ No mode checks
- ✅ All links include teamspace

#### Task 4.4: Update Breadcrumb Display Logic (Single-Tenant UX)

**File:** `/src/components/ui/breadcrumb/breadcrumb.tsx`

**Changes:**

- Add prop to hide first breadcrumb in single-tenant mode
- Or: Filter out "Workspace" breadcrumb in single-tenant
- Make it mode-aware for better UX

**Acceptance Criteria:**

- ✅ Single-tenant mode hides "Workspace >" from breadcrumbs
- ✅ Multi-tenant mode shows full hierarchy
- ✅ Breadcrumbs start at appropriate level per mode

---

### Phase 5: Root Page & Redirects

#### Task 5.1: Update Root Page

**File:** `/src/app/page.tsx`

**Changes:**

- Lines 46-67: Update redirect logic
- Single-tenant: `/t/workspace/[first-project]/videos`
- Multi-tenant: `/t/[first-teamspace]/[first-project]/videos`

**New logic:**

```typescript
if (user) {
  const isSingleTenant = serverEnv.MODE === 'single-tenant';

  if (isSingleTenant) {
    // Single-tenant: redirect to /t/workspace/[project]/videos
    const userProject = await db
      .select({ projectSlug: projects.slug })
      .from(projectUsers)
      .innerJoin(projects, eq(projectUsers.projectId, projects.id))
      .where(eq(projectUsers.userId, user.id))
      .limit(1);

    const firstProject = userProject[0];
    if (firstProject) {
      redirect(`/t/workspace/${firstProject.projectSlug}/videos`);
    }
    redirect('/setup');
  } else {
    // Multi-tenant: redirect to /t/[teamspace]/[project]/videos
    const userTeamspaceProject = await db
      .select({
        teamspaceSlug: teamspaces.slug,
        projectSlug: projects.slug,
      })
      .from(teamspaceUsers)
      .innerJoin(teamspaces, eq(teamspaceUsers.teamspaceId, teamspaces.id))
      .innerJoin(projects, eq(projects.teamspaceId, teamspaces.id))
      .innerJoin(projectUsers, eq(projectUsers.projectId, projects.id))
      .where(
        and(
          eq(teamspaceUsers.userId, user.id),
          eq(projectUsers.userId, user.id)
        )
      )
      .limit(1);

    const firstEntry = userTeamspaceProject[0];
    if (firstEntry) {
      redirect(
        `/t/${firstEntry.teamspaceSlug}/${firstEntry.projectSlug}/videos`
      );
    }
    redirect('/setup');
  }
}
```

**Acceptance Criteria:**

- ✅ Single-tenant redirects to `/t/workspace/...`
- ✅ Multi-tenant redirects to `/t/[teamspace]/...`
- ✅ Proper error handling for no projects
- ✅ Redirects to setup if needed

---

### Phase 6: Validation Functions

#### Task 6.1: Add validateTeamspaceAccess()

**File:** `/src/lib/auth/validate.ts` (or create if needed)

**Add function:**

```typescript
export async function validateTeamspaceAccess(
  userId: string,
  teamspaceSlug: string
): Promise<boolean> {
  const result = await db
    .select({ id: teamspaceUsers.id })
    .from(teamspaceUsers)
    .innerJoin(teamspaces, eq(teamspaceUsers.teamspaceId, teamspaces.id))
    .where(
      and(eq(teamspaces.slug, teamspaceSlug), eq(teamspaceUsers.userId, userId))
    )
    .limit(1);

  return result.length > 0;
}
```

**Acceptance Criteria:**

- ✅ Function validates user access to teamspace
- ✅ Works for any teamspace slug including `workspace`
- ✅ Returns boolean
- ✅ Used in layouts

#### Task 6.2: Update validateProjectAccess()

**File:** Same as above

**Update to include teamspace:**

```typescript
export async function validateProjectAccess(
  userId: string,
  teamspaceSlug: string,
  projectSlug: string
): Promise<boolean> {
  const result = await db
    .select({ id: projectUsers.id })
    .from(projectUsers)
    .innerJoin(projects, eq(projectUsers.projectId, projects.id))
    .innerJoin(teamspaces, eq(projects.teamspaceId, teamspaces.id))
    .where(
      and(
        eq(teamspaces.slug, teamspaceSlug),
        eq(projects.slug, projectSlug),
        eq(projectUsers.userId, userId)
      )
    )
    .limit(1);

  return result.length > 0;
}
```

**Acceptance Criteria:**

- ✅ Validates access to project within specific teamspace
- ✅ Prevents cross-teamspace project access
- ✅ Works for `workspace` teamspace

---

### Phase 7: Cleanup

#### Task 7.1: Remove Obsolete Code

**Actions:**

1. Search for remaining `/w/` references (should be none after fixes)
2. Remove unused mode-conditional helper functions if any
3. Update any remaining hardcoded paths

**Acceptance Criteria:**

- ✅ No `/w/` references remain
- ✅ All paths use `/t/[teamspace]/[project]/...` pattern

#### Task 7.2: Update Documentation

**Files to update:**

- `/docs/adrs/017-teamspace-hierarchy.md` - Update with new unified approach
- Any other route documentation

**Acceptance Criteria:**

- ✅ ADR reflects unified routing
- ✅ Examples show both modes using same routes
- ✅ Single-tenant `workspace` teamspace documented

---

### Phase 8: Testing & Validation

#### Task 8.1: Type Check

```bash
npm run type-check
```

**Acceptance Criteria:**

- ✅ No TypeScript errors
- ✅ All param types correct

#### Task 8.2: Build

```bash
npm run build
```

**Acceptance Criteria:**

- ✅ Production build succeeds
- ✅ No warnings about routes

#### Task 8.3: Manual Testing - Single-Tenant Mode

**Test scenarios:**

1. Fresh setup creates `workspace` teamspace
2. Login redirects to `/t/workspace/[project]/videos`
3. All navigation uses `/t/workspace/...` paths
4. Breadcrumbs hide "Workspace" label
5. Cannot create additional teamspaces
6. Teamspace selector hidden

**Acceptance Criteria:**

- ✅ All scenarios pass
- ✅ No console errors
- ✅ Routes work correctly

#### Task 8.4: Manual Testing - Multi-Tenant Mode

**Test scenarios:**

1. Can create multiple teamspaces
2. Login redirects to `/t/[teamspace]/[project]/videos`
3. All navigation includes teamspace slug
4. Can switch between teamspaces
5. Cannot create teamspace with `workspace` slug
6. Teamspace selector visible

**Acceptance Criteria:**

- ✅ All scenarios pass
- ✅ No console errors
- ✅ Routes work correctly

#### Task 8.5: E2E Tests

**Update existing tests:**

- Update any hardcoded paths
- Test both modes if applicable

**Acceptance Criteria:**

- ✅ All E2E tests pass
- ✅ No flaky tests

---

## Dependencies & Constraints

### Critical Dependencies

1. **Phase 1 must complete before Phase 2** - Need teamspace creation working
2. **Phase 2 must complete before Phase 3** - Route params must exist before providers use them
3. **Phase 3 must complete before Phase 4** - UI depends on provider data

### Constraints

- No database migrations needed (teamspaces table already exists)
- Pre-release app - no backwards compatibility required
- Must maintain security: no cross-teamspace data leakage

---

## Risk Assessment

### High Risk

1. **Breaking existing single-tenant deployments**
   - Mitigation: Setup wizard auto-creates `workspace` teamspace
   - Rollback: Keep old route structure temporarily

2. **Type errors from param name changes**
   - Mitigation: TypeScript will catch all at build time
   - Fix all before deployment

### Medium Risk

1. **Missing some mode-conditional logic**
   - Mitigation: Comprehensive grep audit (completed)
   - Test both modes thoroughly

2. **Provider context issues**
   - Mitigation: Careful testing of provider hierarchy
   - Ensure TeamspaceProvider always wraps ProjectProvider

### Low Risk

1. **UI inconsistencies**
   - Mitigation: Visual testing in both modes
   - Storybook testing

---

## Success Criteria

### Functional

- ✅ Both modes use `/t/[teamspace]/[project]/...` routes
- ✅ Single-tenant auto-creates `workspace` teamspace
- ✅ Cannot create multiple teamspaces in single-tenant mode
- ✅ All navigation works in both modes
- ✅ No mode-conditional routing logic remains

### Technical

- ✅ Type check passes
- ✅ Build succeeds
- ✅ All tests pass
- ✅ No console errors
- ✅ No security regressions

### UX

- ✅ Single-tenant hides teamspace selector
- ✅ Single-tenant breadcrumbs start at project level
- ✅ Multi-tenant shows full hierarchy
- ✅ Smooth navigation in both modes

---

## Next Steps

1. ✅ Critical bug fix - COMPLETE
2. ✅ Comprehensive audit - COMPLETE
3. 🔄 **Current:** Begin Phase 1 implementation
4. Proceed through phases sequentially
5. Test thoroughly at each phase
6. Final validation before completion

---

## Notes

- The `workspace` slug is reserved and cannot be used in multi-tenant mode
- Single-tenant mode can rename the `workspace` teamspace for personalization
- All existing projects should be associated with the `workspace` teamspace during setup
- This is a significant refactoring but eliminates a major source of complexity
