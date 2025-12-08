# Streamline Studio Theme System

This document describes how to use, extend, and customise the Streamline Studio theme system.

## Overview

The theme system is built on **CSS Custom Properties** (CSS Variables) with a layered architecture using `@layer` for cascade management. It follows the patterns established in ADR-002.

### Core Principles

1. **CSS Custom Properties** for all design tokens
2. **Layer-based cascade** for predictable specificity
3. **Dark mode support** via `data-theme` attribute and system preference
4. **Extensible** - create new themes by overriding variables
5. **Accessible** - WCAG 2.1 AA compliant utilities included

## File Structure

```
src/themes/
├── default/                 # Default YouTube Studio-inspired theme
│   ├── index.css           # Main entry point (import this)
│   ├── _tokens.css         # Design tokens (colours, spacing, typography)
│   ├── _dark-mode.css      # Dark mode colour overrides
│   ├── _reset.css          # CSS reset
│   ├── _animations.css     # Keyframe animations
│   └── _accessibility.css  # A11y utilities
├── [custom-theme]/         # Your custom theme (extends default)
│   └── index.css
└── README.md               # This documentation
```

## Usage

### Basic Integration (Next.js App Router)

```tsx
// app/layout.tsx
import '@/themes/default/index.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### Using Theme Variables in CSS Modules

```css
/* Button.module.css */
.button {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-medium);
  transition: background-color var(--duration-fast) var(--ease-in-out);

  &:hover {
    background: var(--color-primary-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--color-ring);
    outline-offset: 2px;
  }
}
```

## Design Tokens Reference

### Colours

#### Semantic Colours (use these in components)

| Variable                     | Light Mode | Dark Mode | Usage                  |
| ---------------------------- | ---------- | --------- | ---------------------- |
| `--color-background`         | White      | Grey 900  | Page background        |
| `--color-surface`            | White      | Grey 800  | Card/panel backgrounds |
| `--color-surface-raised`     | Grey 50    | Grey 700  | Elevated surfaces      |
| `--color-foreground`         | Grey 800   | Grey 50   | Primary text           |
| `--color-foreground-muted`   | Grey 500   | Grey 400  | Secondary text         |
| `--color-primary`            | Red 500    | Red 500   | Primary actions        |
| `--color-primary-hover`      | Red 600    | Red 400   | Primary hover state    |
| `--color-primary-foreground` | White      | White     | Text on primary        |
| `--color-secondary`          | Grey 100   | Grey 700  | Secondary actions      |
| `--color-border`             | Grey 200   | Grey 600  | Borders                |
| `--color-ring`               | Red 500    | Red 400   | Focus indicators       |

#### Status Colours

| Variable              | Usage                         |
| --------------------- | ----------------------------- |
| `--color-success`     | Success states, confirmations |
| `--color-warning`     | Warnings, cautions            |
| `--color-destructive` | Errors, destructive actions   |
| `--color-info`        | Informational messages        |

### Spacing Scale

| Variable       | Value   | Pixels |
| -------------- | ------- | ------ |
| `--spacing-0`  | 0       | 0      |
| `--spacing-1`  | 0.25rem | 4px    |
| `--spacing-2`  | 0.5rem  | 8px    |
| `--spacing-3`  | 0.75rem | 12px   |
| `--spacing-4`  | 1rem    | 16px   |
| `--spacing-5`  | 1.25rem | 20px   |
| `--spacing-6`  | 1.5rem  | 24px   |
| `--spacing-8`  | 2rem    | 32px   |
| `--spacing-10` | 2.5rem  | 40px   |
| `--spacing-12` | 3rem    | 48px   |
| `--spacing-16` | 4rem    | 64px   |

### Typography

#### Font Sizes

| Variable           | Value    | Use Case         |
| ------------------ | -------- | ---------------- |
| `--font-size-xs`   | 0.75rem  | Captions, labels |
| `--font-size-sm`   | 0.875rem | Small text       |
| `--font-size-base` | 1rem     | Body text        |
| `--font-size-lg`   | 1.125rem | Slightly larger  |
| `--font-size-xl`   | 1.25rem  | Small headings   |
| `--font-size-2xl`  | 1.5rem   | Headings         |
| `--font-size-3xl`  | 1.875rem | Large headings   |
| `--font-size-4xl`  | 2.25rem  | Page titles      |

#### Font Weights

| Variable                 | Value |
| ------------------------ | ----- |
| `--font-weight-normal`   | 400   |
| `--font-weight-medium`   | 500   |
| `--font-weight-semibold` | 600   |
| `--font-weight-bold`     | 700   |

### Border Radius

| Variable        | Value    | Use Case        |
| --------------- | -------- | --------------- |
| `--radius-sm`   | 0.125rem | Subtle rounding |
| `--radius-md`   | 0.25rem  | Default buttons |
| `--radius-lg`   | 0.5rem   | Cards, panels   |
| `--radius-xl`   | 0.75rem  | Large cards     |
| `--radius-full` | 9999px   | Pills, avatars  |

### Shadows

| Variable       | Use Case         |
| -------------- | ---------------- |
| `--shadow-xs`  | Subtle elevation |
| `--shadow-sm`  | Buttons, inputs  |
| `--shadow-md`  | Cards            |
| `--shadow-lg`  | Dropdowns        |
| `--shadow-xl`  | Modals           |
| `--shadow-2xl` | Popovers         |

### Transitions

| Variable              | Value | Use Case          |
| --------------------- | ----- | ----------------- |
| `--duration-fast`     | 100ms | Hover states      |
| `--duration-normal`   | 150ms | Most interactions |
| `--duration-moderate` | 200ms | Panel transitions |
| `--duration-slow`     | 300ms | Page transitions  |

| Variable        | Value            |
| --------------- | ---------------- |
| `--ease-in`     | Acceleration     |
| `--ease-out`    | Deceleration     |
| `--ease-in-out` | Smooth both ways |

### Z-Index Scale

| Variable             | Value | Use Case           |
| -------------------- | ----- | ------------------ |
| `--z-dropdown`       | 50    | Dropdowns, selects |
| `--z-sticky`         | 100   | Sticky headers     |
| `--z-fixed`          | 200   | Fixed elements     |
| `--z-modal-backdrop` | 300   | Modal backdrops    |
| `--z-modal`          | 400   | Modal dialogs      |
| `--z-popover`        | 500   | Popovers           |
| `--z-tooltip`        | 600   | Tooltips           |

## Dark Mode

### How It Works

Dark mode is controlled by the `data-theme` attribute on `<html>`:

```html
<!-- Light mode (explicit) -->
<html data-theme="light">
  <!-- Dark mode (explicit) -->
  <html data-theme="dark">
    <!-- System preference (no attribute) -->
    <html></html>
  </html>
