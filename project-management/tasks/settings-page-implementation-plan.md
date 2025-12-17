# Settings Page Implementation Plan

**Status**: Draft
**Version**: 0.1.0
**Created**: 2025-12-16
**Last Updated**: 2025-12-16

## Executive Summary

This document outlines the comprehensive implementation plan for a fully-featured settings page in Streamline Studio. The plan addresses account customization, user experience preferences (including default channel and view mode persistence), and follows the project's established architectural patterns.

## Context

### Current State
- Account settings page exists at `/t/[teamspace]/[channel]/settings/account` with basic profile and password management
- Channel settings page exists at `/t/[teamspace]/[channel]/settings` but is a placeholder
- View mode preference is currently stored in **localStorage** only (see line 90 in `content-plan/page.tsx`)
- No default channel functionality exists
- Users currently land on `/t/workspace` (teamspace dashboard) after login

### User Requirements
1. **Default Channel**: Allow users to set a default channel to bypass the teamspace dashboard and go straight to that channel on login
2. **Default View Mode**: Persist grid vs table view preference across sessions and devices
3. **Account Settings**: Profile management (name, email, password) - already implemented
4. **Additional UX Settings**: Theme preferences, date/time formats, other quality-of-life improvements

## Architecture Overview

### Database Schema Changes

We need to add a `user_preferences` table to store user-specific settings that should persist across devices:

```sql
-- New table for user preferences
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- UX Preferences
  default_channel_id UUID REFERENCES channels(id) ON DELETE SET NULL,
  content_plan_view_mode TEXT CHECK (content_plan_view_mode IN ('grid', 'table')) DEFAULT 'grid',
  theme TEXT CHECK (theme IN ('light', 'dark', 'system')) DEFAULT 'system',
  date_format TEXT CHECK (date_format IN ('ISO', 'US', 'EU', 'UK')) DEFAULT 'ISO',
  time_format TEXT CHECK (time_format IN ('12h', '24h')) DEFAULT '24h',

  -- Notification Preferences (future-proofing)
  email_notifications BOOLEAN DEFAULT true,
  desktop_notifications BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_default_channel ON user_preferences(default_channel_id);
```

### Why Not Use localStorage?

The current implementation stores view mode in localStorage (line 90: `localStorage.setItem(CONTENT_PLAN_VIEW_MODE_KEY, mode)`). We need to migrate to database storage because:

1. **Cross-device sync**: Users should see consistent settings on all devices
2. **Backup & recovery**: Settings persist if user clears browser data
3. **Server-side rendering**: Can apply preferences before page loads (e.g., default channel redirect)
4. **Team features**: Foundation for future team-wide defaults or workspace-specific settings

### Settings Page Structure

```
/t/[teamspace]/settings/              # Teamspace-level settings (non-workspace-scoped)
├── /account                          # Account settings (name, email, password) - EXISTS
├── /preferences                      # User preferences (NEW)
└── /notifications                    # Notification settings (FUTURE)

/t/[teamspace]/[channel]/settings/    # Channel-level settings (workspace-scoped)
├── /general                          # Channel name, description
├── /categories                       # Category management
└── /danger-zone                      # Archive/delete channel
```

**Note**: User preferences are **not workspace-scoped** - they belong to the user, not the channel. Therefore, they should live under `/t/[teamspace]/settings/preferences`, not in the channel-specific settings.

## Implementation Phases

### Phase 1: Database Schema & Repository Layer

**Agent Assignment**: Senior Next.js Developer
**Estimated Complexity**: Low
**Dependencies**: None

#### Tasks

1. **Create Drizzle Schema**
   - Add `userPreferences` table to `/src/server/db/schema.ts`
   - Add `userPreferencesEnum` for theme, dateFormat, timeFormat
   - Add relations to users table
   - Add TypeScript types exports

2. **Generate & Run Migration**
   ```bash
   npm run db:generate  # Generate migration
   npm run db:migrate   # Apply to database
   ```

