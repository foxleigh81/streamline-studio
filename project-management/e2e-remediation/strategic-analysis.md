# E2E Test Remediation: Strategic Analysis

**Project:** E2E Test Suite Recovery and Stabilization
**Date:** 2025-12-12
**Author:** Strategic Project Planner
**Status:** Analysis Complete - Ready for Implementation

---

## Executive Summary

The E2E test suite has 88 tests with approximately 70+ failing in CI. The root cause is an infrastructure misconfiguration: Playwright is configured to run `npm run start` (which executes `next start`) in CI, but the project uses `output: standalone` mode. This means the Next.js server never starts correctly, causing all tests that require rendered pages to fail with timeouts.

This document provides a comprehensive remediation strategy with a clear golden path, risk assessment, and task breakdown.

---

## Golden Path Decision

### Explored Options

**Option A: Modify CI to use standalone server command**

- Change Playwright webServer command to `node .next/standalone/server.js`
- Requires copying static assets and public folder to standalone directory
- Most aligned with production deployment pattern

**Option B: Remove standalone output mode**

- Change `next.config.ts` to remove `output: 'standalone'`
- Would break Docker deployment strategy (ADR-001)
- Simpler Playwright config but wrong architectural direction

**Option C: Conditional build output based on environment**

- Use different output modes for different environments
- Complex, error-prone, violates parity principle

### Chosen Golden Path: Option A

**Rationale:**

1. Maintains architectural consistency with ADR-001 (Docker deployment)
2. Tests production-like behavior, not dev-mode behavior
3. Catches real deployment issues during E2E testing
4. Single fix unblocks the majority of failing tests (estimated 60+ tests)
5. Aligns with industry best practices for Next.js 15 testing

**Key Assumptions:**

1. The standalone build completes successfully in CI (verified - build job passes)
2. Static assets are accessible from the standalone server
3. Environment variables are properly passed to the standalone server
4. Database migrations complete before server starts

---

## Risk Assessment

### High Risk Items

| Risk                                   | Impact                     | Likelihood | Mitigation                                |
| -------------------------------------- | -------------------------- | ---------- | ----------------------------------------- |
| Standalone server fails to start in CI | All E2E tests blocked      | Medium     | Add health check wait loop before tests   |
| Static assets not copied correctly     | UI tests fail, CSS missing | Medium     | Explicit copy step in CI workflow         |
| Environment variables not inherited    | Auth/DB tests fail         | High       | Explicit env passing in Playwright config |
| Database not ready when server starts  | Connection errors          | Medium     | Add readiness probe in CI                 |

### Medium Risk Items

| Risk                      | Impact                  | Likelihood | Mitigation                             |
| ------------------------- | ----------------------- | ---------- | -------------------------------------- |
| Port conflicts in CI      | Server doesn't bind     | Low        | Use explicit PORT env variable         |
| Pino worker thread issues | Logging crashes server  | Medium     | Already externalized in next.config.ts |
| Rate limiting fails in CI | Auth tests inconsistent | Medium     | Use in-memory rate limiter for tests   |

### Rollback Strategy

If the standalone server fix causes regressions:

1. Revert Playwright config changes
2. Temporarily skip E2E tests in CI (`continue-on-error: true`)
3. Add `npm run dev` fallback for urgent PRs
4. Document issue and re-analyze

---

## Root Cause Analysis

### Primary Issue: Server Startup Failure

**Current Configuration (playwright.config.ts:78-84):**

```typescript
webServer: {
  command: process.env.CI ? 'npm run start' : 'npm run dev',
  // ...
}
```

**Problem:**

- `npm run start` executes `next start`
- Project has `output: 'standalone'` in next.config.ts
- Next.js emits warning: `"next start" does not work with "output: standalone"`
- Server either fails to start or starts incorrectly
- All page navigation tests timeout after 120 seconds

**Solution:**

```typescript
webServer: {
  command: process.env.CI
    ? 'node .next/standalone/server.js'
    : 'npm run dev',
  // ...
}
```

### Secondary Issues

#### 1. WCAG Contrast Tests (Low Priority)

**File:** `e2e/accessibility/wcag-compliance.spec.ts`
**Issue:** Tests use `['cat.color']` tag which tests for AAA contrast (7:1 ratio)
**Project Target:** WCAG 2.1 AA (4.5:1 ratio per ADR documentation)
**Impact:** ~10 tests may fail on contrast
**Fix:** Use `['wcag2aa']` for contrast testing or exclude enhanced contrast rules

#### 2. tRPC Response Format (Medium Priority)

**File:** `e2e/app.spec.ts:40`
**Issue:** Tests expect `body.result?.data?.status` format
**Actual Response:** May vary based on tRPC v11 response format
**Impact:** 2 tests
**Fix:** Update assertions to handle tRPC v11 response shape

