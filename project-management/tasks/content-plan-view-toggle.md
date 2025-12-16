# Content Plan View Toggle Feature

**Status**: In Progress
**Started**: 2025-12-16
**Assigned To**: senior-nextjs-developer
**Coordinated By**: project-orchestrator

## Overview

Add view toggle functionality to the content plan page, allowing users to switch between Grid and Table views of their video content.

## Requirements

1. **View Toggle Component**
   - Toggle control between "Grid View" and "Table View"
   - Persists selection (localStorage or URL param)
   - Accessible keyboard navigation
   - Clear visual indication of active view

2. **Grid View (Current Implementation)**
   - Maintain existing VideoCard grid layout
   - No changes to current functionality
   - This becomes the default view

3. **Table View (New)**
   - Sortable table displaying video content
   - Columns: Title, Status, Due Date, Description, Categories
   - Click row to navigate to video detail
   - Sortable by: Title (alphabetical), Status, Due Date
   - Responsive design for mobile

4. **Architecture for Future Filters**
   - Design component structure to accommodate filters
   - Consider filter state management pattern
   - Leave hooks/placeholders for filter integration

## Technical Specifications

### File Locations

- **Page**: `/src/app/(app)/t/[teamspace]/[channel]/content-plan/page.tsx`
- **Existing Styles**: `/src/app/(app)/t/[teamspace]/[channel]/content-plan/content-plan-page.module.scss`
- **New Components** (in `/src/components/`):
  - `view-toggle/view-toggle.tsx` - Toggle button component
  - `video-table/video-table.tsx` - Table view component

### Design Constraints

- **CSS Modules with SCSS** - No Tailwind
- **Theme Variables** - Use existing tokens from `/src/themes/default/_tokens.css`
- **Accessibility** - WCAG 2.1 AA compliance
- **Responsive** - Mobile-first approach

### Data Structure

Videos data is already fetched via tRPC:
```typescript
const { data: videosData } = trpc.video.list.useQuery({
  limit: 50,
  orderBy: 'createdAt',
  orderDir: 'desc',
});
```

Table view will use the same data source.

## Implementation Tasks

### Task 1: View Toggle Component
- Create `ViewToggle` component with Grid/Table icons
- Implement state management (useState + localStorage)
- Add keyboard navigation (Tab, Arrow keys, Enter/Space)
- Style with CSS Modules
- Create Storybook story
- Write unit tests

### Task 2: Video Table Component
- Create `VideoTable` component accepting video array
- Implement sortable columns (click header to sort)
- Add sort indicators (arrows)
- Handle row click navigation
- Format dates and status labels
- Style responsively (stack on mobile or horizontal scroll)
- Create Storybook story with different data states
- Write unit tests for sorting logic

### Task 3: Integrate with Content Plan Page
- Add ViewToggle to page header
- Conditional rendering based on view state
- Maintain accessibility announcements
- Ensure loading/empty states work in both views
- Update existing styles if needed

### Task 4: Testing
- E2E test for view switching
- E2E test for table sorting
- E2E test for keyboard navigation
- Accessibility audit (axe-core)

## Acceptance Criteria

- [ ] View toggle is visible and functional
- [ ] Grid view displays as before (no regression)
- [ ] Table view displays all video data
- [ ] Table sorting works for all sortable columns
- [ ] View preference persists across page reloads
- [ ] Keyboard navigation works (Tab, Enter, Space)
- [ ] Mobile responsive (both views)
- [ ] ARIA labels and announcements present
- [ ] No console errors or warnings
- [ ] Storybook stories for new components
- [ ] Unit tests achieve >80% coverage
- [ ] E2E tests pass in CI

## Review Checklist

After implementation, the following reviews will be triggered:

- [ ] **QA Review** - Testing coverage, edge cases, quality metrics
- [ ] **TRON UX Review** - User experience, accessibility, usability
- [ ] **Code Quality Review** - Standards compliance, maintainability, patterns

## Dependencies

- Existing video data from tRPC
- Existing VideoCard component (for grid view)
- Theme tokens and CSS variables

## Future Considerations

- Filter UI component (categories, status, date range)
- Filter state management
- URL-based filter persistence
- Export functionality (CSV/JSON)
- Bulk actions (multi-select in table view)

## Notes

- This is a pre-release project (v < 1.0.0), no backwards compatibility needed
- Follow WorkspaceRepository pattern (already used via tRPC)
- Use Pino logger, not console.log
- All tests must pass CI before merge
