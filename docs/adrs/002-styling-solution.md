# ADR-002: Styling Solution

**Status**: Accepted
**Date**: 2025-12-08
**Deciders**: Strategic Project Planner, Lead Developer, QA Architect

## Context

Streamline Studio requires a styling solution for building a consistent, accessible, and maintainable UI at scale. Requirements:

1. **Scalability**: Must work well for a large application with many components
2. **Accessibility**: Support for WCAG 2.1 AA compliance (focus states, colour contrast, reduced motion)
3. **Theming**: Light/dark mode support, centralised design tokens
4. **Maintainability**: Clear separation of concerns, predictable cascade
5. **Performance**: Zero runtime, build-time CSS
6. **Server Components**: Compatible with Next.js App Router and React Server Components
7. **Modern CSS**: Leverage current CSS features without preprocessors where possible

The application includes complex UI elements: markdown editor, drag-and-drop kanban board, data tables, and form-heavy interfaces.

## Decision

### Primary: CSS Modules with Modern CSS

Use **CSS Modules** as the primary styling solution, leveraging modern CSS features:

- **CSS Custom Properties** for theming and design tokens
- **CSS Nesting** for cleaner selectors (native, no preprocessor)
- **CSS Container Queries** for component-responsive design
- **CSS `:has()` selector** for parent-aware styling
- **CSS `@layer`** for cascade management

### Theme System: Centralised Design Tokens

Create a **custom theme system** in the project root (`/styles/theme/`) that component modules consume and extend.

### Component Library: Radix UI Primitives

Use **Radix UI** primitives for accessible, unstyled components. Style them ourselves with CSS Modules.

## Browser Support

Target: **Current major browsers + last 2 versions**

| Feature           | Chrome     | Firefox    | Safari     | Edge       |
| ----------------- | ---------- | ---------- | ---------- | ---------- |
| CSS Nesting       | 120+       | 117+       | 17.2+      | 120+       |
| Container Queries | 105+       | 110+       | 16+        | 105+       |
| `:has()` selector | 105+       | 121+       | 15.4+      | 105+       |
| `@layer`          | 99+        | 97+        | 15.4+      | 99+        |
| Custom Properties | All modern | All modern | All modern | All modern |

All features have **baseline support since 2023-2024** and are safe for production use.

## Consequences

### Positive

- **Scalability**: CSS Modules enforce component-scoped styles, preventing cascade conflicts at scale
- **Zero runtime**: All CSS generated at build time
- **Standard CSS**: No proprietary syntax to learn; developers can use familiar CSS
- **Full CSS power**: Access to all CSS features (animations, grid, container queries)
- **Centralised theming**: Single source of truth for design tokens
- **Server Component compatible**: No client-side JavaScript for styles
- **IDE support**: Full CSS IntelliSense in `.module.css` files
- **Debuggable**: Generated class names map back to source in dev tools
- **Future-proof**: Standard CSS will always be supported

### Negative

- **More files**: Each component has an associated `.module.css` file
- **No pre-built components**: Must style Radix UI primitives ourselves (or build component library)
- **Manual responsive design**: Must write media queries (no utility shorthand)
- **Class name management**: Requires composing class names in components
- **Build-your-own design system**: No default constraints like Tailwind provides

## Alternatives Considered

### Tailwind CSS

**Pros:**

- Rapid prototyping with utility classes
- Large ecosystem (shadcn/ui)
- Built-in design constraints

**Cons:**

- **Scalability concerns**: Utility classes lead to verbose HTML that becomes hard to maintain in large applications
- **Abstraction over CSS**: Team must learn Tailwind's utility vocabulary instead of CSS
- **Escape hatch complexity**: Custom styling requires `@apply` or arbitrary values
- **Design system lock-in**: Difficult to deviate from Tailwind's conventions
- **Readability at scale**: Components with 20+ classes become difficult to reason about

### styled-components / Emotion

**Pros:**

- Component-scoped styles
- Dynamic styling via props

**Cons:**

- **Runtime overhead**: Styles computed at runtime
- **Server Component incompatible**: Requires 'use client' directive
- **Hydration issues**: SSR/CSR mismatches possible