#### 3. Already Fixed Issues

**Rate Limiting Tests:** Fixed on 2025-12-11 (16 instances)
**Conflict Resolution Tests:** Fixed on 2025-12-11 (3 instances)

---

## CI/CD Considerations for GitHub Actions

### Current CI Workflow Analysis

```yaml
# .github/workflows/ci.yml - e2e job
e2e:
  runs-on: ubuntu-latest
  steps:
    - name: Build Next.js application
      run: npm run build # Creates .next/standalone/
    - name: Run E2E tests
      run: npm run test:e2e # Starts server + runs tests
```

### Required Changes

1. **Copy static assets to standalone directory**

   ```yaml
   - name: Prepare standalone build
     run: |
       cp -r .next/static .next/standalone/.next/
       cp -r public .next/standalone/
   ```

2. **Set explicit environment variables**

   ```yaml
   - name: Run E2E tests
     env:
       DATABASE_URL: postgresql://postgres:postgres@127.0.0.1:5432/streamline_test
       SESSION_SECRET: test-secret-for-ci-only-do-not-use-in-production
       MODE: single-tenant
       DATA_DIR: /tmp/streamline-data
       NODE_ENV: production
       PORT: 3000
     run: npm run test:e2e
   ```

3. **Add server health check**
   - Playwright config already has 120s timeout
   - Consider adding explicit wait-for-url step if issues persist

### CI-Specific Behavior Differences

| Aspect         | Local Dev            | CI                                |
| -------------- | -------------------- | --------------------------------- |
| Server command | `npm run dev`        | `node .next/standalone/server.js` |
| Build mode     | JIT compilation      | Pre-built production              |
| Static assets  | Served by dev server | Must be copied manually           |
| Hot reload     | Enabled              | Disabled                          |
| Error detail   | Full stack traces    | Production error pages            |
| Rate limiting  | In-memory            | In-memory (Redis not configured)  |

---

## Estimated Impact Per Fix

| Fix                       | Tests Unblocked | Effort       | Priority |
| ------------------------- | --------------- | ------------ | -------- |
| Standalone server command | ~65 tests       | 2-4 hours    | CRITICAL |
| Static asset copying      | ~65 tests       | 30 min       | CRITICAL |
| tRPC response format      | 2 tests         | 1 hour       | MEDIUM   |
| WCAG contrast rules       | ~10 tests       | 1 hour       | LOW      |
| Selector fixes (done)     | ~15 tests       | Already done | COMPLETE |

**Total Expected Recovery:** ~82/88 tests (93%)

---

## Critical Considerations

### Security

- CI uses test secrets only (`test-secret-for-ci-only-do-not-use-in-production`)
- No real credentials in workflow files
- Test database is isolated (`streamline_test`)
- Rate limiting still active (in-memory mode)

### Performance

- Standalone build is production-optimized
- Tests run only on Chromium in CI (already optimized)
- 2 workers for parallelization
- 120s timeout is appropriate for CI

### Accessibility

- WCAG compliance tests should target AA not AAA
- axe-core rules need review for correct level
- Touch target tests (44x44px) are appropriate

---

## Task Breakdown

### Phase 1: Critical Infrastructure Fix (BLOCKING)

**Task 1.1: Update Playwright Configuration**

- **Assigned to:** senior-nextjs-developer
- **Priority:** Critical
- **Dependencies:** None
- **Acceptance Criteria:**
  - Playwright webServer command uses `node .next/standalone/server.js` in CI
  - Environment variables properly passed to standalone server
  - Local dev mode (`npm run dev`) unchanged
  - Timeout configuration remains 120 seconds
- **Implementation Notes:**
  - Modify playwright.config.ts lines 78-100
  - Test locally with `npm run build && node .next/standalone/server.js`
  - Verify server starts and responds to health check

**Task 1.2: Update CI Workflow for Standalone Build**

- **Assigned to:** senior-nextjs-developer
- **Priority:** Critical
- **Dependencies:** Task 1.1
- **Acceptance Criteria:**
  - Static assets copied to `.next/standalone/.next/static/`
  - Public folder copied to `.next/standalone/public/`
  - Explicit PORT=3000 set in environment
  - Health check passes before tests run
- **Implementation Notes:**
  - Modify `.github/workflows/ci.yml` e2e job
  - Add preparation step between build and test
  - Consider adding explicit wait-for step

**Task 1.3: Verify E2E Tests Pass in CI**

- **Assigned to:** qa-architect
- **Priority:** Critical
- **Dependencies:** Task 1.2
- **Acceptance Criteria:**
  - At least 80% of E2E tests pass (70+ tests)
  - No timeout failures related to server startup
  - All smoke tests pass
  - Health endpoint tests pass
