# Project: Streamline Studio Comprehensive Testing Strategy

## Overview

This document provides a detailed testing strategy and task breakdown for the Streamline Studio Next.js project. The plan covers E2E tests (Playwright), Unit tests (Vitest), Smoke tests, Integration tests, and Storybook stories with interaction tests. The strategy builds upon the existing ADR-005 Testing Strategy and leverages the already-configured testing infrastructure.

## Executive Summary

**Current State Analysis:**

- **Existing Tests:** 5 unit test files, 1 E2E test file, 1 Storybook story file
- **Test Coverage:** Approximately 15-20% of testable code
- **Infrastructure:** Vitest, Playwright, and Storybook fully configured and operational
- **Gaps:** Missing tests for Input component, workspace hooks, tRPC procedures, auth flows E2E

**Target State:**

- 80%+ unit test coverage on business logic
- 90%+ component story coverage
- 100% coverage of critical user paths via E2E
- WCAG 2.1 AA compliance verification

## Critical Considerations

### Security

- All auth-related tests must verify rate limiting enforcement
- Workspace isolation tests are critical for multi-tenant security
- Password validation edge cases must be thoroughly tested
- Session token generation and handling must be cryptographically verified
- No test fixtures should contain real credentials or secrets

### Performance

- Unit tests should complete in under 5 seconds total
- E2E tests should use parallelization where possible
- Test database should use transactions with rollback for isolation
- Storybook tests should lazy-load heavy components

### Accessibility

- All UI components must have axe-core accessibility tests
- Keyboard navigation tests for all interactive components
- ARIA attribute verification in component tests
- Screen reader compatibility validated via Storybook a11y addon

---

## File Naming Conventions and Locations

| Test Type         | Location                         | Naming Pattern             | Example                    |
| ----------------- | -------------------------------- | -------------------------- | -------------------------- |
| Unit Tests        | `src/**/__tests__/` or colocated | `*.test.ts` / `*.test.tsx` | `button.test.tsx`          |
| Storybook Stories | Colocated with component         | `*.stories.tsx`            | `button.stories.tsx`       |
| Integration Tests | `src/**/__tests__/`              | `*.integration.test.ts`    | `auth.integration.test.ts` |
| E2E Tests         | `e2e/`                           | `*.spec.ts`                | `auth.spec.ts`             |
| Smoke Tests       | `e2e/smoke/`                     | `*.smoke.spec.ts`          | `health.smoke.spec.ts`     |
| E2E Helpers       | `e2e/helpers/`                   | `*.ts`                     | `auth.ts`                  |
| Test Utilities    | `src/test/`                      | `*.ts`                     | `utils.ts`                 |

---

## Task Breakdown

### Phase 1: Foundation and Smoke Tests

**Priority: Critical | Estimated Effort: 4-6 hours**

These tasks establish the testing foundation and critical smoke tests that should run on every deployment.

#### Task 1.1: Create E2E Test Helpers and Fixtures

- **Assigned to**: QA Engineer
- **Priority**: Critical
- **Dependencies**: None
- **Acceptance Criteria**:
  - [ ] Create `e2e/helpers/auth.ts` with login/logout helper functions
  - [ ] Create `e2e/helpers/data.ts` with test data factories
  - [ ] Create `e2e/fixtures/users.ts` with test user credentials
  - [ ] Create `e2e/global-setup.ts` for database seeding
  - [ ] Helpers support parallel test execution with unique data per worker
- **Implementation Notes**:
  - Use worker index for unique email generation: `test-${workerIndex}@example.com`
  - Helpers should handle session cookie management automatically
  - Reference existing `e2e/app.spec.ts` for Playwright patterns

**Files to create:**

```
e2e/
  helpers/
    auth.ts
    data.ts
    db.ts
  fixtures/
    users.ts
  global-setup.ts
```

#### Task 1.2: Create Smoke Test Suite

- **Assigned to**: QA Engineer
- **Priority**: Critical
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - [ ] Create `e2e/smoke/health.smoke.spec.ts` for API health checks
  - [ ] Create `e2e/smoke/auth.smoke.spec.ts` for basic auth flow verification
  - [ ] Create `e2e/smoke/pages.smoke.spec.ts` for page load verification
  - [ ] All smoke tests complete in under 30 seconds
  - [ ] Smoke tests can run independently of full E2E suite