### vanilla-extract

**Pros:**

- Type-safe styles
- Zero runtime

**Cons:**

- Smaller ecosystem
- Additional build configuration
- Custom API to learn

## Discussion

### Strategic Project Planner

"This is a large application that will grow significantly. I want to challenge the Tailwind assumption. While Tailwind is excellent for rapid prototyping, I've seen scaling issues:

1. **HTML verbosity**: Components end up with dozens of utility classes, making JSX hard to read
2. **Inconsistent overrides**: Developers use arbitrary values (`w-[347px]`) breaking design system consistency
3. **Difficult refactoring**: Changing a design token means find-replace across hundreds of files
4. **CSS knowledge atrophy**: Developers become dependent on Tailwind utilities and forget underlying CSS

For an application we'll maintain for years, I believe CSS Modules with a proper theme system will be more maintainable."

### Lead Developer

"I hear the concerns. Let me steelman both approaches.

**Tailwind strengths for our use case:**

- shadcn/ui gives us pre-built components
- Fast iteration on UI during MVP phase
- Consistent spacing/colour scales by default

**CSS Modules strengths for our use case:**

- True component encapsulation
- No class name conflicts at any scale
- Can use any CSS feature directly
- Centralised theme changes propagate automatically

Given this will be a large, long-lived application, I'm persuaded by the CSS Modules argument. But we need to invest in a proper theme system upfront."

### QA Architect

"What about accessibility? Tailwind has utilities like `sr-only`, `focus-visible:ring-2`, and `motion-reduce:`. How do we handle these with CSS Modules?"

### Lead Developer (Response)

"We'll create equivalent utilities in our theme system. Modern CSS makes this straightforward:

```css
/* styles/theme/accessibility.css */

/* Screen reader only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Focus visible ring */
.focus-ring {
  &:focus-visible {
    outline: 2px solid var(--color-ring);
    outline-offset: 2px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .reduce-motion {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Components import these as needed, or we can apply global reduced-motion handling."

### Strategic Project Planner

"How do we structure the theme system?"

### Lead Developer (Response)

"I propose a layered architecture:

```
/styles/
  /theme/
    tokens.css          # Design tokens (colours, spacing, typography)
    reset.css           # CSS reset (modern-normalize or custom)
    base.css            # Base element styles
    accessibility.css   # A11y utilities
    animations.css      # Keyframes and animation utilities
    index.css           # Imports all theme files
  /utils/
    layout.css          # Layout utilities (if needed)
    spacing.css         # Spacing utilities (if needed)
  globals.css           # Imports theme, any global styles
```

Components then import their own modules:

```
/components/
  /Button/
    Button.tsx
    Button.module.css   # Consumes theme tokens via var()
    Button.test.tsx
    Button.stories.tsx
```

The theme tokens are CSS custom properties, so any component can use them:

````css
/* Button.module.css */
.button {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-medium);

  &:hover {
    background: var(--color-primary-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--color-ring);
    outline-offset: 2px;
  }
}
```"

### QA Architect

"What about the modern CSS features? Are we confident about browser support?"

### Lead Developer (Response)

"Yes. Let me break down the support:

