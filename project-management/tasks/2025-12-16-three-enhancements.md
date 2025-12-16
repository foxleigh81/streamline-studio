# Three Enhancement Tasks - 2025-12-16

## Overview
User requested three changes to improve the application's functionality and naming conventions. This document outlines the investigation findings and implementation plan.

## Status: IN PROGRESS

---

## Task 1: Fix Project Slug Generation Bug (PRIORITY)

### Problem Statement
User created a project named "What the heck!?" during setup wizard but the resulting URL shows:
- Expected: `/t/workspace/what-the-heck/videos`
- Actual: `/t/workspace/default/videos`

### Root Cause Analysis

#### Investigation Findings
1. **Setup Router Issue** (`/src/server/trpc/routers/setup.ts`, line 201):
   ```typescript
   const projectResult = await tx
     .insert(projects)
     .values({
       name: projectName ?? 'My Project',
       slug: 'default',  // <-- HARDCODED SLUG
       mode: 'single-tenant',
       teamspaceId: teamspace.id,
     })
   ```

2. **Project Create Endpoint** (`/src/server/trpc/routers/project.ts`, lines 378-404):
   - Has proper slug generation logic:
   ```typescript
   const baseSlug = input.name
     .toLowerCase()
     .replace(/[^a-z0-9]+/g, '-')
     .replace(/^-|-$/g, '');
   ```
   - Handles uniqueness checking
   - Only available in multi-tenant mode

3. **Database Schema** (`/src/server/db/schema.ts`, line 126):
   - `slug` field is required (`.notNull()`)
   - Has unique constraint per teamspace (line 136)

### Solution
The setup wizard hardcodes the slug to 'default' instead of generating it from the project name. We need to:

1. Extract the slug generation logic into a shared utility function
2. Update the setup router to use this function
3. Ensure uniqueness checking even in setup (though first project should always be unique)
4. Update the setup wizard to properly generate slugs from any project name

### Implementation Plan
1. Create `/src/lib/utils/slug.ts` with slug generation utility
2. Update `/src/server/trpc/routers/setup.ts` to use the utility
3. Refactor `/src/server/trpc/routers/project.ts` to use the same utility
4. Add unit tests for slug generation edge cases

### Files to Modify
- `/src/server/trpc/routers/setup.ts` (line 201)
- `/src/server/trpc/routers/project.ts` (lines 378-404)
- `/src/lib/utils/slug.ts` (new file)

### Test Cases Required
- "What the heck!?" → "what-the-heck"
- "My YouTube Channel" → "my-youtube-channel"
- "Project!!!" → "project"
- "123 Numbers" → "123-numbers"
- "   Spaces   " → "spaces"
- Empty/null project name → fallback to "my-project"

---

## Task 2: Rename "Videos" to "Content Plan"

### Problem Statement
The current "videos" terminology is too specific. User wants to expand to support:
- Videos
- Community posts
- Blog posts
- Shorts
- Other content types

However, for now, only videos will be supported. The renaming makes the UI more future-proof.

### Scope of Changes

#### User-Facing Changes (High Priority)
1. **Navigation**:
   - Sidebar: "Videos" → "Content Plan"
   - Breadcrumbs: "Videos" → "Content Plan"

2. **Routes**:
   - `/t/[teamspace]/[project]/videos` → `/t/[teamspace]/[project]/content-plan`
   - Redirect old URLs (pre-release, so optional but good UX)

3. **Page Titles & Headings**:
   - All instances of "Videos" in UI text
   - Empty states
   - Loading states
   - Error messages