3. **Create UserPreferencesRepository** (Optional Pattern)
   - While ADR-008 mandates WorkspaceRepository for workspace-scoped data
   - User preferences are **not workspace-scoped** (they belong to the user)
   - Direct Drizzle queries are acceptable here with the eslint-disable comment
   - However, for consistency and testability, consider a repository pattern

   **Decision Point**: Do we want a `UserPreferencesRepository` class, or handle in the tRPC router directly?

   **Recommendation**: Handle directly in tRPC router with eslint-disable comment since:
   - User data is not workspace-scoped
   - Simple CRUD operations
   - No complex business logic
   - Follows pattern already used in `user.ts` router (line 13)

#### Acceptance Criteria
- [ ] Schema added to `schema.ts` with correct types and constraints
- [ ] Migration generated and tested locally
- [ ] TypeScript types exported and available
- [ ] Can query user preferences via Drizzle in dev console

---

### Phase 2: tRPC API Layer

**Agent Assignment**: Senior Next.js Developer
**Estimated Complexity**: Medium
**Dependencies**: Phase 1 complete

#### Tasks

1. **Extend User Router** (`/src/server/trpc/routers/user.ts`)

   Add the following procedures:

   ```typescript
   // Get user preferences
   getPreferences: protectedProcedure
     .query(async ({ ctx }) => {
       // Return user preferences or defaults if not set
     })

   // Update user preferences (partial update)
   updatePreferences: protectedProcedure
     .input(updatePreferencesInputSchema)
     .mutation(async ({ ctx, input }) => {
       // Upsert user preferences
       // Validate default_channel_id exists and user has access
     })

   // Get available channels for default channel dropdown
   getAvailableChannels: protectedProcedure
     .query(async ({ ctx }) => {
       // Return channels user has access to
       // Order by most recently accessed or name
     })
   ```

2. **Create Zod Validation Schemas**

   ```typescript
   const themeEnum = z.enum(['light', 'dark', 'system']);
   const dateFormatEnum = z.enum(['ISO', 'US', 'EU', 'UK']);
   const timeFormatEnum = z.enum(['12h', '24h']);
   const viewModeEnum = z.enum(['grid', 'table']);

   const updatePreferencesInputSchema = z.object({
     defaultChannelId: z.string().uuid().optional().nullable(),
     contentPlanViewMode: viewModeEnum.optional(),
     theme: themeEnum.optional(),
     dateFormat: dateFormatEnum.optional(),
     timeFormat: timeFormatEnum.optional(),
     emailNotifications: z.boolean().optional(),
     desktopNotifications: z.boolean().optional(),
   });
   ```

3. **Add Authorization Check for Default Channel**
   - Verify user has access to the channel they're setting as default
   - Query `channel_users` or `teamspace_users` to validate access
   - Return error if channel doesn't exist or user lacks access

4. **Create Unit Tests** (`user.test.ts`)
   - Test getPreferences returns defaults when no preferences exist
   - Test updatePreferences creates new record
   - Test updatePreferences updates existing record
   - Test authorization check for default channel
   - Test invalid channel ID rejection

#### Acceptance Criteria
- [ ] All tRPC procedures implemented and tested
- [ ] Zod schemas validate inputs correctly
- [ ] Authorization prevents setting inaccessible channels
- [ ] Unit tests have 100% coverage for new code
- [ ] tRPC client types auto-generated and available

---

### Phase 3: Frontend - Preferences Settings Page

**Agent Assignment**: Senior Next.js Developer
**Estimated Complexity**: Medium
**Dependencies**: Phase 2 complete

#### Tasks

1. **Create Preferences Settings Page**
   - Path: `/src/app/(app)/t/[teamspace]/settings/preferences/page.tsx`
   - Client component (uses tRPC hooks)
   - Follows pattern from `account/page.tsx`

