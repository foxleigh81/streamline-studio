# Issue: Sidebar Navigation 404 Errors

**Status:** In Progress
**Priority:** HIGH
**Reporter:** User
**Assignee:** senior-nextjs-developer
**Date Created:** 2025-12-16

## Problem Description

After the unified routing implementation, sidebar navigation links are generating 404 errors because they're using an incorrect URL structure.

### Current Behavior

- Sidebar links generate URLs like: `/t/default/categories`
- These result in 404 errors

### Expected Behavior

- Sidebar links should generate URLs like: `/t/workspace/default/categories`
- Where `workspace` is the teamspace slug in single-tenant mode

## Root Cause Analysis

**File:** `/src/components/layout/app-shell/app-shell.tsx`
**Lines:** 112-125

The `buildLink` function incorrectly builds URLs in single-tenant mode:

```typescript
const buildLink = (href: string): string => {
  return multiTenantMode && teamspaceSlug
    ? `/t/${teamspaceSlug}/${projectSlug}${href}` // ✓ Correct for multi-tenant
    : `/t/${projectSlug}${href}`; // ✗ WRONG - missing teamspace segment!
};
```

### Why This Is Wrong

1. **Unified Routing:** The app now uses `/t/[teamspace]/[project]` for ALL routes (single-tenant and multi-tenant)
2. **Single-tenant teamspace:** In single-tenant mode, the reserved teamspace slug is `"workspace"`
3. **Missing segment:** The current code omits the teamspace segment entirely in single-tenant mode

### Additional Context

- The `teamspaceSlug` prop IS being passed to AppShell (see line 54 of project layout)
- The `ProjectSwitcher` component correctly handles this with a fallback (line 48)
- The `isActive` function (lines 111-116) has the same bug

## Solution Required

### Files to Fix

1. `/src/components/layout/app-shell/app-shell.tsx`

### Changes Needed

Update the `buildLink` function to ALWAYS include the teamspace segment:

```typescript
const buildLink = (href: string): string => {
  // Always use unified routing - use "workspace" as fallback for single-tenant
  const effectiveTeamspace = teamspaceSlug ?? 'workspace';
  return `/t/${effectiveTeamspace}/${projectSlug}${href}`;
};
```

Update the `isActive` function similarly:

```typescript
const isActive = (href: string): boolean => {
  const effectiveTeamspace = teamspaceSlug ?? 'workspace';
  const fullPath = `/t/${effectiveTeamspace}/${projectSlug}${href}`;
  return pathname === fullPath || pathname.startsWith(`${fullPath}/`);
};
```

### Why This Works

1. **Unified approach:** Uses the same URL structure for both modes
2. **Fallback safety:** Defaults to "workspace" if teamspaceSlug is undefined
3. **Consistency:** Matches the approach already used in ProjectSwitcher (line 48)
4. **Correct routing:** Aligns with the actual Next.js route structure

## Testing Requirements

### Manual Testing

1. Navigate to any page in single-tenant mode
2. Click each sidebar link (Videos, Categories, Team, Settings)
3. Verify no 404 errors occur
4. Verify active state highlights correct nav item

### E2E Testing

1. Add/update E2E tests for navigation in both modes
2. Verify all sidebar links work correctly
3. Test active state detection

## Related Issues

- Issue #2: Teamspace landing page needs dashboard (separate issue)
- Issue #3: React DevTools warning (known bug, no action needed)

## ADR References

- ADR-017: Teamspace Hierarchy
- ADR-008: Multi-Tenancy Strategy

## Notes

- This is a critical bug affecting all navigation
- Simple fix with clear solution
- No schema changes required
- No migration needed (pre-release)
