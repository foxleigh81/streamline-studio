# Settings Page Implementation - Quick Overview

**Date**: 2025-12-16
**Status**: Ready for Implementation
**Version**: 0.1.0

## What We're Building

A comprehensive settings system that allows users to:

1. **Set a default channel** - Skip the teamspace dashboard and go straight to their preferred channel on login
2. **Persist view preferences** - Grid vs table view syncs across all devices
3. **Customize account** - Name, email, password (already exists)
4. **Future-ready** - Foundation for themes, date formats, notifications

## Current State vs Future State

### Current State
```
Login → Teamspace Dashboard (/t/workspace)
                ↓
        User picks a channel

View Mode: Stored in localStorage (doesn't sync across devices)
Settings: Basic account page exists (/settings/account)
```

### Future State
```
Login → Default Channel (/t/[teamspace]/[channel]) OR Teamspace Dashboard
        ↑
        User's saved preference

View Mode: Stored in database (syncs across all devices)
Settings: Full preferences page with multiple sections
```

## Architecture at a Glance

### Database
```sql
user_preferences (new table)
├── user_id (PK, FK to users)
├── default_channel_id (FK to channels, nullable)
├── content_plan_view_mode ('grid' | 'table')
├── theme ('light' | 'dark' | 'system')
├── date_format ('ISO' | 'US' | 'EU' | 'UK')
├── time_format ('12h' | '24h')
├── email_notifications (boolean)
├── desktop_notifications (boolean)
├── created_at
└── updated_at
```

### API (tRPC)
```typescript
user.getPreferences() → UserPreferences | defaults
user.updatePreferences(partial) → success
user.getAvailableChannels() → Channel[]
```

### UI Structure
```
/t/[teamspace]/settings/
├── layout.tsx (sidebar navigation)
├── account/
│   └── page.tsx (EXISTS: profile, password)
└── preferences/
    └── page.tsx (NEW: default channel, view mode, theme, etc.)
```

## Implementation Phases

### Phase 1: Database Schema (2-4 hours)
- Add `user_preferences` table to schema
- Generate and run migration
- **Blocks**: Everything

### Phase 2: tRPC API (4-6 hours)
- Implement `getPreferences`, `updatePreferences`, `getAvailableChannels`
- Add validation and authorization
- Unit tests
- **Blocks**: All UI work

### Phase 3: Preferences Page (6-8 hours)
- Build settings UI with form controls
- Integrate with tRPC API
- SCSS styling
- **Delivers**: User-facing preferences page

### Phase 4: Settings Layout (2-3 hours)
- Create sidebar navigation
- Add settings link to main nav
- **Can run in parallel with Phase 3**

### Phase 5: Default Channel Redirect (3-4 hours)
- Update login flow to redirect to default channel
- Handle edge cases (deleted channel, lost access)
- E2E tests
- **Delivers**: Default channel feature

### Phase 6: View Mode Migration (3-4 hours)
- Update content plan page to use database
- Migrate from localStorage
- Optimistic updates
- **Delivers**: Cross-device view mode sync

### Phase 7: Testing & Docs (4-6 hours)
- E2E test suite
- Accessibility testing
- Documentation updates
- **Required before merge**

**Total**: 24-35 hours (3-4 days solo, 1-2 days parallel)

## Key Decisions

### Why Database Instead of localStorage?

| localStorage | Database (chosen) |
|-------------|------------------|
| Device-specific | Syncs across devices |
| Lost on clear data | Persists reliably |
| Client-side only | Enables server-side redirects |
| Fast, simple | Slightly more complex, worth it |

### Why Not Workspace-Scoped?

User preferences are **user-level**, not workspace-level:
- Same user has same preferences in all channels
- Simplifies UX (one place to set preferences)
- Can add workspace-specific overrides later if needed

### Why Extend User Router?

Preferences are user data, not workspace data:
- Follows existing pattern in `user.ts` (profile, password)
- Direct Drizzle queries are acceptable (not workspace-scoped)
- Keeps related functionality together

## File Changes Summary

### New Files (11-13 files)
```
/src/server/db/schema.ts (modified - add table)
/src/server/trpc/routers/user.ts (modified - add procedures)
/src/server/trpc/routers/__tests__/user-preferences.test.ts

/src/app/(app)/t/[teamspace]/settings/layout.tsx
/src/app/(app)/t/[teamspace]/settings/layout.module.scss
/src/app/(app)/t/[teamspace]/settings/preferences/page.tsx
/src/app/(app)/t/[teamspace]/settings/preferences/page.module.scss

/src/components/ui/select.tsx (if doesn't exist)
/src/components/ui/select.module.scss
/src/components/ui/radio-group.tsx (if doesn't exist)
/src/components/ui/radio-group.module.scss

/e2e/settings/preferences.spec.ts
/e2e/settings/default-channel.spec.ts
/e2e/settings/view-mode-persistence.spec.ts

/drizzle/migrations/XXXX_add_user_preferences.sql (generated)
```

