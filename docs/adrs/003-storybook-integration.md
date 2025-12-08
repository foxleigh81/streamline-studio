# ADR-003: Storybook Integration

**Status**: Accepted
**Date**: 2025-12-08
**Deciders**: Strategic Project Planner, Lead Developer, QA Architect

## Context

Streamline Studio has a significant UI component surface area:

1. **Base UI components**: Buttons, inputs, modals, dropdowns, data tables (Radix UI primitives with custom CSS Modules)
2. **Feature components**: Video cards, status badges, category pills, kanban columns
3. **Complex interactive components**: Markdown editor, version history viewer, drag-and-drop lists
4. **Layout components**: Dashboard layouts, workspace switcher, navigation

Requirements for UI development:

- **Component isolation**: Develop and test components in isolation from application state
- **Visual documentation**: Living documentation of component variants and states
- **Design collaboration**: Enable designers to review components without running full app
- **Accessibility testing**: Verify WCAG compliance during development
- **Visual regression testing**: Catch unintended UI changes
- **Interaction testing**: Test component behaviour without full E2E setup

## Decision

### Use Storybook 8+

Implement **Storybook** as the component development environment with:

1. **CSF3 format**: Component Story Format 3 for modern story syntax
2. **Interaction testing**: @storybook/test for component-level behaviour tests
3. **Accessibility addon**: Automated a11y audits via axe-core
4. **Chromatic integration**: Visual regression testing in CI (optional SaaS)

### Scope

- All Radix UI-based components get stories (per ADR-002 styling solution)
- Feature-specific components get stories with realistic mock data
- Complex interactive components (editor, kanban) get interaction tests
- Stories serve as component documentation

## Consequences

### Positive

- **Isolation**: Components developed independent of app state and routing
- **Fast feedback**: Hot reload on component changes, no app bootstrap
- **Documentation**: Auto-generated docs from stories and TypeScript props
- **Accessibility**: axe-core catches a11y issues early in development
- **Visual testing**: Chromatic or Percy can detect visual regressions
- **Interaction testing**: Test complex interactions without Playwright overhead
- **Design handoff**: Designers can review components in Storybook
- **Onboarding**: New developers explore components via Storybook

### Negative

- **Maintenance overhead**: Stories must be kept in sync with components
- **Build time**: Additional build for Storybook alongside Next.js
- **Configuration complexity**: Storybook config for Next.js requires attention
- **Duplication**: Some tests may overlap with component tests
- **Cost**: Chromatic is paid for private repos (free tier available)

## Alternatives Considered

### No Component Development Tool

**Pros:**

- Zero additional tooling
- No maintenance overhead
- Simpler CI pipeline

**Cons:**

- Components developed in context of app (slower iteration)
- No isolated testing environment
- No visual documentation
- Harder design collaboration
- No visual regression testing

### Ladle

**Pros:**

- Lighter than Storybook
- Faster build times
- Simpler configuration
- Vite-native

**Cons:**

- Smaller ecosystem
- Fewer addons (no a11y addon, limited testing)
- Less documentation and community support
- Not as mature

### Docz / Docusaurus

**Pros:**

- MDX-based documentation
- Can include component examples
- Good for public documentation

**Cons:**

- Not designed for component development
- Less interactive than Storybook
- No interaction testing
- No visual regression testing

### Custom Solution (MDX + playground)

**Pros:**

- Full control
- No external dependencies
- Exactly what we need, nothing more

**Cons:**

- Significant development effort
- Reinventing the wheel
- No ecosystem of addons
- Maintenance burden

## Discussion

### Strategic Project Planner

"Let me map out the component development workflow:

1. **New component**: Developer creates component, wants to see it in isolation
2. **Iterate on design**: Fast feedback loop for styling and layout
3. **Add variants**: Different states (loading, error, empty, populated)
4. **Test interactions**: Click handlers, form submissions, drag-and-drop
5. **Verify accessibility**: Focus management, ARIA attributes, colour contrast
6. **Document**: Explain props, show usage examples
7. **Review**: Designer or other dev reviews component
8. **Regression check**: Ensure changes don't break existing components