- **Implementation Notes**:
  - Smoke tests should be lightweight and fast
  - Use `test.describe.configure({ mode: 'parallel' })` for speed
  - Add npm script: `"test:smoke": "playwright test --grep @smoke"`

**Test Scenarios:**

```typescript
// e2e/smoke/health.smoke.spec.ts
- API /api/health returns 200 with status: ok
- tRPC /api/trpc/health returns valid response
- Homepage loads within 3 seconds
- Login page is accessible
- Register page is accessible

// e2e/smoke/auth.smoke.spec.ts
- Login form renders correctly
- Register form renders correctly
- Form validation displays errors
```

#### Task 1.3: Create Test Utilities for Vitest

- **Assigned to**: Frontend Developer
- **Priority**: Critical
- **Dependencies**: None
- **Acceptance Criteria**:
  - [ ] Create `src/test/utils.ts` with render helpers for React Testing Library
  - [ ] Create `src/test/mocks/trpc.ts` with tRPC mock utilities
  - [ ] Create `src/test/mocks/db.ts` with database mock patterns
  - [ ] Add custom matchers to `src/test/setup.ts` if needed
  - [ ] Utilities support proper TypeScript inference
- **Implementation Notes**:
  - Reference existing `src/test/setup.ts` for mocking patterns
  - Use MSW for API mocking if needed
  - Export all utilities from a single entry point

---

### Phase 2: UI Component Tests

**Priority: High | Estimated Effort: 8-12 hours**

Complete test coverage for all UI components with Storybook stories and unit tests.

#### Task 2.1: Input Component Stories and Tests

- **Assigned to**: Frontend Developer
- **Priority**: High
- **Dependencies**: None
- **Acceptance Criteria**:
  - [ ] Create `src/components/ui/input/input.stories.tsx` with all variants
  - [ ] Create `src/components/ui/input/input.test.tsx` with unit tests
  - [ ] Stories cover: default, with label, with error, with helper text, disabled
  - [ ] Interaction tests verify focus states and error display
  - [ ] Accessibility tests pass (axe-core via Storybook addon)
- **Implementation Notes**:
  - Follow Button component patterns for consistency
  - Test ARIA attributes: `aria-invalid`, `aria-describedby`
  - Verify label-input association via `htmlFor`/`id`

**Story Variants:**

```typescript
// src/components/ui/input/input.stories.tsx
- Default
- WithLabel
- WithError
- WithHelperText
- WithErrorAndHelperText (error takes precedence)
- Disabled
- Password
- Email
- Required
- KeyboardInteraction (play function)
- ErrorAnnouncement (play function for screen reader)
```

**Unit Test Cases:**

```typescript
// src/components/ui/input/input.test.tsx
describe('Input', () => {
  describe('rendering', () => {
    - renders input element
    - renders label when provided
    - renders error message when error prop is set
    - renders helper text when helperText prop is set
    - prioritizes error over helper text
  });

  describe('accessibility', () => {
    - associates label with input via htmlFor/id
    - sets aria-invalid when error is present
    - sets aria-describedby pointing to error message
    - error message has role="alert"
  });

  describe('ref forwarding', () => {
    - forwards ref to input element
  });
});
```

#### Task 2.2: Create Shared Component Test Patterns

- **Assigned to**: Frontend Developer
- **Priority**: High
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - [ ] Document component testing patterns in `src/test/README.md`
  - [ ] Create reusable accessibility test helpers
  - [ ] Create snapshot testing strategy (if adopted)
  - [ ] Define when to use Storybook vs Vitest for component tests
- **Implementation Notes**:
  - Storybook for visual/interaction tests, Vitest for logic-heavy components
  - Use `@storybook/test` utilities for interaction tests
  - Consider using `composeStories` from `@storybook/react` for unit tests

#### Task 2.3: Future UI Components (Placeholder)

- **Assigned to**: Frontend Developer
- **Priority**: Medium (as components are built)
- **Dependencies**: Task 2.2
- **Acceptance Criteria**:
  - [ ] Each new UI component has corresponding stories
  - [ ] Each new UI component has unit tests for complex logic
  - [ ] All components pass accessibility checks
- **Implementation Notes**:
  - Components to test as they are built:
    - Dialog/Modal components
    - Dropdown menu components
    - Video card component
    - Category badge component
    - Status indicator component
    - Form components (Select, Textarea, Checkbox)