**CSS Nesting** ([caniuse.com/css-nesting](https://caniuse.com/css-nesting)):
- Baseline since December 2023
- Chrome 120+, Firefox 117+, Safari 17.2+, Edge 120+
- We can use `&` nesting without a preprocessor

**Container Queries** ([caniuse.com/css-container-queries](https://caniuse.com/css-container-queries)):
- Baseline since February 2023
- Chrome 105+, Firefox 110+, Safari 16+, Edge 105+
- Perfect for component-responsive design

**`:has()` selector** ([caniuse.com/css-has](https://caniuse.com/css-has)):
- Baseline since December 2023
- Chrome 105+, Firefox 121+, Safari 15.4+, Edge 105+
- Enables parent-aware styling without JavaScript

**`@layer`** for cascade management:
- Baseline since March 2022
- Universally supported

Our browser target of 'current + last 2 versions' is well covered. We'll add a browserslist config:

```json
{
  \"browserslist\": [
    \"last 2 Chrome versions\",
    \"last 2 Firefox versions\",
    \"last 2 Safari versions\",
    \"last 2 Edge versions\"
  ]
}
```"

### Strategic Project Planner

"How do we handle Radix UI primitives without shadcn/ui?"

### Lead Developer (Response)

"Radix UI provides unstyled, accessible primitives. We style them ourselves:

```tsx
// components/Dialog/Dialog.tsx
import * as DialogPrimitive from '@radix-ui/react-dialog';
import styles from './Dialog.module.css';

export const Dialog = DialogPrimitive.Root;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className={styles.overlay} />
    <DialogPrimitive.Content
      ref={ref}
      className={styles.content}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
````

```css
/* Dialog.module.css */
.overlay {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  animation: fadeIn var(--duration-normal) var(--ease-out);
}

.content {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-6);
  box-shadow: var(--shadow-lg);
  animation: slideIn var(--duration-normal) var(--ease-out);

  &:focus {
    outline: none;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translate(-50%, -48%) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
```

We build up a component library over time. Yes, it's more upfront work than shadcn/ui, but we have full control and no framework lock-in."

### QA Architect

"What about dark mode?"

### Lead Developer (Response)

"CSS custom properties make dark mode trivial:

```css
/* tokens.css */
:root {
  --color-background: hsl(0 0% 100%);
  --color-foreground: hsl(222 84% 5%);
  --color-primary: hsl(222 47% 11%);
  /* ... */
}

:root[data-theme='dark'] {
  --color-background: hsl(222 84% 5%);
  --color-foreground: hsl(210 40% 98%);
  --color-primary: hsl(210 40% 98%);
  /* ... */
}

/* Respect system preference by default */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    --color-background: hsl(222 84% 5%);
    /* ... dark values */
  }
}
```

Components don't need to know about themes - they just use `var(--color-background)` and it works."

### Strategic Project Planner (Conclusion)

"Decision: **CSS Modules with a centralised theme system**.

Key implementation points:

1. Theme tokens in `/styles/theme/tokens.css` using CSS custom properties
2. Modern CSS features: nesting, container queries, `:has()`
3. Components consume tokens via `var()` references
4. Radix UI primitives for accessible component foundations
5. Browser target: current + last 2 versions (all features supported)

This approach scales well, maintains separation of concerns, and gives us full control over our design system."

## Implementation Notes

### Directory Structure

```
/styles/
  /theme/
    tokens.css          # Design tokens
    reset.css           # CSS reset
    base.css            # Base element styles
    accessibility.css   # A11y utilities
    animations.css      # Keyframes
    index.css           # Barrel import
  globals.css           # Main entry point

/src/
  /components/
    /Button/
      Button.tsx
      Button.module.css
      index.ts
```

### Theme Tokens (`/styles/theme/tokens.css`)

```css
/**
 * Streamline Studio Design Tokens
 *
 * This file defines all design tokens as CSS custom properties.
 * Components consume these via var() references.
 *
 * Naming convention:
 * --{category}-{property}-{variant}
 * e.g., --color-primary-hover, --spacing-4, --radius-lg
 */

@layer tokens {
  :root {
    /* ============================================
       COLOURS
       ============================================ */

    /* Semantic colours */
    --color-background: hsl(0 0% 100%);
    --color-foreground: hsl(222 84% 4.9%);
    --color-surface: hsl(0 0% 100%);
    --color-surface-raised: hsl(0 0% 98%);

    /* Primary */
    --color-primary: hsl(222 47% 11%);
    --color-primary-hover: hsl(222 47% 20%);
    --color-primary-foreground: hsl(210 40% 98%);

    /* Secondary */
    --color-secondary: hsl(210 40% 96%);
    --color-secondary-hover: hsl(210 40% 90%);
    --color-secondary-foreground: hsl(222 47% 11%);

    /* Destructive */
    --color-destructive: hsl(0 84% 60%);
    --color-destructive-hover: hsl(0 84% 50%);
    --color-destructive-foreground: hsl(0 0% 100%);

    /* Muted */
    --color-muted: hsl(210 40% 96%);
    --color-muted-foreground: hsl(215 16% 47%);

    /* Accent */
    --color-accent: hsl(210 40% 96%);
    --color-accent-foreground: hsl(222 47% 11%);

    /* Border & Input */
    --color-border: hsl(214 32% 91%);
    --color-input: hsl(214 32% 91%);
    --color-ring: hsl(222 84% 4.9%);

    /* Overlay */
    --color-overlay: hsl(0 0% 0% / 0.5);

    /* Status colours */
    --color-success: hsl(142 76% 36%);
    --color-success-foreground: hsl(0 0% 100%);
    --color-warning: hsl(38 92% 50%);
    --color-warning-foreground: hsl(0 0% 0%);
    --color-error: hsl(0 84% 60%);
    --color-error-foreground: hsl(0 0% 100%);
    --color-info: hsl(199 89% 48%);
    --color-info-foreground: hsl(0 0% 100%);

    /* ============================================
       SPACING
       ============================================ */
    --spacing-0: 0;
    --spacing-px: 1px;
    --spacing-0-5: 0.125rem; /* 2px */
    --spacing-1: 0.25rem; /* 4px */
    --spacing-1-5: 0.375rem; /* 6px */
    --spacing-2: 0.5rem; /* 8px */
    --spacing-2-5: 0.625rem; /* 10px */
    --spacing-3: 0.75rem; /* 12px */
    --spacing-3-5: 0.875rem; /* 14px */
    --spacing-4: 1rem; /* 16px */
    --spacing-5: 1.25rem; /* 20px */
    --spacing-6: 1.5rem; /* 24px */
    --spacing-7: 1.75rem; /* 28px */
    --spacing-8: 2rem; /* 32px */
    --spacing-9: 2.25rem; /* 36px */
    --spacing-10: 2.5rem; /* 40px */
    --spacing-12: 3rem; /* 48px */
    --spacing-14: 3.5rem; /* 56px */
    --spacing-16: 4rem; /* 64px */
    --spacing-20: 5rem; /* 80px */
    --spacing-24: 6rem; /* 96px */

    /* ============================================
       TYPOGRAPHY
       ============================================ */

    /* Font families */
    --font-sans:
      system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      'Helvetica Neue', Arial, sans-serif;
    --font-mono:
      ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas,
      'Liberation Mono', monospace;

    /* Font sizes */
    --font-size-xs: 0.75rem; /* 12px */
    --font-size-sm: 0.875rem; /* 14px */
    --font-size-base: 1rem; /* 16px */
    --font-size-lg: 1.125rem; /* 18px */
    --font-size-xl: 1.25rem; /* 20px */
    --font-size-2xl: 1.5rem; /* 24px */
    --font-size-3xl: 1.875rem; /* 30px */
    --font-size-4xl: 2.25rem; /* 36px */

    /* Line heights */
    --line-height-none: 1;
    --line-height-tight: 1.25;
    --line-height-snug: 1.375;
    --line-height-normal: 1.5;
    --line-height-relaxed: 1.625;
    --line-height-loose: 2;

    /* Font weights */
    --font-weight-normal: 400;
    --font-weight-medium: 500;
    --font-weight-semibold: 600;
    --font-weight-bold: 700;

    /* Letter spacing */
    --letter-spacing-tighter: -0.05em;
    --letter-spacing-tight: -0.025em;
    --letter-spacing-normal: 0;
    --letter-spacing-wide: 0.025em;
    --letter-spacing-wider: 0.05em;

    /* ============================================
       BORDERS & RADIUS
       ============================================ */
    --radius-none: 0;
    --radius-sm: 0.125rem; /* 2px */
    --radius-md: 0.375rem; /* 6px */
    --radius-lg: 0.5rem; /* 8px */
    --radius-xl: 0.75rem; /* 12px */
    --radius-2xl: 1rem; /* 16px */
    --radius-full: 9999px;

    --border-width-thin: 1px;
    --border-width-medium: 2px;
    --border-width-thick: 4px;

    /* ============================================
       SHADOWS
       ============================================ */
    --shadow-sm: 0 1px 2px 0 hsl(0 0% 0% / 0.05);
    --shadow-md:
      0 4px 6px -1px hsl(0 0% 0% / 0.1), 0 2px 4px -2px hsl(0 0% 0% / 0.1);
    --shadow-lg:
      0 10px 15px -3px hsl(0 0% 0% / 0.1), 0 4px 6px -4px hsl(0 0% 0% / 0.1);
    --shadow-xl:
      0 20px 25px -5px hsl(0 0% 0% / 0.1), 0 8px 10px -6px hsl(0 0% 0% / 0.1);

    /* ============================================
       TRANSITIONS
       ============================================ */
    --duration-fast: 150ms;
    --duration-normal: 200ms;
    --duration-slow: 300ms;
    --duration-slower: 500ms;

    --ease-in: cubic-bezier(0.4, 0, 1, 1);
    --ease-out: cubic-bezier(0, 0, 0.2, 1);
    --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);

    /* ============================================
       Z-INDEX SCALE
       ============================================ */
    --z-dropdown: 50;
    --z-sticky: 100;
    --z-fixed: 200;
    --z-modal-backdrop: 300;
    --z-modal: 400;
    --z-popover: 500;
    --z-tooltip: 600;

    /* ============================================
       BREAKPOINTS (for reference in JS)
       ============================================ */
    --breakpoint-sm: 640px;
    --breakpoint-md: 768px;
    --breakpoint-lg: 1024px;
    --breakpoint-xl: 1280px;
    --breakpoint-2xl: 1536px;
  }

  /* ============================================
     DARK THEME
     ============================================ */
  :root[data-theme='dark'] {
    --color-background: hsl(222 84% 4.9%);
    --color-foreground: hsl(210 40% 98%);
    --color-surface: hsl(222 84% 4.9%);
    --color-surface-raised: hsl(217 33% 10%);

    --color-primary: hsl(210 40% 98%);
    --color-primary-hover: hsl(210 40% 90%);
    --color-primary-foreground: hsl(222 47% 11%);

    --color-secondary: hsl(217 33% 17%);
    --color-secondary-hover: hsl(217 33% 25%);
    --color-secondary-foreground: hsl(210 40% 98%);

    --color-destructive: hsl(0 63% 31%);
    --color-destructive-hover: hsl(0 63% 40%);
    --color-destructive-foreground: hsl(210 40% 98%);

    --color-muted: hsl(217 33% 17%);
    --color-muted-foreground: hsl(215 20% 65%);

    --color-accent: hsl(217 33% 17%);
    --color-accent-foreground: hsl(210 40% 98%);

    --color-border: hsl(217 33% 17%);
    --color-input: hsl(217 33% 17%);
    --color-ring: hsl(212 27% 84%);

    --color-overlay: hsl(0 0% 0% / 0.7);
  }

  /* Respect system preference when no explicit theme set */
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme='light']) {
      --color-background: hsl(222 84% 4.9%);
      --color-foreground: hsl(210 40% 98%);
      --color-surface: hsl(222 84% 4.9%);
      --color-surface-raised: hsl(217 33% 10%);
      --color-primary: hsl(210 40% 98%);
      --color-primary-hover: hsl(210 40% 90%);
      --color-primary-foreground: hsl(222 47% 11%);
      --color-secondary: hsl(217 33% 17%);
      --color-secondary-hover: hsl(217 33% 25%);
      --color-secondary-foreground: hsl(210 40% 98%);
      --color-muted: hsl(217 33% 17%);
      --color-muted-foreground: hsl(215 20% 65%);
      --color-border: hsl(217 33% 17%);
      --color-input: hsl(217 33% 17%);
      --color-ring: hsl(212 27% 84%);
      --color-overlay: hsl(0 0% 0% / 0.7);
    }
  }
}
```

### Accessibility Utilities (`/styles/theme/accessibility.css`)

```css
@layer utilities {
  /* Screen reader only - visually hidden but accessible */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  /* Not screen reader only - reverses sr-only */
  .not-sr-only {
    position: static;
    width: auto;
    height: auto;
    padding: 0;
    margin: 0;
    overflow: visible;
    clip: auto;
    white-space: normal;
  }

  /* Focus ring utility */
  .focus-ring {
    &:focus-visible {
      outline: 2px solid var(--color-ring);
      outline-offset: 2px;
    }
  }

  /* Focus within ring (for parent elements) */
  .focus-within-ring {
    &:focus-within {
      outline: 2px solid var(--color-ring);
      outline-offset: 2px;
    }
  }
}

/* Global reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Example Component (`Button.module.css`)

```css
/**
 * Button Component Styles
 *
 * Uses CSS nesting, custom properties from theme,
 * and container queries for responsive behaviour.
 */

.button {
  /* Base styles */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-none);
  transition:
    background-color var(--duration-fast) var(--ease-in-out),
    color var(--duration-fast) var(--ease-in-out),
    box-shadow var(--duration-fast) var(--ease-in-out);
  cursor: pointer;

  /* Focus state */
  &:focus-visible {
    outline: 2px solid var(--color-ring);
    outline-offset: 2px;
  }

  /* Disabled state */
  &:disabled {
    opacity: 0.5;
    pointer-events: none;
  }
}