2. **UI Sections**

   **Section 1: Default Channel**
   ```tsx
   <section className={styles.section}>
     <h2>Default Channel</h2>
     <p>Choose which channel to open when you log in</p>

     <Select
       label="Default Channel"
       value={preferences?.defaultChannelId ?? 'none'}
       onChange={handleDefaultChannelChange}
       options={[
         { value: 'none', label: 'Show teamspace dashboard' },
         ...channels.map(ch => ({ value: ch.id, label: ch.name }))
       ]}
     />
   </section>
   ```

   **Section 2: Content Plan View**
   ```tsx
   <section className={styles.section}>
     <h2>Content Plan</h2>

     <RadioGroup
       label="Default View Mode"
       value={preferences?.contentPlanViewMode ?? 'grid'}
       onChange={handleViewModeChange}
       options={[
         { value: 'grid', label: 'Grid View' },
         { value: 'table', label: 'Table View' },
       ]}
     />
   </section>
   ```

   **Section 3: Appearance**
   ```tsx
   <section className={styles.section}>
     <h2>Appearance</h2>

     <RadioGroup
       label="Theme"
       value={preferences?.theme ?? 'system'}
       onChange={handleThemeChange}
       options={[
         { value: 'system', label: 'System Default' },
         { value: 'light', label: 'Light' },
         { value: 'dark', label: 'Dark' },
       ]}
     />
   </section>
   ```

   **Section 4: Localization**
   ```tsx
   <section className={styles.section}>
     <h2>Date & Time</h2>

     <Select
       label="Date Format"
       value={preferences?.dateFormat ?? 'ISO'}
       onChange={handleDateFormatChange}
       options={[
         { value: 'ISO', label: 'YYYY-MM-DD (2025-12-16)' },
         { value: 'US', label: 'MM/DD/YYYY (12/16/2025)' },
         { value: 'EU', label: 'DD/MM/YYYY (16/12/2025)' },
         { value: 'UK', label: 'DD-MMM-YYYY (16-Dec-2025)' },
       ]}
     />

     <RadioGroup
       label="Time Format"
       value={preferences?.timeFormat ?? '24h'}
       onChange={handleTimeFormatChange}
       options={[
         { value: '24h', label: '24-hour (14:30)' },
         { value: '12h', label: '12-hour (2:30 PM)' },
       ]}
     />
   </section>
   ```

3. **Create UI Components (if needed)**
   - Check if `Select` component exists in `/src/components/ui/`
   - Check if `RadioGroup` component exists
   - Create if missing, following Button/Input patterns

4. **State Management**
   - Use `trpc.user.getPreferences.useQuery()` to load
   - Use `trpc.user.updatePreferences.useMutation()` to save
   - Debounce updates (500ms) to avoid excessive API calls
   - Show success/error toast notifications

5. **Create SCSS Module**
   - Path: `page.module.scss`
   - Follow patterns from `account/page.module.scss`
   - Use theme variables from `/src/themes/default/`

#### Acceptance Criteria
- [ ] Preferences page renders all sections
- [ ] Default channel dropdown populated with user's channels
- [ ] All form controls functional and update database
- [ ] Success/error feedback displayed to user
- [ ] SCSS follows project conventions
- [ ] Page is keyboard accessible (WCAG 2.1 AA)
- [ ] Storybook story created for major components

---

### Phase 4: Settings Layout & Navigation

**Agent Assignment**: Senior Next.js Developer
**Estimated Complexity**: Low
**Dependencies**: Phase 3 complete

#### Tasks

1. **Create Settings Layout**
   - Path: `/src/app/(app)/t/[teamspace]/settings/layout.tsx`
   - Sidebar navigation for settings sections
   - Active link highlighting

   ```tsx
   // Sidebar navigation
   const settingsNavItems = [
     { href: `/t/${teamspace}/settings/account`, label: 'Account' },
     { href: `/t/${teamspace}/settings/preferences`, label: 'Preferences' },
     // Future: /notifications, /billing, etc.
   ];
   ```

2. **Update Channel Settings Layout** (if exists)
   - Path: `/src/app/(app)/t/[teamspace]/[channel]/settings/layout.tsx`
   - Distinguish between user settings and channel settings
   - Clear visual hierarchy