Storybook covers all of these. The question is: is the maintenance overhead worth it?"

### Lead Developer

"For Streamline Studio, yes. Here's why:

**1. Component complexity justifies it:**
We have 50+ components across Radix UI-based components and feature-specific components. Without Storybook, developing the kanban board means:

- Running the full app
- Logging in
- Navigating to a workspace
- Creating test data
- Finally, iterating on the kanban component

With Storybook:

- `npm run storybook`
- Navigate to Kanban story
- See it with mock data
- Iterate

**2. Accessibility is non-negotiable:**
WCAG 2.1 AA compliance is a requirement. The @storybook/addon-a11y runs axe-core on every story. This catches issues before they reach code review.

**3. Interaction testing fills a gap:**
Some component interactions are too detailed for E2E tests but too complex for unit tests. Example: markdown editor auto-save behaviour.

```typescript
// stories/Editor.stories.tsx
export const AutoSave: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = canvas.getByRole('textbox');

    await userEvent.type(editor, 'New content');
    await waitFor(
      () => {
        expect(mockSave).toHaveBeenCalledWith('New content');
      },
      { timeout: 3000 }
    ); // Wait for debounce
  },
};
```

This tests the auto-save debounce logic without spinning up Playwright."

### QA Architect

"How does Storybook interaction testing relate to our testing strategy? I don't want duplicate tests."

### Lead Developer (Response)

"Clear separation of concerns:

| Test Type         | Tool                        | What It Tests                           |
| ----------------- | --------------------------- | --------------------------------------- |
| Unit tests        | Vitest                      | Pure functions, utilities, hooks        |
| Component tests   | Storybook + @storybook/test | Component rendering, interactions, a11y |
| Integration tests | Vitest + Testing Library    | Component + hook integration            |
| E2E tests         | Playwright                  | Full user flows, real browser           |

Storybook interaction tests replace what would be Testing Library tests for complex components. Instead of:

```typescript
// Old: component.test.tsx with Testing Library
render(<Editor onSave={mockSave} />);
// ...setup code...
await userEvent.type(screen.getByRole('textbox'), 'Content');
// ...assertions...
```

We have:

```typescript
// New: Editor.stories.tsx with Storybook
export const TypeAndSave: Story = {
  play: async ({ canvasElement }) => {
    // Same test, but visualised in Storybook
  },
};
```

The Storybook test runs in the browser, is visible during development, and can be executed in CI via test-storybook."

### QA Architect

"What about visual regression testing? Chromatic costs money."

### Lead Developer (Response)

"Options for visual regression:

**1. Chromatic (Recommended for SaaS)**

- Integrated with Storybook
- Captures screenshots of every story
- AI-powered diffing (ignores anti-aliasing, etc.)
- Free tier: 5,000 snapshots/month
- Paid: $149/month for more

**2. Percy (Alternative)**

- Similar to Chromatic
- Works with Storybook and Playwright
- More expensive

**3. Self-hosted with Loki or Playwright**

- Run Playwright against Storybook
- Screenshot comparison
- Free, but more setup
- Less sophisticated diffing

For MVP, I recommend:

- Start without visual regression
- Add Chromatic free tier once we have 50+ stories
- Evaluate paid tier when we hit limits

The investment in stories still pays off for development workflow and interaction testing, even without visual regression."

### Strategic Project Planner

"How do we handle stories for components that need application context? Like workspace-scoped components?"

### Lead Developer (Response)

"Storybook decorators handle this:

```typescript
// .storybook/preview.tsx
import { WorkspaceContext } from '@/lib/context';

const mockWorkspace = {
  id: 'ws_123',
  name: 'My Channel',
  slug: 'my-channel',
};

export const decorators = [
  (Story) => (
    <WorkspaceContext.Provider value={mockWorkspace}>
      <Story />
    </WorkspaceContext.Provider>
  ),
];
```