---

### Phase 3: Auth System Tests

**Priority: Critical | Estimated Effort: 10-14 hours**

Comprehensive testing of authentication system including unit, integration, and E2E tests.

#### Task 3.1: Auth Router Unit Tests

- **Assigned to**: Backend Developer
- **Priority**: Critical
- **Dependencies**: Task 1.3
- **Acceptance Criteria**:
  - [ ] Create `src/server/trpc/routers/__tests__/auth.test.ts`
  - [ ] Test register procedure: validation, duplicate handling, password policy
  - [ ] Test login procedure: success, invalid credentials, rate limiting
  - [ ] Test logout procedure: session invalidation, cookie clearing
  - [ ] Test me/whoami procedures: authenticated vs unauthenticated
  - [ ] Mock database to test business logic in isolation
- **Implementation Notes**:
  - Use `vi.mock` for database operations
  - Test rate limiting by calling procedure multiple times
  - Verify cookie headers are set correctly

**Test Cases:**

```typescript
// src/server/trpc/routers/__tests__/auth.test.ts
describe('authRouter', () => {
  describe('register', () => {
    - creates user with valid input
    - rejects invalid email format
    - rejects passwords below minimum length
    - rejects common passwords
    - returns generic message for duplicate email (prevents enumeration)
    - applies rate limiting by IP
    - creates default workspace in single-tenant mode
    - links user to existing workspace in single-tenant mode
  });

  describe('login', () => {
    - authenticates with valid credentials
    - rejects invalid email
    - rejects invalid password with same error message
    - performs timing-safe comparison (dummy hash on user not found)
    - applies rate limiting by IP+email
    - sets session cookie on success
  });

  describe('logout', () => {
    - invalidates session
    - clears session cookie
    - succeeds even without active session
  });

  describe('me', () => {
    - returns null when not authenticated
    - returns user data when authenticated
  });

  describe('whoami', () => {
    - throws UNAUTHORIZED when not authenticated
    - returns user data when authenticated
  });
});
```

#### Task 3.2: Auth E2E Tests

- **Assigned to**: QA Engineer
- **Priority**: Critical
- **Dependencies**: Tasks 1.1, 1.2
- **Acceptance Criteria**:
  - [ ] Create `e2e/auth.spec.ts` with full auth flow tests
  - [ ] Test registration flow with valid and invalid inputs
  - [ ] Test login flow with valid and invalid credentials
  - [ ] Test logout flow and session clearing
  - [ ] Test protected route access before/after login
  - [ ] Tests run across Chromium, Firefox, and WebKit
- **Implementation Notes**:
  - Use unique emails per test to avoid conflicts
  - Verify cookie behavior across browsers
  - Test "Remember me" functionality if implemented

**Test Scenarios:**

```typescript
// e2e/auth.spec.ts
test.describe('Authentication', () => {
  test.describe('Registration', () => {
    - shows validation errors for empty fields
    - shows error for invalid email format
    - shows error for short password
    - shows error for mismatched passwords
    - successfully registers new user
    - redirects to dashboard after registration
  });

  test.describe('Login', () => {
    - shows validation errors for empty fields
    - shows error for invalid credentials
    - successfully logs in existing user
    - redirects to dashboard after login
    - persists session across page reload
  });

  test.describe('Logout', () => {
    - successfully logs out user
    - redirects to login page
    - clears session cookie
    - cannot access protected routes after logout
  });

  test.describe('Protected Routes', () => {
    - redirects unauthenticated user to login
    - allows authenticated user access
  });
});
```

#### Task 3.3: Auth Accessibility Tests

- **Assigned to**: QA Engineer
- **Priority**: High
- **Dependencies**: Task 3.2
- **Acceptance Criteria**:
  - [ ] Create `e2e/auth-a11y.spec.ts` with accessibility tests
  - [ ] Login page passes axe-core WCAG 2.1 AA
  - [ ] Register page passes axe-core WCAG 2.1 AA
  - [ ] Form errors are announced to screen readers
  - [ ] Focus management is correct after form submission
- **Implementation Notes**:
  - Use `@axe-core/playwright` for automated accessibility testing
  - Manually verify screen reader announcements
  - Test with keyboard-only navigation

---

