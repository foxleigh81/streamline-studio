# User Menu with Modal-Based Settings Implementation Plan

**Status**: In Progress
**Started**: 2025-12-17
**Assigned to**: Project Orchestrator → Senior Developer

## Overview

Transform account/settings UX from navigation-based pages to modal-based interactions. This prevents sidebar re-rendering and maintains user context when accessing settings.

## Goals

1. Replace sidebar "Account" navigation with user menu button
2. Settings appear as modals on top of current page
3. User stays in context - no navigation away from current work
4. Maintain all existing functionality (account info, preferences)
5. Follow existing modal patterns and accessibility standards

## Current State Analysis

### Existing Patterns

**Modal Implementations:**
- `video-form-modal`: Uses Radix UI Dialog (@radix-ui/react-dialog)
- `create-channel-modal`: Custom modal with focus-trap utilities

**Decision**: Use Radix UI Dialog pattern (cleaner, more maintainable, better accessibility out-of-box)

**Settings Pages:**
- `/src/app/(app)/t/[teamspace]/settings/page.tsx` - Account info (read-only)
- `/src/app/(app)/t/[teamspace]/settings/preferences/page.tsx` - Preferences form with tRPC

**AppShell Structure:**
- Location: `/src/components/layout/app-shell/app-shell.tsx`
- Lines 136-156: "Account" nav item with children
- Lines 433-445: Sidebar footer with logout button

**Available Components:**
- Avatar component (`/src/components/ui/avatar/`)
- Button, Input, Select, RadioGroup (all in `/src/components/ui/`)
- Focus trap utilities (`/src/lib/accessibility/focus-trap`)

## Implementation Tasks

### 1. Create UserMenu Component

**File**: `/src/components/user-menu/user-menu.tsx`

**Requirements:**
- Small button/trigger with user avatar or icon
- Display user name/email (from auth context)
- Dropdown menu with options:
  - Account Settings (opens modal)
  - Preferences (opens modal)
  - Separator
  - Log Out (existing logout mutation)
- Use Radix UI DropdownMenu for accessibility
- Position: fits in AppShell sidebar footer
- Keyboard navigable (Tab, Arrow keys, Enter, Escape)

**Considerations:**
- Should it use Avatar component or just an icon (User from lucide-react)?
- Show user initials in avatar if avatar component is used
- Menu should close when modal opens
- Menu should stay open/accessible state for screen readers

**Dependencies:**
- `@radix-ui/react-dropdown-menu` (may need to install)
- User context from `validateRequest()` or similar
- Avatar component (optional)
- lucide-react icons

### 2. Create AccountSettingsModal Component

**File**: `/src/components/user-menu/account-settings-modal.tsx`

**Content from**: `/src/app/(app)/t/[teamspace]/settings/page.tsx`

**Requirements:**
- Modal using Radix UI Dialog (follow video-form-modal pattern)
- Form fields:
  - Name (editable)
  - Email (read-only or editable with verification)
  - User ID (read-only, maybe hide in UI)
- Future sections (placeholder/disabled):
  - Password change
  - Two-factor authentication
  - Active sessions
  - Security settings
- Validation with Zod schema
- tRPC mutation for updating account info
- Success/error feedback
- Unsaved changes warning (beforeunload + dialog close prevention)
- Loading states during save
- Form reset on cancel

**New tRPC Endpoints Needed:**
```typescript
// /src/server/trpc/routers/user.ts
updateAccount: protectedProcedure
  .input(z.object({
    name: z.string().min(1).max(255).optional(),
    // email: z.string().email().optional(), // Phase 2
  }))
  .mutation(async ({ ctx, input }) => {
    // Update user table
    // Return updated user
  })
```

**Considerations:**
- Email changes might require verification flow (out of scope for now)
- Password changes should be separate modal or section (out of scope)
- Match styling of existing modals

### 3. Create PreferencesModal Component

**File**: `/src/components/user-menu/preferences-modal.tsx`

**Content from**: `/src/app/(app)/t/[teamspace]/settings/preferences/page.tsx`

**Requirements:**
- Modal using Radix UI Dialog
- Same form fields as current preferences page:
  - Default Channel (Select dropdown)
  - Content Plan View Mode (RadioGroup: grid/table)
  - Date Format (Select: ISO/US/EU/UK)
  - Time Format (RadioGroup: 12h/24h)