/* Size variants */
.sizeSmall {
  height: 2rem;
  padding-inline: var(--spacing-3);
  font-size: var(--font-size-xs);
}

.sizeMedium {
  height: 2.5rem;
  padding-inline: var(--spacing-4);
}

.sizeLarge {
  height: 2.75rem;
  padding-inline: var(--spacing-6);
  font-size: var(--font-size-base);
}

/* Variant styles */
.variantPrimary {
  background: var(--color-primary);
  color: var(--color-primary-foreground);

  &:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }
}

.variantSecondary {
  background: var(--color-secondary);
  color: var(--color-secondary-foreground);

  &:hover:not(:disabled) {
    background: var(--color-secondary-hover);
  }
}

.variantDestructive {
  background: var(--color-destructive);
  color: var(--color-destructive-foreground);

  &:hover:not(:disabled) {
    background: var(--color-destructive-hover);
  }
}

.variantOutline {
  background: transparent;
  color: var(--color-foreground);
  border: var(--border-width-thin) solid var(--color-border);

  &:hover:not(:disabled) {
    background: var(--color-accent);
    color: var(--color-accent-foreground);
  }
}

.variantGhost {
  background: transparent;
  color: var(--color-foreground);

  &:hover:not(:disabled) {
    background: var(--color-accent);
    color: var(--color-accent-foreground);
  }
}