### Phase 4: Workspace and Multi-Tenancy Tests

**Priority: Critical | Estimated Effort: 12-16 hours**

Testing workspace isolation and multi-tenancy security - critical for data protection.

#### Task 4.1: Workspace Repository Integration Tests

- **Assigned to**: Backend Developer
- **Priority**: Critical
- **Dependencies**: Task 1.3
- **Acceptance Criteria**:
  - [ ] Extend `src/server/repositories/__tests__/workspace-isolation.test.ts`
  - [ ] Convert skipped integration tests to real database tests
  - [ ] Verify cross-tenant data isolation for all entity types
  - [ ] Test cursor-based pagination
  - [ ] Test all CRUD operations with workspace scoping
- **Implementation Notes**:
  - Use test database with transaction rollback
  - Create two test workspaces for isolation testing
  - Reference existing unit tests for patterns

**Test Cases to Implement:**

```typescript
describe('WorkspaceRepository Integration', () => {
  describe('Videos', () => {
    - getVideos only returns videos from current workspace
    - getVideo returns null for video in different workspace
    - createVideo assigns correct workspace ID
    - updateVideo fails silently for video in different workspace
    - deleteVideo fails silently for video in different workspace
    - pagination works correctly with cursor
    - filtering by status works correctly
  });

  describe('Documents', () => {
    - documents are scoped via video workspace
    - cannot access document from different workspace
    - cannot create document for video in different workspace
  });

  describe('Categories', () => {
    - categories are workspace-scoped
    - cannot access category from different workspace
  });

  describe('Video Categories', () => {
    - cannot assign category from different workspace
    - cannot view categories from video in different workspace
  });

  describe('Audit Log', () => {
    - audit logs are workspace-scoped
    - cannot view audit logs from different workspace
  });
});
```

#### Task 4.2: Workspace Context Hook Tests

- **Assigned to**: Frontend Developer
- **Priority**: High
- **Dependencies**: None
- **Acceptance Criteria**:
  - [ ] Create `src/lib/workspace/__tests__/context.test.tsx`
  - [ ] Test `useWorkspace` hook throws outside provider
  - [ ] Test `useWorkspaceId` returns correct ID
  - [ ] Test `useHasRole` with different role hierarchies
  - [ ] Test `useCanEdit` and `useIsOwner` convenience hooks
- **Implementation Notes**:
  - Use `renderHook` from Testing Library
  - Mock WorkspaceContext provider for different scenarios
  - Test error boundaries

**Test Cases:**

```typescript
// src/lib/workspace/__tests__/context.test.tsx
describe('Workspace Context Hooks', () => {
  describe('useWorkspace', () => {
    - throws when used outside provider
    - returns context value when inside provider
  });

  describe('useWorkspaceId', () => {
    - returns workspace ID when workspace exists
    - returns null when no workspace
  });

  describe('useHasRole', () => {
    - returns false when no role
    - owner has access to all roles
    - editor has access to editor and viewer
    - viewer only has access to viewer
  });

  describe('useCanEdit', () => {
    - returns true for owner
    - returns true for editor
    - returns false for viewer
    - returns false when no role
  });

  describe('useIsOwner', () => {
    - returns true only for owner role
  });
});
```

#### Task 4.3: Workspace Middleware Tests

- **Assigned to**: Backend Developer
- **Priority**: High
- **Dependencies**: Task 4.1
- **Acceptance Criteria**:
  - [ ] Create `src/server/trpc/middleware/__tests__/workspace.test.ts`
  - [ ] Test middleware extracts workspace ID from header
  - [ ] Test middleware validates user workspace access
  - [ ] Test single-tenant mode auto-selects workspace
  - [ ] Test NOT_FOUND response for invalid workspace (prevents enumeration)
- **Implementation Notes**:
  - Mock database for unit tests
  - Integration tests should use real database
  - Test both single-tenant and multi-tenant modes

---

### Phase 5: Integration Tests

**Priority: High | Estimated Effort: 8-12 hours**

Testing component + service interactions and complex flows.

#### Task 5.1: tRPC Client Integration Tests

- **Assigned to**: Frontend Developer
- **Priority**: High
- **Dependencies**: Tasks 1.3, 3.1
- **Acceptance Criteria**:
  - [ ] Create `src/lib/trpc/__tests__/client.test.ts`
  - [ ] Test tRPC client configuration
  - [ ] Test error handling and transformation
  - [ ] Test React Query integration