- Use existing tRPC queries:
  - `user.getPreferences`
  - `user.getAvailableChannels`
- Use existing tRPC mutation:
  - `user.updatePreferences`
- Form state management with react-hook-form
- Unsaved changes warning
- Loading states
- Success/error feedback
- Form reset on cancel

**Considerations:**
- Reuse exact logic from preferences/page.tsx
- Same validation rules
- Same UI components (Select, RadioGroup from /src/components/ui)

### 4. Update AppShell Component

**File**: `/src/components/layout/app-shell/app-shell.tsx`

**Changes:**

1. **Remove Account Navigation** (lines 136-156)
   - Remove entire "Account" nav item and its children
   - Keep only channel-scoped items (Content Plan, Categories, Team, Channel Settings)

2. **Add UserMenu to Sidebar Footer** (after line 433)
   ```tsx
   <div className={styles.sidebarFooter}>
     <UserMenu /> {/* NEW */}
     <button
       type="button"
       className={styles.logoutButton}
       onClick={handleLogout}
       disabled={logoutMutation.isPending}
     >
       {/* ... existing logout button ... */}
     </button>
   </div>
   ```

   OR integrate logout into UserMenu and replace entire footer:
   ```tsx
   <div className={styles.sidebarFooter}>
     <UserMenu onLogout={handleLogout} isLoggingOut={logoutMutation.isPending} />
   </div>
   ```

3. **Add Modal State Management**
   - State for which modal is open (if not handled in UserMenu)
   - Render modals at AppShell level or in UserMenu

**Decision needed**: Should modals be rendered:
- Option A: Inside UserMenu component (encapsulated)
- Option B: At AppShell level (more flexible for future)

**Recommendation**: Option A (inside UserMenu) for better encapsulation

### 5. Handle Existing Settings Routes

**Options:**

**Option A - Redirect to home with modal**
- Keep routes but redirect to appropriate page with modal open
- Use URL query param to open modal (e.g., `?modal=account-settings`)
- Allows deep linking to settings

**Option B - Remove routes entirely**
- Delete `/src/app/(app)/t/[teamspace]/settings/` directory
- Any direct navigation shows 404
- Cleaner but breaks potential bookmarks

**Option C - Show deprecation notice**
- Replace pages with "Settings have moved" message
- Link to open modal
- Temporary during transition

**Recommendation**: Option A (redirect with modal) for better UX and deep linking

**Implementation:**
```tsx
// /src/app/(app)/t/[teamspace]/settings/page.tsx
export default async function SettingsPageRedirect({ params, searchParams }: Props) {
  const { teamspace } = await params;
  const effectiveTeamspace = teamspace ?? 'workspace';
  const channel = await getDefaultChannel(); // or first channel

  if (channel) {
    redirect(`/t/${effectiveTeamspace}/${channel.slug}/content-plan?modal=account-settings`);
  } else {
    redirect(`/t/${effectiveTeamspace}/settings?modal=account-settings`);
  }
}
```

### 6. Update Navigation Links

**Search for existing links to settings pages:**
```bash
grep -r "settings" --include="*.tsx" --include="*.ts" src/
```

**Update any hardcoded links to:**
- Open modal instead of navigate
- Or remove if no longer needed

## Dependencies to Install

Check if already installed, otherwise add:
```bash
npm install @radix-ui/react-dropdown-menu
```

Verify Radix UI Dialog is installed (used by video-form-modal):
```bash
grep "@radix-ui/react-dialog" package.json
```

## Styling Approach

1. **UserMenu**: New SCSS module (`user-menu.module.scss`)
   - Match AppShell sidebar footer styling
   - Dropdown menu styling (position, z-index, shadows)
   - User info display (avatar, name, email)

2. **Modals**: Follow existing modal patterns
   - Reuse styles from `video-form-modal.module.scss` where possible
   - Or create shared modal base styles
   - Form layouts match preferences page styling

## Accessibility Requirements

### UserMenu
- [ ] Keyboard navigable (Tab to button, Enter/Space to open, Arrow keys in menu)
- [ ] Focus trap in dropdown menu
- [ ] Escape closes menu
- [ ] ARIA attributes (`aria-haspopup`, `aria-expanded`, `role="menu"`)
- [ ] Screen reader announcements for menu state

### Modals
- [ ] Focus trap when open
- [ ] Escape closes modal (with unsaved warning)
- [ ] Focus returns to trigger on close
- [ ] ARIA attributes (`role="dialog"`, `aria-modal`, `aria-labelledby`)
- [ ] Form validation errors announced to screen readers
- [ ] Loading states announced