/* Icon-only button */
.iconOnly {
  padding: 0;
  aspect-ratio: 1;
}
```

### Example Component (`Button.tsx`)

```tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'ghost';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: styles.variantPrimary,
  secondary: styles.variantSecondary,
  destructive: styles.variantDestructive,
  outline: styles.variantOutline,
  ghost: styles.variantGhost,
};

const sizeClasses: Record<ButtonSize, string> = {
  small: styles.sizeSmall,
  medium: styles.sizeMedium,
  large: styles.sizeLarge,
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'medium',
      iconOnly,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const classes = [
      styles.button,
      variantClasses[variant],
      sizeClasses[size],
      iconOnly && styles.iconOnly,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

### PostCSS Configuration

```javascript
// postcss.config.js
module.exports = {
  plugins: {
    'postcss-nesting': {}, // Enables CSS nesting for older browsers if needed
    autoprefixer: {},
  },
};
```

### Browserslist Configuration

```json
// package.json or .browserslistrc
{
  "browserslist": [
    "last 2 Chrome versions",
    "last 2 Firefox versions",
    "last 2 Safari versions",
    "last 2 Edge versions",
    "not dead"
  ]
}
```

### Key Dependencies

```json
{
  "dependencies": {
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@radix-ui/react-tabs": "^1.0.4"
  },
  "devDependencies": {
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.33",
    "postcss-nesting": "^12.0.2"
  }
}
```

## Sources

- [CSS Container Queries](https://caniuse.com/css-container-queries) - Browser support
- [CSS Nesting](https://caniuse.com/css-nesting) - Browser support
- [:has() CSS selector](https://caniuse.com/css-has) - Browser support
