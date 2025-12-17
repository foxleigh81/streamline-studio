# Decision: User Preferences Architecture

**Status**: Proposed
**Date**: 2025-12-16
**Decision Makers**: Project Orchestrator, Senior Next.js Developer
**Related**: ADR-008 (Multi-Tenancy), ADR-007 (tRPC API)

## Context

Users need to customize their experience in Streamline Studio:

1. **Default Channel**: Skip teamspace dashboard and go directly to a preferred channel on login
2. **View Mode Persistence**: Remember grid vs table view preference across devices
3. **Future Settings**: Theme, date/time formats, notifications

Currently, view mode is stored in **localStorage only**, which:
- Doesn't sync across devices
- Gets lost if user clears browser data
- Can't be used for server-side redirects (default channel)

## Decision

Create a `user_preferences` table to store user-specific settings that should persist across sessions and devices.

### Key Architectural Points

1. **Scope**: User preferences are **not workspace-scoped**
   - They belong to the user, not a specific channel/teamspace
   - Therefore, WorkspaceRepository pattern does not apply
   - Direct Drizzle queries are acceptable (with eslint-disable comment)
   - Follows existing pattern in `user.ts` router

2. **Storage**: Database-backed instead of localStorage
   - Enables cross-device sync
   - Supports server-side redirects
   - More reliable and recoverable

3. **API Layer**: Extend existing `user` tRPC router
   - `getPreferences()` - returns defaults if no record exists
   - `updatePreferences()` - upserts with partial updates
   - `getAvailableChannels()` - for default channel dropdown

4. **Settings Location**: `/t/[teamspace]/settings/preferences`
   - Under teamspace (not channel) because preferences are user-level
   - Keeps related settings together: `/account`, `/preferences`, `/notifications` (future)

## Alternatives Considered

### Alternative 1: Keep Using localStorage
**Rejected** - Doesn't solve cross-device sync or default channel redirect

### Alternative 2: Store in User Table
**Rejected** - User table should be minimal auth data. Preferences will grow over time and should be separate.

### Alternative 3: Workspace-Scoped Preferences
**Rejected** - Adds complexity. Most preferences should apply globally. Can add workspace-specific overrides later if needed.

### Alternative 4: Use React Context Only
**Rejected** - Doesn't persist data. Still needs database storage.

## Implementation Strategy

### Phase 1-2: Database & API (Core Infrastructure)
- Create schema and migration
- Implement tRPC procedures with validation
- Unit tests

### Phase 3-4: UI (User-Facing Features)
- Build preferences page with all settings
- Create settings layout and navigation
- Storybook stories

### Phase 5-6: Integration (Connect the Pieces)
- Default channel redirect on login
- Migrate view mode from localStorage to database
- E2E tests

### Phase 7-8: Polish (Optional/Future)
- Theme system implementation
- Date/time formatting utilities
- Additional UX settings

## Consequences

### Positive

- User settings sync across all devices
- Server-side redirect to default channel possible
- Foundation for future personalization features
- Better user experience (settings don't get lost)

### Negative

- Additional database queries on app load (mitigated by caching)
- Migration needed for existing localStorage preferences
- More complexity than localStorage-only solution

### Neutral

- Adds new table to schema (no changes to existing tables)
- Extends existing user router (no new router needed)

## Security Considerations

1. **Authorization**: Users can only read/update their own preferences
2. **Validation**: Default channel access verified before saving
3. **SQL Injection**: Prevented via Drizzle parameterized queries
4. **Rate Limiting**: Consider adding to updatePreferences mutation

## Performance Impact

- **Database**: Single indexed query per app load (cached for 5 minutes)
- **Frontend**: Debounced updates (500ms), optimistic UI updates
- **API**: Partial updates (only changed fields sent)

**Expected Impact**: Negligible (< 50ms per request)

## Migration Plan

### For Existing Users
- Optional one-time migration from localStorage to database
- If DB query fails, fallback to localStorage
- Default values handle missing preferences

### For New Users
- Preferences return defaults until explicitly set
- No breaking changes

## Success Criteria

- [ ] All settings persist correctly across sessions
- [ ] Default channel redirect works reliably
- [ ] View mode syncs across devices
- [ ] No performance degradation (< 50ms overhead)
- [ ] 80%+ test coverage
- [ ] WCAG 2.1 AA compliance

## Open Questions

1. **Theme Implementation**: Include in initial release or defer?
   - **Recommendation**: Defer - significant scope increase

2. **Force Migration**: Migrate localStorage on app load or lazily?
   - **Recommendation**: Lazy migration on settings page visit

3. **Cache Strategy**: How long to cache preferences?
   - **Recommendation**: 5 minutes in React Query, infinite in session if added to context

## References

- [Full Implementation Plan](/project-management/tasks/settings-page-implementation-plan.md)
- ADR-008: Multi-Tenancy Strategy
- ADR-007: API and Authentication
- Current user router: `/src/server/trpc/routers/user.ts`