</html>
```

### Switching Themes Programmatically

```typescript
// theme-utils.ts
export type Theme = 'light' | 'dark' | 'system';

export function setTheme(theme: Theme): void {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
  localStorage.setItem('theme', theme);
}

export function getTheme(): Theme {
  return (localStorage.getItem('theme') as Theme) || 'system';
}

export function getResolvedTheme(): 'light' | 'dark' {
  const theme = getTheme();
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}
```

### Initialising Theme (Prevent Flash)

Add this script to `<head>` to prevent flash of wrong theme:

```html
<script>
  (function () {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  })();
</script>
```

## Creating Custom Themes

### Method 1: Override Variables (Recommended)

Create a new theme that overrides specific variables:

```css
/* src/themes/brand/index.css */
@import '../default/index.css';

@layer tokens {
  :root {
    /* Override primary colour to brand blue */
    --color-primary: hsl(210 100% 50%);
    --color-primary-hover: hsl(210 100% 40%);
    --color-primary-active: hsl(210 100% 35%);

    /* Override font family */
    --font-sans: 'Inter', system-ui, sans-serif;
  }

  :root[data-theme='dark'] {
    --color-primary: hsl(210 100% 60%);
    --color-primary-hover: hsl(210 100% 70%);
  }
}
```

### Method 2: Complete Theme Override

For dramatically different themes, copy the default theme and modify:

```
src/themes/
├── default/
└── cyberpunk/
    ├── index.css
    ├── _tokens.css      # Completely different tokens
    ├── _dark-mode.css
    └── ...