- **Implementation Notes**:
  - Use MSW to mock tRPC responses
  - Test loading, error, and success states
  - Verify retry behavior on network errors

#### Task 5.2: Auth Form Integration Tests

- **Assigned to**: Frontend Developer
- **Priority**: High
- **Dependencies**: Tasks 2.1, 3.1
- **Acceptance Criteria**:
  - [ ] Create `src/app/(auth)/__tests__/login.test.tsx`
  - [ ] Create `src/app/(auth)/__tests__/register.test.tsx`
  - [ ] Test form submission with mocked tRPC
  - [ ] Test error display from server responses
  - [ ] Test loading states during submission
  - [ ] Test redirect on successful auth
- **Implementation Notes**:
  - Mock `next/navigation` router
  - Mock tRPC mutations
  - Test both client-side and server-side validation errors

**Test Cases:**

```typescript
// src/app/(auth)/__tests__/login.test.tsx
describe('LoginPage', () => {
  - renders login form
  - shows client-side validation errors
  - submits form with valid data
  - shows server error message
  - shows loading state during submission
  - disables form during submission
  - redirects on successful login
});

// src/app/(auth)/__tests__/register.test.tsx
describe('RegisterPage', () => {
  - renders registration form
  - validates email format
  - validates password length
  - validates password confirmation match
  - submits form with valid data
  - shows server error message
  - redirects on successful registration
});
```

---

### Phase 6: E2E User Flow Tests

**Priority: High | Estimated Effort: 10-14 hours**

End-to-end tests for critical user journeys.

#### Task 6.1: Video CRUD E2E Tests (Future)

- **Assigned to**: QA Engineer
- **Priority**: High (when video features implemented)
- **Dependencies**: Video feature implementation
- **Acceptance Criteria**:
  - [ ] Create `e2e/video-crud.spec.ts`
  - [ ] Test create video flow
  - [ ] Test edit video flow
  - [ ] Test delete video flow
  - [ ] Test video list filtering
  - [ ] Test video status transitions
- **Implementation Notes**:
  - Placeholder until video CRUD is implemented
  - Reference ADR-005 for example patterns

#### Task 6.2: Document Editor E2E Tests (Future)

- **Assigned to**: QA Engineer
- **Priority**: High (when document features implemented)
- **Dependencies**: Document feature implementation
- **Acceptance Criteria**:
  - [ ] Create `e2e/document-editor.spec.ts`
  - [ ] Test markdown editing
  - [ ] Test auto-save functionality
  - [ ] Test document version history
- **Implementation Notes**:
  - Placeholder until document editor is implemented
  - May need special handling for CodeMirror/markdown editor

#### Task 6.3: Cross-Browser Compatibility Tests

- **Assigned to**: QA Engineer
- **Priority**: Medium
- **Dependencies**: Tasks 3.2, 6.1, 6.2
- **Acceptance Criteria**:
  - [ ] All E2E tests pass on Chromium
  - [ ] All E2E tests pass on Firefox
  - [ ] All E2E tests pass on WebKit
  - [ ] Mobile viewport tests pass (Pixel 5, iPhone 12)
  - [ ] Document any browser-specific issues
- **Implementation Notes**:
  - Playwright config already includes all browsers
  - Run full suite on PR and main branch
  - Use `test.skip` with browser condition for known issues

---

### Phase 7: Accessibility and Visual Tests

**Priority: High | Estimated Effort: 6-8 hours**

Comprehensive accessibility testing and optional visual regression.

#### Task 7.1: Full Page Accessibility Tests

- **Assigned to**: QA Engineer
- **Priority**: High
- **Dependencies**: Tasks 3.3
- **Acceptance Criteria**:
  - [ ] Create `e2e/accessibility.spec.ts`
  - [ ] Test all pages for WCAG 2.1 AA compliance
  - [ ] Document any intentional exclusions with rationale
  - [ ] Create accessibility testing checklist
- **Implementation Notes**:
  - Use `@axe-core/playwright` for automated testing
  - Exclude third-party widgets if they have known issues
  - Manual testing checklist for screen readers

**Test Scenarios:**

