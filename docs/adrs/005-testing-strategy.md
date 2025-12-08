# ADR-005: Testing Strategy

**Status**: Accepted
**Date**: 2025-12-08
**Deciders**: Strategic Project Planner, Lead Developer, QA Architect

## Context

Streamline Studio requires a comprehensive testing strategy covering:

1. **Unit tests**: Pure functions, utilities, business logic
2. **Component tests**: React components in isolation
3. **Integration tests**: Component + hook + state interactions
4. **API tests**: tRPC procedures and database operations
5. **End-to-end tests**: Full user flows in real browser
6. **Accessibility tests**: WCAG 2.1 AA compliance verification
7. **Visual regression tests**: Catch unintended UI changes

The testing stack must:

- Integrate with Next.js App Router and Server Components
- Support tRPC and Drizzle ORM
- Run efficiently in CI/CD pipelines
- Provide meaningful coverage metrics
- Enable confident refactoring and deployment

## Decision

### Testing Stack

| Layer         | Tool                                      | Purpose                          |
| ------------- | ----------------------------------------- | -------------------------------- |
| Unit          | **Vitest**                                | Functions, utilities, hooks      |
| Component     | **Storybook + @storybook/test**           | UI components, interactions      |
| Integration   | **Vitest + Testing Library**              | Component + state integration    |
| API           | **Vitest + test database**                | tRPC procedures, Drizzle queries |
| E2E           | **Playwright**                            | Full user flows, browser testing |
| Accessibility | **axe-core** (via Storybook + Playwright) | WCAG compliance                  |
| Visual        | **Chromatic** (optional)                  | Visual regression                |

### Coverage Targets

| Metric                     | Target      | Rationale                             |
| -------------------------- | ----------- | ------------------------------------- |
| Unit test coverage         | 80%+        | Business logic should be well-tested  |
| Component story coverage   | 90%+        | All UI components should have stories |
| E2E critical path coverage | 100%        | Core user flows must be covered       |
| Accessibility              | WCAG 2.1 AA | Contractual/ethical requirement       |

## Consequences

### Positive

- **Fast feedback**: Vitest is extremely fast for unit/integration tests
- **Confidence**: Comprehensive coverage enables fearless refactoring
- **Accessibility**: Automated a11y checks catch issues early
- **Documentation**: Stories serve as living documentation
- **CI efficiency**: Tests run in parallel, fail fast
- **Developer experience**: Watch mode, clear error messages

### Negative

- **Test maintenance**: Tests must be updated with code changes
- **Initial setup time**: Configuring the full stack takes effort
- **CI duration**: E2E tests add significant CI time
- **Flaky tests**: E2E tests can be brittle if not well-written
- **Learning curve**: Multiple testing tools to learn

## Alternatives Considered

### Jest Instead of Vitest

**Pros:**

- Most popular testing framework
- Extensive documentation
- Works with Create React App

**Cons:**

- Slower than Vitest
- Configuration is more complex
- ESM support is less mature
- Vitest has better Vite/Next.js integration

### Cypress Instead of Playwright

**Pros:**

- Excellent debugging experience
- Time-travel debugging
- Large community

**Cons:**

- Slower than Playwright
- Single browser architecture
- Component testing is newer
- Playwright has better multi-browser support

### Testing Library Only (No Storybook Tests)

**Pros:**

- Single testing approach
- Familiar API
- Works in Node.js

**Cons:**

- Loses visual development workflow
- No accessibility addon integration
- Can't see tests running

### No E2E Tests

**Pros:**

- Faster CI
- Less maintenance
- Simpler setup

**Cons:**

- Misses integration bugs
- No browser compatibility testing
- Can't test full user flows
- Higher risk of production bugs

## Discussion

### Strategic Project Planner

"Let me define the testing pyramid for Streamline Studio:

```
        /\
       /E2E\        <- Few, critical paths only
      /------\
     /Component\    <- Many, via Storybook
    /------------\
   / Integration  \  <- Moderate, complex interactions
  /----------------\
 /      Unit        \ <- Many, pure functions
/--------------------\
```