4. **Buttons & CTAs**:
   - "Add Video" could remain (it's specific)
   - "View All Videos" → "View Content Plan"
   - Page headers

#### Backend Changes (Low Priority - Can Defer)
- Database table names (videos, videoCategories) - NO CHANGE for now
- API endpoints - NO CHANGE (internal naming)
- Type names - NO CHANGE (internal naming)

Note: Since this is pre-release (< v1.0.0), we can keep backend naming as-is and only update user-facing terminology. This reduces risk and effort.

### Implementation Plan

#### Phase 1: Route Changes
1. Rename directory: `/src/app/(app)/t/[teamspace]/[project]/videos` → `content-plan`
2. Update dynamic imports and navigation links
3. Update middleware/validation if needed

#### Phase 2: UI Text Updates
1. App Shell sidebar navigation
2. Breadcrumb generation logic
3. Page titles (metadata)
4. Empty states
5. Loading/error messages

#### Phase 3: Component Updates
1. Search for all `videos` references in JSX/TSX
2. Update text content (not prop names or IDs)
3. Update Storybook stories

### Files to Search & Modify
Based on grep results, prioritize:
- `/src/app/(app)/t/[teamspace]/[project]/videos/**` (rename directory)
- `/src/components/layout/app-shell/app-shell.tsx`
- `/src/components/ui/breadcrumb/breadcrumb.tsx`
- `/src/lib/hooks/use-breadcrumbs.tsx`
- `/src/components/ui/empty-state/empty-state.tsx`

### Backward Compatibility
Pre-release status means:
- NO redirect middleware required
- Old URLs can 404
- No migration path needed
- Focus on clean implementation

---

## Task 3: Enhance Dashboard Landing Page

### Problem Statement
After login, users should land on `/t/[teamspace]` (the dashboard) with proper branding, not directly into a project.

### Current State Analysis

#### Existing Implementation
File: `/src/app/(app)/t/[teamspace]/page.tsx`

Current features:
- Lists all projects in teamspace
- Shows project cards with update times
- Has "Create Project" capability check
- Uses `TeamspaceDashboard` component

Current gaps:
- No branding/welcome message
- No introduction for first-time users
- Missing visual hierarchy
- No call-to-action for empty state

#### Login Flow
Need to verify where users land after login. Check:
- `/src/app/(auth)/login/page.tsx`
- Redirect logic after successful authentication

### Enhancement Plan

#### Visual Enhancements
1. **Header Section**:
   - Welcome message with user name
   - Teamspace branding (name, logo if available)
   - Quick stats (project count, recent activity)

2. **Project Grid**:
   - Better project card design
   - Quick action buttons
   - Last accessed indicator
   - Role badge

3. **Empty State**:
   - Welcoming message for new users
   - Clear CTA to create first project
   - Maybe a helpful video/tutorial link

4. **Branding Elements**:
   - Consistent logo placement
   - Color scheme from theme
   - Professional layout

#### Implementation Steps
1. Update `TeamspaceDashboard` component
2. Add welcome header partial
3. Enhance project card styling
4. Add empty state illustration
5. Update login redirect if needed

### Files to Modify
- `/src/app/(app)/t/[teamspace]/page.tsx`
- `/src/app/(app)/t/[teamspace]/teamspace-dashboard.tsx` (check if exists)
- `/src/components/project/project-card/` (styling enhancements)
- Login redirect logic (if needed)

---

## Coordination Plan

### Agent Assignments

1. **Senior NextJS Developer**:
   - Implement slug generation utility
   - Update setup router
   - Handle route renaming
   - Implement dashboard enhancements

2. **Code Quality Enforcer**:
   - Review slug generation edge cases
   - Verify no hardcoded "videos" references remain
   - Check TypeScript strict mode compliance
   - Validate CSS Modules usage

3. **QA Architect**:
   - Test project creation with various names
   - Verify all route changes work
   - Test dashboard functionality
   - Regression test existing features

4. **TRON (User Advocate)**:
   - Review UX of dashboard enhancements
   - Verify terminology changes improve clarity
   - Check accessibility of new components

### Execution Order
1. **First**: Fix slug generation bug (critical, affects data integrity)
2. **Second**: Rename videos to content-plan (large refactor, needs careful testing)
3. **Third**: Enhance dashboard (polish, can iterate)

### Risk Assessment

#### High Risk
- Route renaming could break deep links (mitigated: pre-release)
- Slug generation must handle edge cases (mitigated: comprehensive tests)

#### Medium Risk
- Dashboard changes affect first impression (mitigated: iterative approach)
- Text replacement might miss instances (mitigated: thorough grep search)

#### Low Risk
- Backward compatibility (pre-release eliminates this concern)

---

## Success Criteria

### Task 1 (Slug Generation)
- [ ] New projects generate proper slugs from names
- [ ] Setup wizard creates correctly-slugged first project
- [ ] Special characters handled appropriately
- [ ] Existing "default" projects still work
- [ ] Unit tests pass for all edge cases

### Task 2 (Videos → Content Plan)
- [ ] All routes updated and working
- [ ] No "Videos" text in user-facing UI
- [ ] Navigation reflects new terminology
- [ ] Breadcrumbs updated
- [ ] Backend continues working (no API changes)
- [ ] All E2E tests pass

### Task 3 (Dashboard)
- [ ] Branding visible on landing page
- [ ] Projects displayed in organized grid
- [ ] Empty state is welcoming and actionable
- [ ] Login redirects to dashboard
- [ ] Performance remains good (no layout shift)
- [ ] Accessible and keyboard-navigable

---

## Next Steps

1. Begin with slug generation bug fix (highest priority)
2. Create project-management tracking documents
3. Assign work to specialized agents
4. Monitor progress and handle escalations
5. Coordinate reviews and testing
6. Update documentation as needed

---

**Document Owner**: Project Orchestrator
**Created**: 2025-12-16
**Last Updated**: 2025-12-16
**Status**: Ready for agent assignment