- **Implementation Notes:**
  - Run full CI pipeline
  - Review Playwright report artifacts
  - Document any remaining failures

### Phase 2: Test Content Fixes (NON-BLOCKING)

**Task 2.1: Fix tRPC Response Format Assertions**

- **Assigned to:** senior-nextjs-developer
- **Priority:** Medium
- **Dependencies:** Phase 1 complete
- **Acceptance Criteria:**
  - `e2e/app.spec.ts` tRPC tests handle v11 response format
  - Tests pass locally and in CI
  - No false positives (tests actually validate response)
- **Implementation Notes:**
  - Check actual tRPC v11 response structure
  - May need to access `result.data` directly or handle batched response

**Task 2.2: Review WCAG Contrast Test Configuration**

- **Assigned to:** tron-user-advocate
- **Priority:** Low
- **Dependencies:** Phase 1 complete
- **Acceptance Criteria:**
  - Contrast tests target WCAG 2.1 AA (4.5:1 ratio)
  - No false failures for valid AA contrast
  - Document any genuine contrast issues found
- **Implementation Notes:**
  - Review `['cat.color']` axe-core tag behavior
  - Consider using `['wcag2aa']` or disabling enhanced contrast rule

### Phase 3: Documentation and Cleanup

**Task 3.1: Update Testing Documentation**

- **Assigned to:** senior-nextjs-developer
- **Priority:** Low
- **Dependencies:** Phase 1 and 2 complete
- **Acceptance Criteria:**
  - CONTRIBUTING.md updated with E2E testing section
  - Local E2E testing guide updated
  - CI behavior documented
- **Implementation Notes:**
  - Reference existing `docs/e2e-testing-local-setup.md`
  - Add CI-specific section

**Task 3.2: Create E2E Test Health Dashboard**

- **Assigned to:** qa-architect
- **Priority:** Low
- **Dependencies:** All tests passing
- **Acceptance Criteria:**
  - Track test pass rate over time
  - Alert on regression
  - Document baseline metrics
- **Implementation Notes:**
  - Could use Playwright JSON reporter output
  - GitHub Actions artifacts for historical tracking

---

## Agent Collaboration

| Agent                     | Role                             | Tasks              |
| ------------------------- | -------------------------------- | ------------------ |
| senior-nextjs-developer   | Implementation lead              | 1.1, 1.2, 2.1, 3.1 |
| qa-architect              | Test validation                  | 1.3, 3.2           |
| tron-user-advocate        | Accessibility review             | 2.2                |
| nextjs-security-architect | Review for security implications | On-call            |
| code-quality-enforcer     | Final code review                | All tasks          |

---

## Success Metrics

1. **E2E Pass Rate:** >= 95% (84/88 tests)
2. **CI Pipeline Time:** No increase > 5 minutes
3. **Flaky Test Rate:** < 5% (4 tests max)
4. **Zero Server Startup Failures:** 100% reliability

---

## Timeline Estimate

| Phase     | Effort         | Elapsed Time |
| --------- | -------------- | ------------ |
| Phase 1   | 4-6 hours      | 1 day        |
| Phase 2   | 2-3 hours      | 1 day        |
| Phase 3   | 2-3 hours      | 1 day        |
| **Total** | **8-12 hours** | **2-3 days** |

**Critical Path:** Task 1.1 -> Task 1.2 -> Task 1.3

---

## Appendix: Technical Reference

### Next.js Standalone Build Structure

```
.next/standalone/
  server.js           # Entry point
  .next/
    server/           # Server bundles
  node_modules/       # Minimal dependencies
  package.json        # Runtime manifest

# NOT included by default (must copy):
.next/static/         # Client bundles, CSS
public/               # Static assets
```

### Playwright Best Practices for Next.js 15

1. Use production builds for CI (matches deployment)
2. Wait for `networkidle` after navigation
3. Use explicit timeouts for CI environments
4. Pass environment variables explicitly (don't rely on inheritance)
5. Use single browser in CI for speed (Chromium recommended)

### GitHub Actions E2E Testing Checklist

- [ ] PostgreSQL service container running
- [ ] Database migrations complete
- [ ] Build artifacts present
- [ ] Static assets in correct location
- [ ] Environment variables set
- [ ] Server responds to health check
- [ ] Playwright browsers installed

---

## Conclusion

The E2E test failures are primarily caused by a single infrastructure issue: the mismatch between `npm run start` and standalone output mode. Fixing this will unblock the vast majority of tests. The secondary issues (tRPC response format, WCAG contrast) are minor and can be addressed after the critical fix is deployed.

The recommended approach is to proceed with Phase 1 immediately, validate in CI, and then address remaining issues in subsequent phases. This provides the fastest path to a stable E2E test suite while maintaining production deployment compatibility.