The key question: where do different tests belong?

| What to Test                  | Layer           | Tool                  |
| ----------------------------- | --------------- | --------------------- | --- |
| `formatDate()` utility        | Unit            | Vitest                |
| Zod validation schemas        | Unit            | Vitest                |
| `useAutoSave` hook            | Integration     | Vitest + renderHook   |
| `<VideoCard>` rendering       | Component       | Storybook             |
| `<VideoCard>` click handler   | Component       | Storybook interaction |
| Video CRUD via tRPC           | API/Integration | Vitest + test DB      |
| Login -> Create Video -> Edit | E2E             | Playwright            | "   |

### Lead Developer

"Let me detail each layer:

**1. Unit Tests (Vitest)**

Pure functions with no side effects:

```typescript
// lib/utils.ts
export function formatDueDate(date: Date | null): string {
  if (!date) return 'No due date';
  // ...
}

// lib/utils.test.ts
import { describe, it, expect } from 'vitest';
import { formatDueDate } from './utils';

describe('formatDueDate', () => {
  it('returns \"No due date\" for null', () => {
    expect(formatDueDate(null)).toBe('No due date');
  });

  it('formats date correctly', () => {
    const date = new Date('2025-01-15');
    expect(formatDueDate(date)).toBe('Jan 15, 2025');
  });
});
```

**2. Hook Tests (Vitest + renderHook)**

Custom hooks with state:

```typescript
// hooks/useAutoSave.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoSave } from './useAutoSave';

describe('useAutoSave', () => {
  it('debounces save calls', async () => {
    const mockSave = vi.fn();
    const { result } = renderHook(() =>
      useAutoSave({ save: mockSave, debounceMs: 100 })
    );

    act(() => {
      result.current.setContent('a');
      result.current.setContent('ab');
      result.current.setContent('abc');
    });

    // Should only call save once after debounce
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(mockSave).toHaveBeenCalledWith('abc');
    });
  });
});
```

**3. Component Tests (Storybook)**

We covered this in ADR-003. Key points:

- Stories for all UI components
- Interaction tests for complex behaviour
- axe-core for accessibility
- Run via `test-storybook` in CI

**4. API/Integration Tests (Vitest + Test Database)**

tRPC procedures with real database:

```typescript
// server/trpc/routers/video.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestContext, createTestCaller } from '@/test/utils';
import { videoRouter } from './video';

describe('videoRouter', () => {
  let ctx: TestContext;
  let caller: ReturnType<typeof createTestCaller>;

  beforeEach(async () => {
    ctx = await createTestContext();
    caller = createTestCaller(ctx, videoRouter);
  });

  describe('list', () => {
    it('returns videos for workspace', async () => {
      // Seed test data
      await ctx.db.insert(videos).values([
        {
          id: '1',
          title: 'Video 1',
          workspaceId: ctx.workspace.id,
          status: 'idea',
        },
        {
          id: '2',
          title: 'Video 2',
          workspaceId: ctx.workspace.id,
          status: 'scripting',
        },
      ]);

      const result = await caller.list({});

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Video 1');
    });

    it('filters by status', async () => {
      // ...seed data...

      const result = await caller.list({ status: 'scripting' });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('scripting');
    });
  });

  describe('create', () => {
    it('creates video with correct workspace', async () => {
      const result = await caller.create({ title: 'New Video' });

      expect(result.title).toBe('New Video');
      expect(result.workspaceId).toBe(ctx.workspace.id);
    });
  });
});
```

**5. E2E Tests (Playwright)**

Full user flows:

````typescript
// e2e/video-crud.spec.ts
import { test, expect } from '@playwright/test';
import { loginAs, createWorkspace } from './helpers';