## Testing Strategy

### Unit Tests

**UserMenu Component** (`user-menu.test.tsx`)
- Renders user info correctly
- Opens/closes dropdown menu
- Calls modal open handlers
- Calls logout handler
- Keyboard navigation works

**AccountSettingsModal** (`account-settings-modal.test.tsx`)
- Renders form with user data
- Validates form input
- Submits form successfully
- Handles errors
- Warns on unsaved changes
- Resets form on cancel

**PreferencesModal** (`preferences-modal.test.tsx`)
- Renders form with preferences data
- Updates preferences successfully
- Handles channel loading
- Warns on unsaved changes
- Resets form on cancel

### Storybook Stories

**UserMenu** (`user-menu.stories.tsx`)
- Default state
- With different user names
- Dropdown open state
- Loading state during logout
- Different avatar scenarios

**AccountSettingsModal** (`account-settings-modal.stories.tsx`)
- Open with user data
- Loading state
- Error state
- Success state
- With unsaved changes

**PreferencesModal** (`preferences-modal.stories.tsx`)
- Open with preferences data
- Different view modes
- Different date/time formats
- No channels available
- Multiple channels

### E2E Tests (if needed)

- User opens menu and navigates to account settings
- User updates name and saves successfully
- User updates preferences and saves successfully
- Unsaved changes warning works
- Modals close on escape/cancel

## Implementation Order

1. **Phase 1: Component Creation** (Senior Developer)
   - Create UserMenu component with dropdown (no modals yet)
   - Create AccountSettingsModal component
   - Create PreferencesModal component
   - Add tRPC mutation for updating account

2. **Phase 2: Integration** (Senior Developer)
   - Update AppShell to use UserMenu
   - Remove Account navigation
   - Wire up modal opening from menu
   - Test integration

3. **Phase 3: Route Handling** (Lead Developer)
   - Update/redirect existing settings routes
   - Update any links to settings pages
   - Test navigation flows

4. **Phase 4: Styling & Polish** (Senior Developer)
   - Match existing design patterns
   - Responsive behavior
   - Animations/transitions
   - Error states

5. **Phase 5: Testing** (QA Architect)
   - Unit tests for all components
   - Storybook stories
   - Accessibility testing
   - Manual QA

6. **Phase 6: Code Review** (Code Quality Enforcer + Security Architect)
   - Code quality review
   - Security review (form validation, data handling)
   - Accessibility review
   - Final approval

## Success Criteria

- [ ] User can open user menu from sidebar footer
- [ ] User can access account settings via modal
- [ ] User can access preferences via modal
- [ ] User can update account name successfully
- [ ] User can update preferences successfully
- [ ] Modals have proper focus management
- [ ] Modals warn on unsaved changes
- [ ] Logout still works from user menu
- [ ] All accessibility requirements met
- [ ] No navigation away from current page
- [ ] Settings routes redirect appropriately
- [ ] Tests pass with good coverage
- [ ] Code review approved

## Risks & Mitigations

### Risk: Breaking existing links/bookmarks
**Mitigation**: Implement redirect strategy (Option A) to maintain compatibility

### Risk: Accessibility regressions
**Mitigation**: Follow existing modal patterns, use Radix UI, thorough testing

### Risk: State management complexity
**Mitigation**: Keep modals self-contained, use existing tRPC patterns

### Risk: Unsaved changes data loss
**Mitigation**: Implement beforeunload warning, prevent modal close on unsaved changes

### Risk: Modal z-index conflicts
**Mitigation**: Follow existing modal z-index patterns, test with all overlays

## Future Enhancements (Out of Scope)

- Password change functionality
- Email change with verification
- Two-factor authentication
- Active sessions management
- Account deletion
- Data export
- Profile photo upload
- API tokens management

## Questions for User (if any)

1. Should logout remain as separate button or be integrated into user menu dropdown?
2. Should email be editable in account settings (requires verification flow)?
3. Should we support deep linking to modals via URL parameters?
4. Any specific styling/design requirements for the user menu?

## Notes

- This is a pre-release project, so breaking changes are acceptable
- Focus on getting the pattern right, not backwards compatibility
- Prioritize accessibility and user experience
- Follow existing patterns (Radix UI, CSS Modules, tRPC)