3. **Add Navigation Links**
   - Add settings icon/link to user menu in header
   - Link should go to `/t/[teamspace]/settings/account` (default)

#### Acceptance Criteria
- [ ] Settings layout created with sidebar navigation
- [ ] Active link styling works correctly
- [ ] User can navigate between settings pages
- [ ] Settings link accessible from main navigation
- [ ] Layout is responsive (mobile, tablet, desktop)

---

### Phase 5: Default Channel Redirect Logic

**Agent Assignment**: Senior Next.js Developer
**Estimated Complexity**: Medium
**Dependencies**: Phase 2 complete

#### Tasks

1. **Update Login Success Handler**
   - Path: Likely in `/src/app/(auth)/login/page.tsx` or auth callback
   - After successful login, check user preferences
   - If `defaultChannelId` is set, redirect to that channel
   - If not set, redirect to teamspace dashboard

2. **Add Middleware Check** (Optional)
   - Path: `/src/middleware.ts` or create if doesn't exist
   - When user visits `/t/[teamspace]` root
   - If user has default channel set, redirect to it
   - Avoid redirect loops

3. **Update Session Validation**
   - Path: `/src/lib/auth/workspace.ts` (validateRequest function)
   - Consider including user preferences in session context
   - Makes preferences available to all pages without extra query

#### Implementation Strategy

**Option A: Redirect on Login (Recommended)**
```typescript
// In login success handler
const preferences = await getUserPreferences(user.id);
if (preferences?.defaultChannelId) {
  const channel = await getChannel(preferences.defaultChannelId);
  if (channel && userHasAccess(user.id, channel.id)) {
    redirect(`/t/${channel.teamspaceSlug}/${channel.slug}`);
    return;
  }
}
redirect('/t/workspace');
```

**Option B: Middleware Redirect** (More complex, skip for now)

#### Acceptance Criteria
- [ ] User with default channel set lands on that channel after login
- [ ] User without default channel lands on teamspace dashboard
- [ ] No redirect loops
- [ ] Works correctly if default channel is deleted
- [ ] Works correctly if user loses access to default channel

---

### Phase 6: Content Plan View Mode Integration

**Agent Assignment**: Senior Next.js Developer
**Estimated Complexity**: Medium
**Dependencies**: Phase 2 complete

#### Tasks

1. **Migrate from localStorage to Database**
   - Path: `/src/app/(app)/t/[teamspace]/[channel]/content-plan/page.tsx`
   - Remove localStorage logic (lines 79-91)
   - Load view mode from `trpc.user.getPreferences.useQuery()`
   - Update view mode via `trpc.user.updatePreferences.useMutation()`

2. **Backwards Compatibility**
   - On first load, check localStorage for existing preference
   - If found, migrate to database and clear localStorage
   - Show one-time notification: "Your view preference is now synced across devices"

3. **Optimistic Updates**
   - Use tRPC's optimistic updates for instant feedback
   - View toggle should feel instant (no loading state)

4. **Create Migration Utility** (Optional)
   - Path: `/src/lib/migrations/migrate-view-mode.ts`
   - Can be called on app load or settings page
   - Migrates localStorage → database for all users

#### Implementation

```typescript
// content-plan/page.tsx

const { data: preferences } = trpc.user.getPreferences.useQuery();
const updatePreferences = trpc.user.updatePreferences.useMutation({
  onSuccess: () => {
    announce(`Switched to ${viewMode} view`);
  },
});

const [viewMode, setViewMode] = useState<ViewMode>(
  preferences?.contentPlanViewMode ?? 'grid'
);

// Sync state when preferences load
useEffect(() => {
  if (preferences?.contentPlanViewMode) {
    setViewMode(preferences.contentPlanViewMode);
  }
}, [preferences?.contentPlanViewMode]);

const handleViewModeChange = (mode: ViewMode) => {
  setViewMode(mode); // Optimistic update
  updatePreferences.mutate({ contentPlanViewMode: mode });
};
```

