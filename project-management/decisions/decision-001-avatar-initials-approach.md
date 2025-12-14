# Decision 001: Avatar Initials Approach

**Date:** 2025-12-13
**Status:** Approved
**Decider:** User
**Impact:** Medium

## Context

Account management features require user avatar display, but implementing full image upload adds complexity, storage considerations, and security review scope.

## Decision

Implement an Avatar component that displays user initials as the primary approach, with built-in support for future image upload via an optional `src` prop.

## Implementation Details

### Avatar Component Specification

**Location:** `/src/components/ui/avatar/`

**Props Interface:**

```typescript
interface AvatarProps {
  name?: string;
  email?: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  alt?: string;
}
```

**Display Logic (Priority Order):**

1. If `src` exists: Display image with proper alt text
2. If `name` exists: Generate initials (first letter of each word, max 2)
3. If `email` exists: Use first 2 characters in uppercase
4. Fallback: Display "?" or generic icon

**Background Color Algorithm:**

- Hash the name or email deterministically
- Map hash to a color from a predefined palette
- Ensure sufficient contrast (WCAG 2.1 AA)
- Same user always gets same color

**Size Variants:**

- `sm`: 32px × 32px (for navigation, lists)
- `md`: 48px × 48px (default, for profile)
- `lg`: 96px × 96px (for settings page, profile view)

### Accessibility Requirements

- Image variant: `alt` text describes the user
- Initials variant: `role="img"` with `aria-label="Avatar for {name}"`
- Sufficient color contrast on all background colors
- Circular shape with proper border/shadow for definition

## Consequences

### Positive

- **Immediate delivery**: No storage infrastructure needed
- **Professional appearance**: Initials look polished and modern
- **Future-proof**: Adding image upload requires no component changes
- **Consistent UX**: Same user always has same color avatar
- **Accessibility**: Can be made fully WCAG compliant
- **Performance**: No image loading/optimization needed initially
- **Privacy-friendly**: No uploaded images to manage/secure

### Negative

- **Limited personalization**: Users can't upload photos initially
- **Similar initials**: Multiple users with same initials get same appearance (mitigated by color)
- **Future work**: Will still need to implement upload later

### Neutral

- **No database changes**: Can proceed without migration
- **Testing scope**: Simpler testing (no file upload edge cases)
- **Security**: Reduced attack surface for this phase

## Alternatives Considered

1. **Immediate image upload with local storage**: Adds complexity and security concerns
2. **No avatar at all**: Unprofessional appearance
3. **Random/generic avatars**: Less personal than initials

## References

- Clarification 001: Avatar Storage Strategy
- Task 001: Implementation specification
- Industry examples: Gmail, GitHub (both use initials as fallbacks)

## Future Considerations

When implementing image upload in a future phase:

- Recommend local file storage for self-hosted alignment
- Component already supports `src` prop - just pass the URL
- Consider adding image cropping/resizing UI
- Add security review for file upload (type validation, size limits, storage security)