test.describe('Video CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'test@example.com');
  });

  test('create and edit video', async ({ page }) => {
    // Navigate to videos
    await page.goto('/w/test-workspace/videos');

    // Create new video
    await page.click('button:has-text(\"New Video\")');
    await page.fill('input[name=\"title\"]', 'My Test Video');
    await page.click('button:has-text(\"Create\")');

    // Verify video appears
    await expect(page.locator('text=My Test Video')).toBeVisible();

    // Edit video
    await page.click('text=My Test Video');
    await page.fill('.editor', 'Script content here');

    // Verify auto-save
    await page.waitForSelector('text=Saved');
  });
});
```"

### QA Architect

"How do we handle the test database? I don't want tests to affect each other."

### Lead Developer (Response)

"Test isolation strategy:

**1. Separate test database**
````

DATABASE_URL=postgresql://localhost:5432/streamline_test

````

**2. Transaction rollback per test**
Each test runs in a transaction that rolls back:

```typescript
// test/utils.ts
import { db } from '@/db';

export async function createTestContext() {
  // Start transaction
  const tx = await db.transaction();

  // Create test workspace and user
  const workspace = await tx.insert(workspaces).values({
    name: 'Test Workspace',
    slug: 'test-' + randomId(),
  }).returning();

  const user = await tx.insert(users).values({
    email: 'test@example.com',
    passwordHash: await hash('password'),
  }).returning();

  return {
    db: tx,
    workspace: workspace[0],
    user: user[0],
    cleanup: async () => {
      await tx.rollback();
    },
  };
}
````

**3. Database reset for E2E**
Before E2E test suite:

```typescript
// e2e/global-setup.ts
async function globalSetup() {
  // Reset database
  await db.execute(sql`TRUNCATE users, workspaces, videos CASCADE`);

  // Seed base data
  await seedTestData();
}
```

**4. Parallel test isolation**
Playwright workers get unique data:

````typescript
test.beforeEach(async ({ page }, testInfo) => {
  const uniqueEmail = `test-${testInfo.workerIndex}@example.com`;
  await createUser(uniqueEmail);
  await loginAs(page, uniqueEmail);
});
```"

### QA Architect

"What about accessibility testing? How do we ensure WCAG compliance?"

### Lead Developer (Response)

"Multi-layer approach:

**1. Storybook @storybook/addon-a11y**
Runs axe-core on every story in development:
- Shows violations in Storybook UI
- Highlights affected elements
- Links to WCAG guidelines

**2. Storybook test-runner with a11y**
CI runs accessibility checks:

```typescript
// .storybook/test-runner.ts
import { checkA11y, injectAxe } from 'axe-playwright';