```typescript
// e2e/accessibility.spec.ts
test.describe('Accessibility', () => {
  test.describe('Public Pages', () => {
    - homepage is accessible
    - login page is accessible
    - register page is accessible
  });

  test.describe('Authenticated Pages', () => {
    - dashboard is accessible
    - video list is accessible
    - video editor is accessible (exclude markdown editor)
  });

  test.describe('Keyboard Navigation', () => {
    - can navigate login form with keyboard only
    - can navigate register form with keyboard only
    - focus trap works in modals
  });
});
```

#### Task 7.2: Storybook Accessibility Integration

- **Assigned to**: Frontend Developer
- **Priority**: High
- **Dependencies**: Tasks 2.1, 2.3
- **Acceptance Criteria**:
  - [ ] Create `.storybook/test-runner.ts` with a11y checks
  - [ ] All stories pass axe-core checks
  - [ ] Document any intentional a11y rule exclusions
  - [ ] Add a11y testing to CI pipeline
- **Implementation Notes**:
  - Reference ADR-005 for test-runner configuration
  - Use `checkA11y` from `axe-playwright`
  - Configure rule exceptions in test-runner config

#### Task 7.3: Visual Regression Setup (Optional)

- **Assigned to**: Frontend Developer
- **Priority**: Low
- **Dependencies**: Phase 2 complete
- **Acceptance Criteria**:
  - [ ] Evaluate Chromatic free tier
  - [ ] Set up visual regression if approved
  - [ ] Document visual testing workflow
  - [ ] Create baseline snapshots
- **Implementation Notes**:
  - Per ADR-005: Start without visual regression
  - Add when component library is mature
  - Consider Playwright screenshots as fallback

---

### Phase 8: CI/CD Integration

**Priority: High | Estimated Effort: 4-6 hours**

Integrate all tests into CI/CD pipeline.

#### Task 8.1: GitHub Actions Test Workflow

- **Assigned to**: DevOps/Backend Developer
- **Priority**: High
- **Dependencies**: Phases 1-5 complete
- **Acceptance Criteria**:
  - [ ] Create `.github/workflows/test.yml`
  - [ ] Unit tests run on every push
  - [ ] Storybook tests run on every push
  - [ ] E2E tests run on PR and main branch
  - [ ] Coverage reports uploaded to codecov
  - [ ] Test artifacts preserved on failure
- **Implementation Notes**:
  - Reference ADR-005 CI Workflow section
  - Use PostgreSQL service container for E2E
  - Cache node_modules and Playwright browsers

**Workflow Structure:**

```yaml
# .github/workflows/test.yml
jobs:
  unit: # Fast, runs on every push
  storybook: # Medium, runs on every push
  e2e: # Slow, runs on PR and main
```

#### Task 8.2: Test Coverage Requirements

- **Assigned to**: Tech Lead
- **Priority**: Medium
- **Dependencies**: Task 8.1
- **Acceptance Criteria**:
  - [ ] Configure coverage thresholds in vitest.config.ts
  - [ ] Set up coverage gates in CI
  - [ ] Create coverage badge for README
  - [ ] Document coverage requirements
- **Implementation Notes**:
  - Current thresholds: 50% (start low, increase)
  - Target thresholds: 80% for unit tests
  - Consider branch-specific thresholds

---

## Risk Assessment

### High Risk

- **Test Database Isolation**: Without proper isolation, tests could affect production data
  - Mitigation: Use separate test database, transaction rollback per test
- **Flaky E2E Tests**: Timing-dependent tests cause CI failures
  - Mitigation: Explicit waits, retry mechanism, trace on failure
- **Security Test Gaps**: Missing workspace isolation tests could allow data leaks
  - Mitigation: Prioritize Phase 4, implement comprehensive isolation tests

### Medium Risk

- **Test Maintenance Burden**: Tests may become outdated as code changes
  - Mitigation: Colocate tests with code, use component composition
- **CI Duration**: E2E tests may slow down deployment cycle
  - Mitigation: Parallel execution, smoke tests for quick feedback
- **Coverage Gaps**: Some code paths may be hard to test
  - Mitigation: Document untestable code, add manual testing checklist

### Low Risk

- **Browser Compatibility**: Edge cases in different browsers
  - Mitigation: Playwright multi-browser testing, document known issues

---

## Success Metrics

