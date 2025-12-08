# Accessibility Testing Guide

This document outlines the accessibility testing procedures for Streamline Studio, ensuring compliance with WCAG 2.1 Level AA standards.

## Table of Contents

1. [Overview](#overview)
2. [Automated Testing](#automated-testing)
3. [Manual Testing](#manual-testing)
4. [Screen Reader Testing](#screen-reader-testing)
5. [Keyboard Navigation](#keyboard-navigation)
6. [Color Contrast](#color-contrast)
7. [Touch Targets](#touch-targets)
8. [Checklist](#checklist)

## Overview

Streamline Studio follows WCAG 2.1 Level AA guidelines. All features must be:

- **Perceivable**: Information presented in ways all users can perceive
- **Operable**: UI components and navigation must be operable
- **Understandable**: Information and operation must be understandable
- **Robust**: Content must work with current and future technologies

## Automated Testing

### axe-core Integration

We use `@axe-core/playwright` for automated accessibility testing in E2E tests.

**Running Automated Tests:**

```bash
# Run accessibility-specific E2E tests
npm run test:a11y

# Run all E2E tests (includes accessibility)
npm run test:e2e
```

**Example Test:**

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('categories page should not have accessibility violations', async ({
  page,
}) => {
  await page.goto('/w/test-workspace/categories');

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

### Storybook a11y Addon

All Storybook stories include the `@storybook/addon-a11y` addon for visual accessibility testing.

**Running Storybook:**

```bash
npm run storybook
```

Navigate to any story and check the "Accessibility" tab to see violations.

## Manual Testing

### ARIA Attributes

**Check that all interactive elements have:**

- ✅ Proper ARIA roles (e.g., `role="button"`, `role="dialog"`)
- ✅ ARIA labels where needed (`aria-label`, `aria-labelledby`)
- ✅ ARIA states (`aria-checked`, `aria-expanded`, `aria-hidden`)
- ✅ ARIA live regions for dynamic content (`aria-live="polite"` or `"assertive"`)

**Examples:**

```tsx
// Button with label
<button aria-label="Close dialog">×</button>

// Radiogroup with labelledby
<div role="radiogroup" aria-labelledby="color-picker-label">
  {/* radio buttons */}
</div>

// Live region for announcements
<div role="status" aria-live="polite">
  Category created successfully
</div>
```

### Focus Management

**Verify focus behavior:**

1. **Skip Links**: Press Tab on page load → skip link should appear
2. **Modal Focus Trap**: Open modal → Tab cycles only within modal
3. **Modal Close**: Close modal → focus returns to trigger element
4. **Focus Visible**: All focusable elements show visible focus indicator

**Focus Trap Implementation:**

```typescript
import { trapFocus, saveFocus, restoreFocus } from '@/lib/accessibility';

// When opening modal
const previousFocus = saveFocus();
const cleanup = trapFocus(modalElement);

// When closing modal
cleanup();
restoreFocus(previousFocus);
```

## Screen Reader Testing

### Recommended Screen Readers

- **macOS**: VoiceOver (Cmd + F5)
- **Windows**: NVDA (free) or JAWS
- **Linux**: Orca
- **Mobile**: VoiceOver (iOS), TalkBack (Android)

### Testing Procedure

#### 1. Navigation Test

**Steps:**

1. Enable screen reader
2. Navigate to the application
3. Use Tab/Shift+Tab to navigate through page
4. Verify all elements are announced correctly
5. Check heading hierarchy (H1 → H2 → H3)

**Expected Results:**

- All interactive elements are announced
- Element roles are correct ("button", "link", "heading level 1")
- All form inputs have associated labels
- Dynamic content changes are announced

#### 2. Form Testing

**Steps:**

1. Navigate to a form (e.g., Create Category)
2. Tab through form fields
3. Fill out the form
4. Submit the form

**Expected Results:**

- Each input announces its label and type
- Required fields are announced as "required"
- Error messages are announced immediately
- Success messages are announced after submission

#### 3. Modal Testing

**Steps:**

1. Open a modal/dialog
2. Verify modal title is announced
3. Tab through modal elements
4. Close modal with Esc key

**Expected Results:**

- Modal opening is announced
- Focus moves to modal
- Tab cycles only within modal
- Closing returns focus to trigger element

### VoiceOver Commands (macOS)

| Command          | Action                           |
| ---------------- | -------------------------------- |
| Cmd + F5         | Toggle VoiceOver                 |
| VO + Right Arrow | Next item                        |
| VO + Left Arrow  | Previous item                    |
| VO + Space       | Activate item                    |
| VO + A           | Read page                        |
| VO + H           | Next heading                     |
| VO + U           | Rotor (landmarks/headings/links) |

_VO = Control + Option_

## Keyboard Navigation

### Global Keyboard Shortcuts

| Key         | Action                                           |
| ----------- | ------------------------------------------------ |
| Tab         | Next focusable element                           |
| Shift + Tab | Previous focusable element                       |
| Enter       | Activate button/link                             |
| Space       | Activate button, toggle checkbox                 |
| Esc         | Close modal/dialog                               |
| Arrow Keys  | Navigate within components (radio groups, lists) |
| Home        | First item in list                               |
| End         | Last item in list                                |

### Component-Specific Navigation

#### Color Picker

- **Arrow Right/Left**: Navigate colors horizontally
- **Arrow Up/Down**: Navigate colors vertically (6-column grid)
- **Home**: First color
- **End**: Last color
- **Enter/Space**: Select color

#### Modal Dialogs

- **Tab**: Cycle through modal elements
- **Shift + Tab**: Reverse cycle
- **Esc**: Close modal

#### Skip Link

- **Tab** (on page load): Show skip link
- **Enter**: Jump to main content

### Testing Procedure

1. **Load page without mouse**
2. **Press Tab repeatedly** → all interactive elements should receive focus
3. **Verify focus indicators** → clear visual outline on focused elements
4. **Test all keyboard shortcuts** → verify expected behavior
5. **Navigate entire application** → ensure all features are keyboard-accessible

## Color Contrast

### Requirements

**WCAG AA Compliance:**

- **Normal text**: 4.5:1 contrast ratio minimum
- **Large text** (18pt+ or 14pt+ bold): 3:1 contrast ratio minimum
- **UI components**: 3:1 contrast ratio minimum

### Preset Color Palette Validation

All 18 preset colors in the color picker have been validated against white backgrounds:

```typescript
import { validateColorPalette } from '@/lib/accessibility';
import { PRESET_COLORS } from '@/components/category/color-picker';

const results = validateColorPalette(PRESET_COLORS);

results.forEach(({ color, ratio, passes }) => {
  console.log(`${color}: ${ratio.toFixed(2)}:1 - ${passes ? 'PASS' : 'FAIL'}`);
});
```

### Tools

1. **Chrome DevTools**: Elements → Accessibility → Contrast
2. **WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/
3. **Built-in utility**: `getContrastRatio()` in `@/lib/accessibility/contrast`

### Manual Verification

1. Check all text against backgrounds
2. Verify button states (default, hover, disabled)
3. Check form input borders and labels
4. Verify status badges and category tags

## Touch Targets

### Requirements

**WCAG 2.1 Success Criterion 2.5.5 (AAA):**

- All interactive elements: **minimum 24x24px**
- **Recommended: 44x44px** for better mobile usability

### Implemented Touch Targets

| Component                | Size                | Status             |
| ------------------------ | ------------------- | ------------------ |
| Button (sm)              | 32px height         | ✅ Exceeds minimum |
| Button (md)              | 40px height         | ✅ Exceeds minimum |
| Button (lg)              | 44px height         | ✅ Exceeds minimum |
| Color Picker Swatches    | 40x40px             | ✅ Exceeds minimum |
| Skip Link                | 40px height         | ✅ Exceeds minimum |
| Video Card (entire card) | Full card clickable | ✅ Large target    |

### Verification

Use browser DevTools to inspect element dimensions:

```javascript
const element = document.querySelector('.color-button');
const rect = element.getBoundingClientRect();
console.log(`Width: ${rect.width}px, Height: ${rect.height}px`);
```

## Checklist

### Before Every Release

- [ ] Run automated accessibility tests (`npm run test:a11y`)
- [ ] Check Storybook a11y addon for violations
- [ ] Test keyboard navigation on all new pages
- [ ] Verify focus management in new modals
- [ ] Check color contrast with DevTools
- [ ] Test with VoiceOver (or other screen reader)
- [ ] Verify touch target sizes
- [ ] Test skip links on all pages
- [ ] Check ARIA attributes are correct
- [ ] Verify live regions announce changes

### Per-Component Checklist

When creating a new component:

- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible
- [ ] Touch targets meet 24x24px minimum
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] ARIA attributes are present where needed
- [ ] Component has Storybook story with a11y addon
- [ ] Screen reader announces element correctly
- [ ] Component works without mouse
- [ ] Error states are announced to screen readers
- [ ] Loading states have aria-busy and aria-label

## Resources

- **WCAG 2.1 Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **ARIA Authoring Practices**: https://www.w3.org/WAI/ARIA/apg/
- **WebAIM**: https://webaim.org/
- **axe DevTools**: https://www.deque.com/axe/devtools/
- **A11y Project Checklist**: https://www.a11yproject.com/checklist/

## Contact

For accessibility questions or to report issues, contact the development team.