```

### Theme Selection via Config (Future)

Theme selection will be handled via app configuration:

```typescript
// app.config.ts (future implementation)
export const appConfig = {
  theme: 'default', // or 'brand', 'cyberpunk', etc.
  defaultMode: 'system', // 'light', 'dark', 'system'
};
```

## Accessibility Utilities

The theme includes accessibility utilities for WCAG 2.1 AA compliance.

### Screen Reader Only

```tsx
<span className="sr-only">Accessible label</span>
```

### Skip Links

```tsx
<a href="#main" className="sr-only-focusable">
  Skip to main content
</a>
```

### Focus Ring

```css
.myButton {
  composes: focus-ring from global;
  /* or apply directly */
  &:focus-visible {
    outline: 2px solid var(--color-ring);
    outline-offset: 2px;
  }
}
```

### Reduced Motion

Animations automatically respect `prefers-reduced-motion`. No additional code required.

### High Contrast Mode

Styles automatically adapt to Windows High Contrast Mode via `forced-colors` media query.

## Animation Utilities

### Available Animations

| Class                 | Effect                  |
| --------------------- | ----------------------- |
| `.animate-fade-in`    | Fade in                 |
| `.animate-fade-out`   | Fade out                |
| `.animate-slide-up`   | Slide up with fade      |
| `.animate-slide-down` | Slide down with fade    |
| `.animate-scale-in`   | Scale up with fade      |
| `.animate-spin`       | Continuous rotation     |
| `.animate-pulse`      | Pulsing opacity         |
| `.animate-shimmer`    | Skeleton loading effect |

### Custom Animations

Use the keyframes in your CSS Modules:

```css
.myElement {
  animation: fadeIn var(--duration-normal) var(--ease-out);
}
```

## Best Practices

1. **Always use semantic colour variables** - Use `--color-primary` not `--palette-red-500`
2. **Use spacing scale** - Prefer `--spacing-4` over arbitrary `16px`
3. **Maintain contrast ratios** - Minimum 4.5:1 for text, 3:1 for UI
4. **Test both modes** - Verify designs in light and dark mode
5. **Respect reduced motion** - Use provided animation utilities
6. **Use focus indicators** - All interactive elements need visible focus

## Troubleshooting

### Variables Not Working

Ensure the theme CSS is imported before your component styles:

```tsx
// Correct order
import '@/themes/default/index.css';
import './MyComponent.module.css';
```

### Dark Mode Flash

Add the inline script to `<head>` as shown in "Initialising Theme" section.

### Specificity Issues

The theme uses `@layer` for cascade management. If your styles aren't applying:

1. Ensure your CSS Modules aren't in a lower-priority layer
2. Check for conflicting `!important` rules
3. Verify the variable is defined in the current mode

## Migration Guide

### From Inline Styles

Replace:

```tsx
<div style={{ padding: '16px', backgroundColor: '#fff' }}>
```

With:

```tsx
<div className={styles.card}>
```

```css
.card {
  padding: var(--spacing-4);
  background-color: var(--color-surface);
}
```

### From Tailwind

Replace:

```tsx
<button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">
```

With:

```tsx
<button className={styles.button}>
```

```css
.button {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-md);

  &:hover {
    background: var(--color-primary-hover);
  }
}
```