For tRPC, we mock the client:

```typescript
// .storybook/mocks/trpc.ts
import { createTRPCMsw } from 'msw-trpc';
import { appRouter } from '@/server/trpc/router';

export const trpcMsw = createTRPCMsw<typeof appRouter>();

// In story
export const WithVideos: Story = {
  parameters: {
    msw: {
      handlers: [
        trpcMsw.video.list.query(() => [
          { id: '1', title: 'Video 1', status: 'idea' },
          { id: '2', title: 'Video 2', status: 'scripting' },
        ]),
      ],
    },
  },
};
```

MSW (Mock Service Worker) intercepts tRPC calls in Storybook, so components work without a real backend."

### QA Architect

"What about Next.js-specific features? Server Components, App Router?"

### Lead Developer (Response)

"Good question. Storybook 8 has improved Next.js support:

**Server Components:**

- Storybook renders in browser, so Server Components become Client Components
- For stories, we treat all components as client components
- Server-only code (database queries) is mocked

**App Router features:**

- `next/navigation` is mocked by @storybook/nextjs
- `useRouter`, `usePathname`, etc. work in stories
- Images via `next/image` are handled

**Configuration:**

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['../public'],
};

export default config;
```

The @storybook/nextjs framework handles most Next.js magic automatically."

### Strategic Project Planner

"What's the story structure? How granular do we go?"

### Lead Developer (Response)

"Recommended structure:

```
src/
  components/
    ui/
      button/
        Button.tsx
        Button.stories.tsx     # All button variants
      input/
        Input.tsx
        Input.stories.tsx
    features/
      video-card/
        VideoCard.tsx
        VideoCard.stories.tsx  # Empty, populated, loading states
      kanban-board/
        KanbanBoard.tsx
        KanbanBoard.stories.tsx
        KanbanColumn.tsx
        KanbanColumn.stories.tsx
```

Story file conventions:

- One story file per component
- Stories for each meaningful variant/state
- Interaction tests for complex behaviour

Example VideoCard stories:

````typescript
// VideoCard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { VideoCard } from './VideoCard';

const meta: Meta<typeof VideoCard> = {
  title: 'Features/VideoCard',
  component: VideoCard,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['idea', 'scripting', 'filming', 'editing', 'published'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof VideoCard>;

export const Idea: Story = {
  args: {
    video: {
      id: '1',
      title: 'How to Make Coffee',
      status: 'idea',
      dueDate: null,
    },
  },
};

export const Scripting: Story = {
  args: {
    video: {
      id: '2',
      title: 'Best Coffee Makers 2025',
      status: 'scripting',
      dueDate: new Date('2025-02-01'),
    },
  },
};

export const LongTitle: Story = {
  args: {
    video: {
      id: '3',
      title: 'This is a very long title that should be truncated properly without breaking the layout of the card component',
      status: 'filming',
      dueDate: new Date('2025-01-15'),
    },
  },
};

export const WithInteraction: Story = {
  args: { ... },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByRole('article');

    await userEvent.click(card);
    await expect(mockOnClick).toHaveBeenCalled();
  },
};
```"

### QA Architect (Final)

"How do we enforce that new components get stories?"

### Lead Developer (Response)

"Several mechanisms:

1. **Code review checklist**: 'Does this PR add stories for new/modified components?'

2. **CI check**: Count components vs stories, alert if ratio drops

3. **Coverage reporting**: Storybook can report which components have stories

4. **Documentation**: CONTRIBUTING.md requires stories for UI components

5. **Team culture**: Make Storybook the primary development environment

For MVP, code review is sufficient. We can add automated checks later if needed."

### Strategic Project Planner (Conclusion)

"Decision: Implement Storybook with CSF3 and interaction testing.

Rationale:
1. Component complexity justifies the overhead
2. Accessibility addon critical for WCAG compliance
3. Interaction testing fills gap between unit and E2E tests
4. Design collaboration enabled
5. Industry standard tool with strong ecosystem

