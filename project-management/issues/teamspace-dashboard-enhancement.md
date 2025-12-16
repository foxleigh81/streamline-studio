# Issue: Teamspace Landing Page Enhancement

**Status:** Pending
**Priority:** MEDIUM
**Reporter:** User
**Assignee:** senior-nextjs-developer
**Date Created:** 2025-12-16

## Problem Description

The current teamspace landing page (`/t/[teamspace]`) immediately redirects to the first project's videos page. This creates a long, unwieldy URL and bypasses an opportunity for a proper dashboard/overview.

### Current Behavior

- URL: `/t/workspace` (single-tenant) or `/t/[teamspace]` (multi-tenant)
- **Immediately redirects to:** `/t/workspace/default/videos`
- No dashboard or overview shown

### User Feedback

> "The URL `/t/workspace/default/videos` is too long for a dashboard. I want `/t/[teamspace]` to be a proper landing page with a projects dashboard where users can then click into specific projects."

### Expected Behavior

- URL: `/t/[teamspace]` should show a **projects dashboard**
- Dashboard displays all projects within the teamspace
- Users can click on a project to navigate to it
- Optional: Show recent activity, project stats, quick actions

## Current Implementation

**File:** `/src/app/(app)/t/[teamspace]/page.tsx`
**Lines:** 26-81

The current page:

1. Validates authentication
2. Looks up teamspace by slug
3. Finds first accessible project
4. Redirects to that project's videos page

```typescript
// Current behavior (line 80)
redirect(`/t/${teamspaceSlug}/${firstProject.projectSlug}/videos`);
```

## Solution Required

### Design Considerations

#### Option A: Simple Project List (Recommended)

- Grid/list of all accessible projects
- Project name, description, last updated
- Click to navigate to project
- "Create New Project" button (if permissions allow)

#### Option B: Rich Dashboard

- Project cards with stats (video count, recent activity)
- Recent videos across all projects
- Activity feed
- Quick actions

**Recommendation:** Start with Option A, iterate to Option B later

### Implementation Plan

1. **Replace redirect with dashboard UI**
   - Remove `redirect()` call
   - Fetch all user's projects within teamspace (already done in current code)
   - Render project cards/list

2. **Project Card Component**
   - Create `/src/components/project/project-card.tsx`
   - Display: name, description, role, last updated
   - Link to: `/t/[teamspace]/[project]/videos`

3. **Dashboard Layout**
   - Header: Teamspace name, create button
   - Grid: Project cards (responsive: 1/2/3 columns)
   - Empty state: "No projects yet" + create button

4. **Permissions**
   - All users can view projects they have access to
   - Only teamspace admins can create new projects (use `useCanManageTeamspace` hook)

### Files to Create/Modify

#### New Files

- `/src/components/project/project-card/project-card.tsx`
- `/src/components/project/project-card/project-card.module.scss`
- `/src/components/project/project-card/project-card.stories.tsx`
- `/src/components/project/project-card/project-card.test.tsx`
- `/src/components/project/project-card/index.ts`

#### Modified Files

- `/src/app/(app)/t/[teamspace]/page.tsx` - Replace redirect with dashboard

### Data Requirements

Already available in current code:

```typescript
const userProjectMemberships = await db
  .select({
    projectId: projectUsers.projectId,
    projectSlug: projects.slug,
    projectName: projects.name,
    projectDescription: projects.description,
    role: projectUsers.role,
    updatedAt: projects.updatedAt,
  })
  .from(projectUsers)
  .innerJoin(projects, eq(projectUsers.projectId, projects.id))
  .where(
    and(eq(projectUsers.userId, user.id), eq(projects.teamspaceId, teamspaceId))
  )
  .orderBy(desc(projects.updatedAt));
```

### UI Requirements

#### Responsive Behavior

- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 3 columns

#### Accessibility

- Semantic HTML (article, heading hierarchy)
- Keyboard navigation
- ARIA labels for actions
- Focus management

#### Empty State

```
No projects yet

You don't have access to any projects in this teamspace.

[Create New Project] (if admin)
or
Ask a teamspace administrator to add you to a project.
```

## Testing Requirements

### Unit Tests

- Project card component rendering
- Empty state rendering
- Permission checks for create button

### E2E Tests

- Navigate to `/t/workspace` (or `/t/[teamspace]`)
- Verify dashboard renders (not redirect)
- Click project card, verify navigation
- Test create project flow (if admin)
- Test empty state

### Storybook

- Project card stories (with data)
- Dashboard with multiple projects
- Dashboard with single project
- Empty state

## Migration Considerations

**Pre-release status:** No migration needed. This is a new feature, not a breaking change.

### Backwards Compatibility

The change affects the landing page behavior:

- **Before:** Auto-redirects to first project
- **After:** Shows dashboard, user clicks to navigate

This is acceptable in pre-release (version < 1.0.0).

## Future Enhancements (Post-MVP)

1. Project stats on cards (video count, storage used)
2. Recent activity feed across projects
3. Project search/filter
4. Favorite projects (sticky to top)
5. Project templates
6. Bulk operations (archive, transfer ownership)

## ADR References

- ADR-017: Teamspace Hierarchy
- ADR-008: Multi-Tenancy Strategy

## Dependencies

- Requires Issue #1 (sidebar navigation) to be fixed first
- Blocks: None
- Related: Project creation flow (already exists)

## Acceptance Criteria

- [ ] `/t/[teamspace]` renders dashboard page (no redirect)
- [ ] Dashboard shows all accessible projects
- [ ] Project cards are clickable and navigate correctly
- [ ] Empty state handles no projects gracefully
- [ ] Create button visible to teamspace admins only
- [ ] Responsive layout works on all screen sizes
- [ ] Passes accessibility audit (axe-core)
- [ ] Unit tests achieve 80%+ coverage
- [ ] Storybook stories for all states
- [ ] E2E tests cover critical paths

## Notes

- Defer rich dashboard features (stats, activity) to post-MVP
- Focus on simple, functional project list first
- Ensure consistent styling with rest of app
- Use existing UI components (Button, Card, etc.) where possible