module.exports = {
  async preVisit(page) {
    await injectAxe(page);
  },
  async postVisit(page) {
    await checkA11y(page, '#storybook-root', {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  },
};
````

**3. Playwright E2E with axe-core**
Full page accessibility scans:

```typescript
// e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('dashboard page is accessible', async ({ page }) => {
    await page.goto('/w/test-workspace');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('video editor is accessible', async ({ page }) => {
    await page.goto('/w/test-workspace/videos/123/edit');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('.cm-editor') // CodeMirror has known issues
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
```

**4. Manual testing checklist**
Some things can't be automated:

- Screen reader testing (VoiceOver, NVDA)
- Keyboard-only navigation walkthrough
- Zoom to 200% without horizontal scroll
- Colour contrast with custom themes"

### Strategic Project Planner

"What about visual regression testing? Is Chromatic worth it?"

### Lead Developer (Response)

"Let me evaluate the options:

**Chromatic (Storybook's visual testing)**

- Pros: Best Storybook integration, AI-powered diffing, collaboration UI
- Cons: $149/month after free tier (5000 snapshots)
- Verdict: Worth it once we have 50+ stories, can start with free tier

**Percy**

- Pros: Works with any framework, good diffing
- Cons: More expensive, less Storybook integration
- Verdict: Not needed if we use Chromatic

**Self-hosted (Playwright screenshots)**

- Pros: Free, full control
- Cons: Manual setup, pixel-perfect diffing is noisy
- Verdict: Fallback option

**Recommendation:**

1. Start without visual regression in MVP
2. Add Chromatic free tier once we have meaningful component library
3. Evaluate paid tier if we hit limits and value is proven

Visual regression is nice-to-have, not must-have for MVP."

### QA Architect

"How do we handle flaky E2E tests?"

### Lead Developer (Response)

"Flaky test prevention strategies:

**1. Explicit waits, not timeouts**

```typescript
// Bad
await page.waitForTimeout(1000);

// Good
await page.waitForSelector('text=Saved');
await expect(page.locator('.video-card')).toBeVisible();
```

**2. Test isolation**
Each test creates its own data, doesn't depend on other tests.

**3. Retry mechanism**

```typescript
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
});
```

**4. Trace on failure**

```typescript
export default defineConfig({
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

**5. Quarantine flaky tests**
If a test is flaky after fixes, skip it temporarily and file an issue:

```typescript
test.skip('flaky test', async ({ page }) => {
  // TODO: Fix flakiness - see issue #123
});
```

**6. CI debugging**
Playwright traces are uploaded as CI artifacts for debugging."

### Strategic Project Planner (Conclusion)

"Decision: Vitest + Storybook + Playwright testing stack.

Test distribution:

- **Unit (Vitest)**: 40% of tests - fast, catch logic bugs
- **Component (Storybook)**: 30% of tests - UI components, interactions, a11y
- **Integration (Vitest)**: 20% of tests - tRPC procedures, database operations
- **E2E (Playwright)**: 10% of tests - critical user paths only

CI strategy:

1. Unit + Integration tests: Run on every push (~1-2 min)
2. Storybook tests: Run on every push (~2-3 min)
3. E2E tests: Run on PR and main branch (~5-10 min)
4. Visual regression: Optional, on PR if Chromatic enabled

Coverage targets:

- Start with unit tests for business logic
- Add component stories as UI is built
- Add E2E tests for critical paths before launch
- Aim for 80% unit coverage, 100% critical path E2E"

## Implementation Notes

### Directory Structure

```
src/
  lib/
    utils.ts
    utils.test.ts
  hooks/
    useAutoSave.ts
    useAutoSave.test.ts
  components/
    ui/
      button/
        Button.tsx
        Button.stories.tsx
    features/
      video-card/
        VideoCard.tsx
        VideoCard.stories.tsx
  server/
    trpc/
      routers/
        video.ts
        video.test.ts

e2e/
  video-crud.spec.ts
  accessibility.spec.ts
  auth.spec.ts
  helpers/
    auth.ts
    data.ts
  global-setup.ts

test/
  utils.ts              # Test utilities
  setup.ts              # Vitest setup
  mocks/
    trpc.ts
    db.ts
```

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'test', '**/*.stories.tsx', '**/*.d.ts'],
    },
    // Test isolation
    isolate: true,
    // Timeout for async operations
    testTimeout: 10000,
    // Pool for parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
});
```

### test/setup.ts

```typescript
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
```

### playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-results.json' }],
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile viewports
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Local dev server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  // Global setup for database seeding
  globalSetup: require.resolve('./e2e/global-setup.ts'),
});
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:storybook": "test-storybook",
    "test:all": "npm run test:coverage && npm run test:storybook && npm run test:e2e"
  }
}
```

### CI Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  storybook:
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
            "npx wait-on tcp:6006 && npm run test:storybook"

  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: streamline_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run db:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/streamline_test
      - run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/streamline_test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

### Key Dependencies

```json
{
  "devDependencies": {
    "vitest": "^1.2.0",
    "@vitest/ui": "^1.2.0",
    "@vitest/coverage-v8": "^1.2.0",
    "@testing-library/react": "^14.1.0",
    "@testing-library/jest-dom": "^6.2.0",
    "@testing-library/user-event": "^14.5.0",
    "@playwright/test": "^1.41.0",
    "@axe-core/playwright": "^4.8.0",
    "@storybook/test": "^8.0.0",
    "@storybook/test-runner": "^0.17.0"
  }
}
```