#### Acceptance Criteria
- [ ] View mode loaded from database on page load
- [ ] View mode changes persist to database
- [ ] localStorage preference migrated if exists
- [ ] View mode syncs across devices
- [ ] Optimistic updates work (instant feedback)
- [ ] Works correctly if preferences query fails

---

### Phase 7: Theme System Implementation (Optional/Future)

**Agent Assignment**: Senior Next.js Developer
**Estimated Complexity**: High
**Dependencies**: Phase 3 complete

#### Tasks

This phase is **optional** and can be deferred to a future release. The infrastructure is in place (database field, API, UI), but implementing the theme system requires:

1. **CSS Theme Variables**
   - Duplicate `/src/themes/default/` to `/src/themes/dark/`
   - Define dark mode color palette
   - Update component styles to use theme variables

2. **Theme Provider**
   - Create `ThemeProvider` context
   - Load theme preference from database
   - Apply theme class to `<html>` element
   - Support system theme detection

3. **Testing**
   - Test all components in both themes
   - Ensure contrast ratios meet WCAG AA

**Recommendation**: Ship themes in a separate feature after user testing.

---

### Phase 8: Date/Time Formatting (Optional/Future)

**Agent Assignment**: Senior Next.js Developer
**Estimated Complexity**: Medium
**Dependencies**: Phase 3 complete

#### Tasks

1. **Create Formatting Utilities**
   - Path: `/src/lib/utils/date-format.ts`
   - Functions: `formatDate()`, `formatTime()`, `formatDateTime()`
   - Use user preferences from context

2. **Update Components**
   - Find all date displays in the app
   - Replace hardcoded formats with utility functions
   - Pass user preferences via context

3. **Add i18n Consideration**
   - Consider using `Intl.DateTimeFormat` API
   - Foundation for future internationalization

**Recommendation**: Implement basic version, enhance later.

---

## Testing Strategy

### Unit Tests (Vitest)

**Coverage Target**: 80%+

- [ ] `user.ts` router tests
  - `getPreferences` with no existing record
  - `getPreferences` with existing record
  - `updatePreferences` creates new record
  - `updatePreferences` updates existing record
  - `updatePreferences` validates channel access
  - `getAvailableChannels` returns correct channels

- [ ] Preferences page component tests
  - Renders all sections
  - Form controls update state
  - Mutations called with correct data
  - Error states displayed

### E2E Tests (Playwright)

**Test Suite**: `/e2e/settings/`

- [ ] User can navigate to preferences page
- [ ] User can set default channel
- [ ] User can change view mode
- [ ] Default channel redirect works on login
- [ ] View mode persists across sessions
- [ ] Settings sync across devices (two browser contexts)

### Accessibility Tests

- [ ] Settings pages pass axe-core scans
- [ ] All form controls keyboard accessible
- [ ] Labels and ARIA attributes correct
- [ ] Focus management works in modals/dropdowns

### Storybook Stories

- [ ] `Select` component (if new)
- [ ] `RadioGroup` component (if new)
- [ ] Preferences page sections
- [ ] Settings layout

---

## Rollout Plan

### Pre-Release Testing

1. **Local Testing**
   - Run full test suite: `npm run test:ci`
   - Manual testing of all settings features
   - Test with empty database (new user)
   - Test with existing data

2. **Staging Deployment**
   - Deploy to staging environment
   - Test with production-like data
   - Test across multiple devices/browsers
   - Get user feedback if possible

### Migration Strategy

**For Existing Users**:

1. No database migration needed (new table, no schema changes to existing tables)
2. Default values handle missing preferences
3. Optional: Add script to migrate localStorage → database on first app load

**For New Users**:

1. Preferences created with defaults on first settings page visit
2. Or create empty record on user registration (optional)

### Rollback Plan

If critical issues discovered:

