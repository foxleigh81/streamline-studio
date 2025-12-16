# Decision: Content Plan View Toggle Implementation Approach

**Date**: 2025-12-16
**Decision Maker**: Project Orchestrator
**Status**: Approved
**Assigned To**: senior-nextjs-developer

## Context

User requested ability to toggle between Grid and Table views on the content plan page. Currently only grid view exists using VideoCard components.

## Decision

Implement dual-view system with the following architecture:

### Component Structure

1. **ViewToggle Component** - Reusable toggle control
   - Located: `/src/components/view-toggle/`
   - Manages view state (grid/table)
   - Persists preference in localStorage
   - Keyboard accessible

2. **VideoTable Component** - Table view for videos
   - Located: `/src/components/video-table/`
   - Client-side sorting (click headers)
   - Row click navigation
   - Responsive design

3. **Page Integration** - Minimal changes to existing page
   - Add ViewToggle to header
   - Conditional rendering based on state
   - Reuse existing tRPC data fetching

### Technical Decisions

**State Management**: Local component state + localStorage
- Rationale: Simple, no need for global state for view preference
- Future-proof: Can upgrade to URL params if needed

**Sorting**: Client-side in VideoTable component
- Rationale: Data already fetched (limit: 50), no API changes needed
- Performance: Acceptable for current dataset size
- Future: Can move to server-side if dataset grows

**Styling**: CSS Modules with SCSS
- Rationale: Project standard (ADR-002)
- Use theme tokens from `/src/themes/default/_tokens.css`

**Data Fetching**: Reuse existing tRPC query
- Rationale: Same data source for both views
- No additional API calls needed

**Filter Architecture**: Prepare structure, no UI yet
- Rationale: User specified no filters now, but wants future support
- Implementation: Component props accept filter state
- Future integration: Add filter UI + state management separately

### Accessibility Requirements

- Keyboard navigation (Tab, Enter, Space)
- ARIA labels and announcements
- Screen reader support for view changes
- Focus management during view switch
- WCAG 2.1 AA compliance

### Testing Requirements

- Storybook stories for ViewToggle and VideoTable
- Unit tests for sorting logic and state management
- E2E tests for view switching, sorting, and navigation
- Accessibility audit with axe-core

## Alternatives Considered

### Alternative 1: URL-based view state
- Rejected: Overkill for simple view preference
- Can add later if needed

### Alternative 2: Server-side sorting
- Rejected: Unnecessary API complexity for small dataset
- Current limit of 50 videos works well client-side

### Alternative 3: Single component with mode prop
- Rejected: VideoCard and VideoTable are structurally different
- Better separation of concerns with dedicated components

### Alternative 4: Implement filters now
- Rejected: User explicitly said "no filters yet"
- Will prepare architecture for future addition

## Consequences

### Positive
- Clear separation of concerns (ViewToggle, VideoTable, VideoCard)
- No changes to existing VideoCard component (no regression risk)
- Simple state management (easy to understand and maintain)
- Client-side sorting provides instant feedback
- Architecture supports future filter addition

### Negative
- Client-side sorting won't scale to 1000+ videos
  - Mitigation: Can move to server-side when needed
- localStorage doesn't sync across devices
  - Mitigation: Acceptable for MVP, can upgrade to user preferences API later

### Neutral
- Two rendering paths to maintain (grid and table)
- Additional components increase bundle size (minimal impact)

## Implementation Notes

- Follow existing patterns: tRPC, WorkspaceRepository, CSS Modules
- Maintain accessibility-first approach
- Use Pino logger for any error handling
- All tests must pass CI before merge
- Pre-release project (v < 1.0.0), no backwards compatibility needed

## Review Process

After implementation:
1. QA Architect - Test coverage, edge cases, quality
2. TRON - UX, accessibility, usability
3. Code Quality Enforcer - Standards, maintainability

## Sign-off

- Project Orchestrator: Approved
- Assignment: senior-nextjs-developer
- Task Specification: `/project-management/tasks/content-plan-view-toggle.md`
