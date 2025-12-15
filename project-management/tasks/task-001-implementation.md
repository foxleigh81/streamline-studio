# Task 001: Account Management Implementation

**Assignee:** senior-nextjs-developer
**Status:** Ready to Start
**Priority:** High
**Created:** 2025-12-13
**Updated:** 2025-12-13 - User decision on avatar approach

## Objective

Implement account management features and branding integration for Streamline Studio.

## Requirements

### 1. Avatar Component (NEW - Priority)

Create reusable Avatar component at `/src/components/ui/avatar/`:

**Props Interface:**

```typescript
interface AvatarProps {
  name?: string;
  email?: string;
  src?: string; // For future image upload support
  size?: 'sm' | 'md' | 'lg';
  alt?: string;
}
```

**Display Logic (Priority Order):**

1. If `src` exists: Display image element with alt text
2. If `name` exists: Generate initials (first letter of each word, max 2 letters)
   - Example: "John Doe" → "JD", "Alice" → "AL"
3. If `email` exists: Use first 2 characters uppercase
   - Example: "john@example.com" → "JO"
4. Fallback: Display "?" or generic user icon

**Background Color:**

- Generate consistent color from hash of name/email
- Use predefined palette with WCAG AA contrast
- Same user always gets same color

**Size Variants:**

- `sm`: 32px (navigation, lists)
- `md`: 48px (default, profile)
- `lg`: 96px (settings page)

**Accessibility:**

- Image variant: Use provided `alt` or generate from name
- Initials variant: `role="img"` with `aria-label="Avatar for {name}"`
- Ensure color contrast meets WCAG 2.1 AA

### 2. Account Settings Route

Create account settings page at `/w/[slug]/settings/account` with:

- Password change form
- Name editing form
- Avatar component displaying current user (using new Avatar component)

### 3. tRPC API Routes

Implement in a new `user` router or extend `auth` router:

- `updatePassword` mutation (requires current password verification)
- `updateProfile` mutation (name updates)

NOTE: Avatar upload is deferred - no `updateAvatar` mutation needed yet.

### 4. UI Components

Build components following existing patterns:

- `Avatar` component (see above) - WCAG compliant, reusable
- `PasswordChangeForm` - current password + new password + confirmation
- `ProfileEditForm` - name editing with Avatar display

### 5. Branding Integration

- Update AppShell to include logo in navigation
- Configure favicon to use `/public/streamline-studio-icon.png`
- Ensure responsive logo display (full logo on desktop, icon on mobile)

## Technical Constraints

- Use CSS Modules (SCSS) - NO Tailwind
- Follow WorkspaceRepository pattern for data access
- Use Zod schemas for validation
- Implement proper error boundaries
- All forms must have proper TypeScript types
- Password changes must use Argon2id hashing (existing pattern)

## Dependencies

- No database migration needed (users table already has `name` field)
- No external storage or upload dependencies

## Acceptance Criteria

1. Avatar component displays user initials with consistent colors
2. Avatar component accepts `src` prop for future image support
3. Avatar component is WCAG 2.1 AA compliant
4. Users can change their password with current password verification
5. Users can update their display name
6. Logo appears in navigation header
7. Favicon is set correctly
8. All forms have proper validation and error handling
9. All components have proper TypeScript types
10. Code follows existing patterns and conventions
11. Avatar component has Storybook stories showing all variants

## Security Considerations

- Password change requires current password
- Rate limiting on password change endpoint
- CSRF protection on all forms (via tRPC)
- No sensitive data in client-side state
- Password hashing uses existing Argon2id pattern

## Files to Create/Modify

**Create:**

- `/src/components/ui/avatar/avatar.tsx` - Avatar component
- `/src/components/ui/avatar/avatar.module.scss` - Avatar styles
- `/src/components/ui/avatar/avatar.stories.tsx` - Storybook stories
- `/src/components/ui/avatar/avatar.test.tsx` - Unit tests
- `/src/components/ui/avatar/index.ts` - Barrel export
- `/src/app/(app)/w/[slug]/settings/account/page.tsx` - Settings page
- `/src/app/(app)/w/[slug]/settings/account/loading.tsx` - Loading state
- `/src/app/(app)/w/[slug]/settings/account/error.tsx` - Error boundary
- `/src/server/trpc/routers/user.ts` - User router (or extend auth.ts)
- `/src/components/account/password-change-form/password-change-form.tsx`
- `/src/components/account/password-change-form/password-change-form.module.scss`
- `/src/components/account/password-change-form/password-change-form.stories.tsx`
- `/src/components/account/password-change-form/index.ts`
- `/src/components/account/profile-edit-form/profile-edit-form.tsx`
- `/src/components/account/profile-edit-form/profile-edit-form.module.scss`
- `/src/components/account/profile-edit-form/profile-edit-form.stories.tsx`
- `/src/components/account/profile-edit-form/index.ts`

**Modify:**

- `/src/components/layout/app-shell/app-shell.tsx` - Add logo to navigation
- `/src/app/layout.tsx` - Configure favicon
- `/src/server/trpc/router.ts` - Register user router

## Implementation Notes

### Avatar Component Algorithm

**Initials Generation:**

```typescript
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}
```

**Color Generation:**

```typescript
function getColorFromString(str: string): string {
  // Hash string to number
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Map to color palette (predefined WCAG AA compliant colors)
  const colors = [
    '#1E40AF',
    '#7C3AED',
    '#DB2777',
    '#DC2626',
    '#EA580C',
    '#D97706',
    '#65A30D',
    '#059669',
    '#0891B2',
    '#4F46E5',
  ];

  return colors[Math.abs(hash) % colors.length];
}
```

### General Notes

- Ensure forms are accessible (ARIA labels, error announcements, focus management)
- Add success notifications after updates (use toast or inline message)
- Logo files are already in `/public/` directory
- Check existing Button and Input components for consistent form styling
- Avatar component should be generic enough for reuse (team member lists, etc.)
- Consider adding loading states during password change mutation