1. **Database**: No rollback needed (new table doesn't affect existing functionality)
2. **Frontend**: Can deploy previous version, new pages won't be accessible but app still works
3. **Preferences**: Users can continue using app without settings, defaults apply

---

## Security Considerations

### Authorization

- [ ] Users can only read/update their own preferences
- [ ] Default channel validation prevents unauthorized access
- [ ] Channel access checked before allowing as default

### Data Validation

- [ ] All inputs validated via Zod schemas
- [ ] Enum values enforced at database level
- [ ] SQL injection prevented via Drizzle parameterized queries

### Rate Limiting

- [ ] Consider adding rate limit to `updatePreferences` mutation
- [ ] Prevent abuse (rapid preference changes)
- [ ] Recommend: 20 requests per minute per user

### Audit Logging

- [ ] Consider logging preference changes to audit log
- [ ] Helps debug issues ("user says they set X but it's Y")
- [ ] Optional: Add to `audit_log` table

---

## Performance Considerations

### Database

- [ ] Index on `user_preferences.user_id` (already in schema)
- [ ] Index on `user_preferences.default_channel_id` (already in schema)
- [ ] Single query to load all preferences (no N+1 problem)

### Frontend

- [ ] Debounce preference updates (500ms)
- [ ] Use tRPC optimistic updates for instant feedback
- [ ] Cache preferences in React Query (5 minutes)
- [ ] Only load preferences once per session

### API

- [ ] Partial updates (only send changed fields)
- [ ] Batch updates if changing multiple preferences
- [ ] Validate on client before sending to server

---

## Documentation Updates

### User-Facing Documentation

- [ ] Update README with settings features
- [ ] Add screenshots of settings pages
- [ ] Document default channel behavior
- [ ] Document view mode persistence

### Developer Documentation

- [ ] Update CONTRIBUTING.md with settings architecture
- [ ] Document user preferences schema
- [ ] Add ADR if significant architectural decision made
- [ ] Update API documentation (if exists)

---

## Future Enhancements

### Phase 9+ (Post-MVP)

1. **Notification Preferences**
   - Email notifications for video due dates
   - Desktop notifications (Web Push API)
   - Digest frequency (daily, weekly)

2. **Channel-Specific Settings**
   - Default video status for new videos
   - Default categories
   - Custom video statuses

3. **Workspace Settings**
   - Workspace defaults (inherited by channels)
   - Team-wide settings (admin only)

4. **Import/Export Settings**
   - Export user preferences as JSON
   - Import settings from another account
   - Useful for migrations or backups

5. **Keyboard Shortcuts**
   - Customizable keyboard shortcuts
   - Quick access to common actions

---

## Success Metrics

### Functional Metrics

- [ ] All unit tests pass (80%+ coverage)
- [ ] All E2E tests pass
- [ ] All accessibility tests pass (WCAG 2.1 AA)
- [ ] No TypeScript errors
- [ ] No ESLint errors

### User Experience Metrics

- [ ] Default channel redirect < 100ms
- [ ] View mode toggle feels instant
- [ ] Settings page loads < 500ms
- [ ] All settings persist correctly

### Code Quality Metrics

- [ ] Follows all ADRs
- [ ] Uses WorkspaceRepository pattern correctly (or documented exception)
- [ ] CSS follows SCSS conventions
- [ ] No console.log (uses Pino logger)

---

## Task Assignments

### Phase 1: Database Schema
**Assigned to**: Senior Next.js Developer
**Review by**: Code Quality Enforcer, Security Architect
**Estimated Time**: 2-4 hours

### Phase 2: tRPC API
**Assigned to**: Senior Next.js Developer
**Review by**: Code Quality Enforcer, Security Architect
**Estimated Time**: 4-6 hours

### Phase 3: Preferences Page
**Assigned to**: Senior Next.js Developer
**Review by**: TRON User Advocate, Code Quality Enforcer
**Estimated Time**: 6-8 hours

### Phase 4: Settings Layout
**Assigned to**: Senior Next.js Developer
**Review by**: TRON User Advocate
**Estimated Time**: 2-3 hours

### Phase 5: Default Channel Redirect
**Assigned to**: Senior Next.js Developer
**Review by**: Security Architect, QA Architect
**Estimated Time**: 3-4 hours

### Phase 6: View Mode Migration
**Assigned to**: Senior Next.js Developer
**Review by**: QA Architect
**Estimated Time**: 3-4 hours

### Phase 7: Testing & Documentation
**Assigned to**: QA Architect (E2E tests), Senior Next.js Developer (docs)
**Review by**: All agents
**Estimated Time**: 4-6 hours

---

## Open Questions for User

1. **Theme Implementation**: Do you want dark/light theme in the initial release, or defer to future version?
   - **Recommendation**: Defer - adds significant complexity

2. **Date/Time Formatting**: How important is this for initial release?
   - **Recommendation**: Implement basic version (ISO vs US format), enhance later

3. **Notification Preferences**: Should we add the UI now even if email sending is not implemented?
   - **Recommendation**: Skip for now, add when email functionality exists

4. **Settings Scope**: Should some settings be workspace-scoped (different per channel)?
   - **Recommendation**: Keep all user-scoped for simplicity, add workspace settings later if needed

5. **Migration of localStorage**: Force migration on first load, or only when user visits settings?
   - **Recommendation**: Force migration on app load (one-time background operation)

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Default channel deleted/inaccessible | Medium | Low | Validation on preference save, graceful fallback on login |
| localStorage→DB migration fails | Low | Low | Keep localStorage as fallback if DB query fails |
| Performance impact (extra query) | Low | Low | Cache preferences, use session context |
| Breaking changes to auth flow | High | Low | Extensive E2E testing, staged rollout |
| User confusion (too many settings) | Medium | Medium | Clear labels, helper text, logical grouping |

---

## Appendix A: Database Schema Reference

```typescript
// /src/server/db/schema.ts

export const userPreferencesEnum = {
  theme: pgEnum('user_theme', ['light', 'dark', 'system']),
  dateFormat: pgEnum('date_format', ['ISO', 'US', 'EU', 'UK']),
  timeFormat: pgEnum('time_format', ['12h', '24h']),
  viewMode: pgEnum('view_mode', ['grid', 'table']),
};

export const userPreferences = pgTable('user_preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),

  // UX Preferences
  defaultChannelId: uuid('default_channel_id').references(() => channels.id, {
    onDelete: 'set null',
  }),
  contentPlanViewMode: userPreferencesEnum.viewMode('content_plan_view_mode')
    .notNull()
    .default('grid'),
  theme: userPreferencesEnum.theme('theme').notNull().default('system'),
  dateFormat: userPreferencesEnum.dateFormat('date_format')
    .notNull()
    .default('ISO'),
  timeFormat: userPreferencesEnum.timeFormat('time_format')
    .notNull()
    .default('24h'),

  // Notification Preferences
  emailNotifications: boolean('email_notifications').notNull().default(true),
  desktopNotifications: boolean('desktop_notifications')
    .notNull()
    .default(false),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userPreferencesRelations = relations(
  userPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [userPreferences.userId],
      references: [users.id],
    }),
    defaultChannel: one(channels, {
      fields: [userPreferences.defaultChannelId],
      references: [channels.id],
    }),
  })
);

export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;
```

---

## Appendix B: tRPC Router Reference

```typescript
// /src/server/trpc/routers/user.ts

const updatePreferencesInputSchema = z.object({
  defaultChannelId: z.string().uuid().optional().nullable(),
  contentPlanViewMode: z.enum(['grid', 'table']).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  dateFormat: z.enum(['ISO', 'US', 'EU', 'UK']).optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),
  emailNotifications: z.boolean().optional(),
  desktopNotifications: z.boolean().optional(),
});

export const userRouter = router({
  // ... existing procedures (me, updateProfile, changePassword)

  /**
   * Get user preferences
   * Returns default values if no preferences exist
   */
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const [preferences] = await ctx.db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, ctx.user.id))
      .limit(1);

    // Return defaults if no preferences exist
    return preferences ?? {
      userId: ctx.user.id,
      defaultChannelId: null,
      contentPlanViewMode: 'grid' as const,
      theme: 'system' as const,
      dateFormat: 'ISO' as const,
      timeFormat: '24h' as const,
      emailNotifications: true,
      desktopNotifications: false,
    };
  }),

  /**
   * Update user preferences (partial update)
   */
  updatePreferences: protectedProcedure
    .input(updatePreferencesInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate default channel if provided
      if (input.defaultChannelId) {
        const hasAccess = await validateChannelAccess(
          ctx.db,
          ctx.user.id,
          input.defaultChannelId
        );
        if (!hasAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this channel',
          });
        }
      }

      // Upsert preferences
      await ctx.db
        .insert(userPreferences)
        .values({
          userId: ctx.user.id,
          ...input,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: userPreferences.userId,
          set: {
            ...input,
            updatedAt: new Date(),
          },
        });

      logger.info({ userId: ctx.user.id }, 'User preferences updated');

      return { success: true };
    }),

  /**
   * Get channels available for setting as default
   */
  getAvailableChannels: protectedProcedure.query(async ({ ctx }) => {
    // Get all channels user has access to
    const channels = await ctx.db
      .select({
        id: channels.id,
        name: channels.name,
        slug: channels.slug,
        teamspaceName: teamspaces.name,
        teamspaceSlug: teamspaces.slug,
      })
      .from(channelUsers)
      .innerJoin(channels, eq(channelUsers.channelId, channels.id))
      .innerJoin(teamspaces, eq(channels.teamspaceId, teamspaces.id))
      .where(eq(channelUsers.userId, ctx.user.id))
      .orderBy(channels.name);

    return channels;
  }),
});
```

---

## Appendix C: File Checklist

### New Files to Create

- [ ] `/src/app/(app)/t/[teamspace]/settings/layout.tsx`
- [ ] `/src/app/(app)/t/[teamspace]/settings/preferences/page.tsx`
- [ ] `/src/app/(app)/t/[teamspace]/settings/preferences/page.module.scss`
- [ ] `/src/components/ui/select.tsx` (if doesn't exist)
- [ ] `/src/components/ui/select.module.scss`
- [ ] `/src/components/ui/radio-group.tsx` (if doesn't exist)
- [ ] `/src/components/ui/radio-group.module.scss`
- [ ] `/src/server/trpc/routers/__tests__/user-preferences.test.ts`
- [ ] `/e2e/settings/preferences.spec.ts`
- [ ] `/e2e/settings/default-channel.spec.ts`

### Files to Modify

- [ ] `/src/server/db/schema.ts` (add userPreferences table)
- [ ] `/src/server/trpc/routers/user.ts` (add preferences procedures)
- [ ] `/src/app/(app)/t/[teamspace]/[channel]/content-plan/page.tsx` (migrate from localStorage)
- [ ] `/src/lib/constants/storage-keys.ts` (add deprecation comment)
- [ ] `/src/app/(auth)/login/page.tsx` (add default channel redirect)

### Files to Review

- [ ] `/src/lib/auth/workspace.ts` (consider adding preferences to context)
- [ ] `/src/components/ui/button.tsx` (reference for new components)
- [ ] `/src/components/ui/input.tsx` (reference for new components)

---

## Conclusion

This implementation plan provides a comprehensive roadmap for adding robust settings functionality to Streamline Studio. The phased approach allows for incremental development and testing, with clear acceptance criteria for each phase.

**Key Principles**:
1. Follow existing architectural patterns (ADRs, tRPC, CSS Modules)
2. Prioritize user experience (instant feedback, cross-device sync)
3. Maintain security (authorization, validation)
4. Ensure quality (tests, accessibility, code review)

**Next Steps**:
1. Review plan with user and address open questions
2. Assign Phase 1 to Senior Next.js Developer
3. Create tracking issues in project-management/tasks/
4. Begin implementation after approval