| Metric                     | Current | Target      | Timeline |
| -------------------------- | ------- | ----------- | -------- |
| Unit Test Coverage         | ~50%    | 80%+        | 4 weeks  |
| Component Story Coverage   | ~10%    | 90%+        | 4 weeks  |
| E2E Critical Path Coverage | ~20%    | 100%        | 6 weeks  |
| CI Test Duration           | N/A     | <10 min     | 2 weeks  |
| Accessibility Compliance   | Unknown | WCAG 2.1 AA | 4 weeks  |

---

## Timeline Estimate

| Phase                  | Estimated Effort | Dependencies           | Priority |
| ---------------------- | ---------------- | ---------------------- | -------- |
| Phase 1: Foundation    | 4-6 hours        | None                   | Critical |
| Phase 2: UI Components | 8-12 hours       | Phase 1                | High     |
| Phase 3: Auth System   | 10-14 hours      | Phase 1                | Critical |
| Phase 4: Workspace     | 12-16 hours      | Phase 1                | Critical |
| Phase 5: Integration   | 8-12 hours       | Phases 1-4             | High     |
| Phase 6: E2E Flows     | 10-14 hours      | Feature implementation | High     |
| Phase 7: Accessibility | 6-8 hours        | Phases 2, 3            | High     |
| Phase 8: CI/CD         | 4-6 hours        | Phases 1-5             | High     |

**Total Estimated Effort**: 62-88 hours (2-3 weeks full-time, 4-6 weeks part-time)

**Critical Path**: Phase 1 -> Phase 3 -> Phase 4 -> Phase 8

---

## Implementation Priority Order

1. **Week 1 (Critical)**
   - Task 1.1: E2E Test Helpers
   - Task 1.2: Smoke Test Suite
   - Task 1.3: Test Utilities
   - Task 3.1: Auth Router Tests

2. **Week 2 (High Priority)**
   - Task 2.1: Input Component Tests
   - Task 3.2: Auth E2E Tests
   - Task 4.1: Workspace Repository Tests
   - Task 4.2: Workspace Context Tests

3. **Week 3 (High Priority)**
   - Task 4.3: Workspace Middleware Tests
   - Task 5.1: tRPC Client Tests
   - Task 5.2: Auth Form Integration Tests
   - Task 7.1: Full Page A11y Tests

4. **Week 4 (Medium Priority)**
   - Task 2.2: Component Test Patterns
   - Task 3.3: Auth A11y Tests
   - Task 7.2: Storybook A11y Integration
   - Task 8.1: GitHub Actions Workflow
   - Task 8.2: Coverage Requirements

5. **Ongoing (As Features Built)**
   - Task 2.3: Future UI Components
   - Task 6.1: Video CRUD E2E
   - Task 6.2: Document Editor E2E
   - Task 6.3: Cross-Browser Tests
   - Task 7.3: Visual Regression (Optional)

---

## Appendix: Existing Test Inventory

### Unit Tests (Vitest)

| File                                                            | Coverage | Status                        |
| --------------------------------------------------------------- | -------- | ----------------------------- |
| `src/components/ui/button/button.test.tsx`                      | Complete | Passing                       |
| `src/lib/auth/__tests__/password.test.ts`                       | Complete | Passing                       |
| `src/lib/auth/__tests__/session.test.ts`                        | Complete | Passing                       |
| `src/lib/auth/__tests__/rate-limit.test.ts`                     | Complete | Passing                       |
| `src/server/repositories/__tests__/workspace-isolation.test.ts` | Partial  | Passing (skipped integration) |

### Storybook Stories

| File                                          | Coverage | Status  |
| --------------------------------------------- | -------- | ------- |
| `src/components/ui/button/button.stories.tsx` | Complete | Passing |

### E2E Tests (Playwright)

| File              | Coverage    | Status  |
| ----------------- | ----------- | ------- |
| `e2e/app.spec.ts` | Basic smoke | Passing |

### Missing Tests (Priority)

| Component/Service    | Test Type          | Priority |
| -------------------- | ------------------ | -------- |
| Input component      | Stories + Unit     | High     |
| Auth router          | Unit               | Critical |
| Login page           | Integration        | High     |
| Register page        | Integration        | High     |
| Auth flows           | E2E                | Critical |
| Workspace hooks      | Unit               | High     |
| Workspace middleware | Unit + Integration | Critical |
| Full page a11y       | E2E                | High     |