Implementation priority:
1. Set up Storybook with Next.js framework
2. Add stories for Radix UI-based components
3. Add stories for feature components as they're built
4. Integrate interaction testing for complex components
5. Evaluate Chromatic after 50+ stories"

## Implementation Notes

### Directory Structure

````

.storybook/
main.ts # Storybook configuration
preview.tsx # Global decorators and parameters
mocks/
trpc.ts # tRPC mocking setup
handlers.ts # MSW handlers

src/
components/
ui/
button/
Button.tsx
Button.stories.tsx
features/
video-card/
VideoCard.tsx
VideoCard.stories.tsx

````

### .storybook/main.ts

```typescript
import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['../public'],
  webpackFinal: async (config) => {
    // Add path aliases to match tsconfig
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': path.resolve(__dirname, '../src'),
      };
    }
    return config;
  },
};

export default config;
````

### .storybook/preview.tsx

```typescript
import type { Preview } from '@storybook/react';
import { initialize, mswLoader } from 'msw-storybook-addon';
import '../src/app/globals.css';

// Initialize MSW
initialize();

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // Accessibility configuration
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
        ],
      },
    },
    // Backgrounds for light/dark mode
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#0a0a0a' },
      ],
    },
  },
  loaders: [mswLoader],
  decorators: [
    (Story) => (
      <div className="font-sans">
        <Story />
      </div>
    ),
  ],
};

export default preview;
```

### Key Dependencies

```json
{
  "devDependencies": {
    "@storybook/addon-a11y": "^8.0.0",
    "@storybook/addon-essentials": "^8.0.0",
    "@storybook/addon-interactions": "^8.0.0",
    "@storybook/addon-links": "^8.0.0",
    "@storybook/addon-themes": "^8.0.0",
    "@storybook/blocks": "^8.0.0",
    "@storybook/nextjs": "^8.0.0",
    "@storybook/react": "^8.0.0",
    "@storybook/test": "^8.0.0",
    "@storybook/test-runner": "^0.17.0",
    "msw": "^2.0.0",
    "msw-storybook-addon": "^2.0.0",
    "storybook": "^8.0.0"
  }
}
```

### NPM Scripts

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "test-storybook": "test-storybook"
  }
}
```

### CI Integration

```yaml
# .github/workflows/storybook.yml
name: Storybook

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build-storybook
      - name: Run Storybook tests
        run: |
          npx concurrently -k -s first -n "SB,TEST" -c "magenta,blue" \
            "npx http-server storybook-static --port 6006 --silent" \
            "npx wait-on tcp:6006 && npm run test-storybook"
```

### Example Story with Interaction Test

```typescript
// src/components/features/video-card/VideoCard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { VideoCard } from './VideoCard';

const meta: Meta<typeof VideoCard> = {
  title: 'Features/VideoCard',
  component: VideoCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof VideoCard>;

export const Default: Story = {
  args: {
    video: {
      id: '1',
      title: 'My Video',
      status: 'idea',
      dueDate: null,
    },
  },
};

export const ClickInteraction: Story = {
  args: {
    video: {
      id: '1',
      title: 'Clickable Video',
      status: 'scripting',
      dueDate: new Date('2025-02-01'),
    },
    onClick: () => {},
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByRole('article');

    // Verify card is focusable for keyboard users
    await userEvent.tab();
    await expect(card).toHaveFocus();

    // Verify click handler
    await userEvent.click(card);
  },
};

export const KeyboardNavigation: Story = {
  args: {
    video: {
      id: '1',
      title: 'Keyboard Accessible',
      status: 'filming',
      dueDate: null,
    },
    onClick: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByRole('article');

    // Navigate with keyboard
    await userEvent.tab();
    await expect(card).toHaveFocus();

    // Activate with Enter
    await userEvent.keyboard('{Enter}');
  },
};
```