### Modified Files (2-3 files)
```
/src/app/(app)/t/[teamspace]/[channel]/content-plan/page.tsx
/src/app/(auth)/login/page.tsx (or auth callback)
/src/lib/constants/storage-keys.ts (deprecation comment)
```

## User Experience Flow

### Setting Default Channel
1. User navigates to Settings → Preferences
2. Sees dropdown: "Default Channel"
3. Options: "Show teamspace dashboard" OR list of their channels
4. Selects a channel
5. Sees success message: "Default channel updated"
6. Next login → lands directly on that channel

### Setting View Mode
1. User is on content plan page
2. Toggles between grid and table view
3. Change is instant (optimistic update)
4. Syncs to database in background
5. Opens app on phone → sees same view mode

## Testing Strategy

### Unit Tests (Vitest)
- tRPC procedures (getPreferences, updatePreferences)
- Authorization checks (can't set unauthorized channel)
- Validation (enum values, UUIDs)
- Edge cases (null values, missing data)

### E2E Tests (Playwright)
- Navigate to preferences page
- Update each setting
- Verify persistence across reloads
- Default channel redirect on login
- View mode sync across tabs
- Cross-device simulation

### Accessibility Tests
- Keyboard navigation
- Screen reader compatibility
- Color contrast (WCAG AA)
- Focus management

## Open Questions for User

Before starting implementation, please decide:

1. **Theme System**: Include in initial release or defer to v0.2.0?
   - **Recommendation**: Defer (adds 8-12 hours, significant scope)

2. **Date/Time Formatting**: Implement now or later?
   - **Recommendation**: Defer or minimal implementation (ISO vs US only)

3. **Notification Preferences**: Add UI now even if email not implemented?
   - **Recommendation**: Skip entirely until email functionality exists

4. **Migration Strategy**: Force localStorage migration on app load, or lazy?
   - **Recommendation**: Lazy (only migrate when user visits settings or content plan)

## Next Steps

1. **Review this overview** and the detailed plan
2. **Answer open questions** above
3. **Approve to proceed** or request changes
4. **Assign Phase 1** to Senior Next.js Developer
5. **Start implementation**

## Documents Reference

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **This file** | Quick overview, high-level understanding | Start here |
| [Implementation Plan](./settings-page-implementation-plan.md) | Comprehensive details, all phases, appendices | Before coding each phase |
| [Task Breakdown](./settings-page-task-breakdown.md) | Detailed tasks, acceptance criteria, checklists | Daily work reference |
| [Architecture Decision](../decisions/user-preferences-architecture.md) | Why we made these choices, alternatives considered | When questioning approach |

## Success Criteria

After implementation complete:

- [ ] User can set default channel and lands there on login
- [ ] View mode persists across devices within 5 seconds
- [ ] All settings save reliably
- [ ] No performance degradation (< 50ms overhead)
- [ ] 80%+ test coverage maintained
- [ ] WCAG 2.1 AA compliance verified
- [ ] CI/CD pipeline passes
- [ ] Zero critical bugs in first week

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Default channel deleted | Validation on save, graceful fallback on login |
| Performance impact | Caching, indexed queries, optimistic updates |
| Breaking auth flow | Extensive E2E tests, staged rollout |
| User confusion | Clear labels, helper text, logical grouping |
| Migration failures | Keep localStorage as fallback, return defaults on error |

## Estimated Timeline

**Minimum Viable Product** (Core Features):
- 1 developer solo: **3-4 working days**
- 2 developers parallel: **1.5-2 working days**

**With Optional Features** (Theme + Date Formatting):
- 1 developer solo: **5-7 working days**
- 2 developers parallel: **3-4 working days**

**Recommendation**: Ship MVP first (default channel + view mode), iterate on optional features based on user feedback.

---

## Quick Commands

```bash
# Phase 1: Database
npm run db:generate
npm run db:migrate
npm run db:studio  # Verify schema

# Development
npm run dev        # Start app
npm run storybook  # Component development

# Testing
npm test                 # Unit tests (watch)
npm run test:coverage    # With coverage
npm run test:e2e         # E2E tests
npm run lint             # Linting
npm run type-check       # TypeScript

# Before PR
npm run test:ci    # Full CI suite
```

---

**Ready to start?** Proceed to [Task Breakdown](./settings-page-task-breakdown.md) for detailed implementation steps.
