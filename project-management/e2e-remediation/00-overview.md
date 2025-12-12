# E2E Test Remediation - Overview

## Executive Summary

The E2E test suite is experiencing **70+ test failures out of 88 total tests** in the CI environment. Root cause analysis reveals critical infrastructure issues rather than application bugs. This document outlines a systematic remediation strategy organized into 6 sequential phases.

## Root Cause Analysis

### P0 - Critical Infrastructure Failure

**The server is not starting correctly in CI**, causing all form-based tests to fail.

- **Issue**: `playwright.config.ts` uses `npm run start` in CI mode
- **Problem**: `next start` doesn't work with `output: standalone` configuration
- **Impact**: Server never starts properly, all E2E tests fail
- **Required Fix**: Use `node .next/standalone/server.js` instead

### P1 - Test Configuration Mismatch

**WCAG accessibility tests target the wrong compliance level**, causing 14+ accessibility test failures.

- **Issue**: Tests check for WCAG AAA (7:1 contrast ratio)
- **Problem**: Project target is WCAG AA (4.5:1 contrast ratio)
- **Impact**: Valid AA-compliant UI fails AAA tests
- **Required Fix**: Update axe-core tags to exclude AAA rules

### P2 - tRPC Response Format Mismatch

**Health check tests expect wrong tRPC response format**, causing API tests to fail.

- **Issue**: Tests expect `body.result?.data?.status`
- **Problem**: Actual tRPC v11 format differs
- **Impact**: Health endpoint tests fail despite working API
- **Required Fix**: Update response format expectations

### P3 - Test Selector Instability

**Many test selectors target elements that exist but with different attributes**, causing intermittent failures.

- **Issue**: Selectors look for specific text/attributes that don't match
- **Problem**: Test selectors not aligned with actual rendered HTML
- **Impact**: Valid UI elements not found by tests
- **Required Fix**: Update selectors to match actual DOM structure

## Remediation Strategy

### Phase Execution Order

The phases MUST be executed in this order due to dependencies:

```
Plan 01 (Infrastructure) → REQUIRED FOR ALL OTHER PHASES
    ↓
Plan 02 (Test Config) → REQUIRED BEFORE RUNNING TESTS
    ↓
Plan 03 (WCAG) → Can run in parallel with Plans 04-06
Plan 04 (tRPC) → Can run in parallel with Plans 03, 05-06
Plan 05 (Auth) → Can run in parallel with Plans 03-04, 06
Plan 06 (Misc) → Can run in parallel with Plans 03-05
```

### Phase 1: Infrastructure Fix (BLOCKING)

**Status**: MUST COMPLETE FIRST
**Files**: 1 file to modify
**Est. Time**: 15 minutes
**Impact**: Unblocks ALL other tests

Fix the standalone build server startup issue in CI. Without this fix, no E2E tests will pass.

### Phase 2: Test Configuration (BLOCKING)

**Status**: MUST COMPLETE SECOND
**Files**: 1 file to modify
**Est. Time**: 10 minutes
**Impact**: Correct test environment setup

Update Playwright config with proper timeouts, CI detection, and environment settings.

### Phase 3: WCAG Accessibility Tests

**Status**: Can run after Phase 1-2
**Files**: 1 file to modify
**Est. Time**: 20 minutes
**Impact**: ~14 accessibility tests

Fix WCAG AAA → AA mismatch and update keyboard navigation tests.

### Phase 4: tRPC Endpoint Tests

**Status**: Can run after Phase 1-2
**Files**: 1 file to modify
**Est. Time**: 15 minutes
**Impact**: ~3 health check tests

Fix tRPC response format expectations.

### Phase 5: Auth Flow Tests

**Status**: Can run after Phase 1-2
**Files**: 2 files to modify
**Est. Time**: 30 minutes
**Impact**: ~20 login/registration tests

Fix login and registration form selectors and flow issues.

### Phase 6: Remaining Tests

**Status**: Can run after Phase 1-2
**Files**: 3 files to modify
**Est. Time**: 30 minutes
**Impact**: ~10 smoke/rate-limit/conflict tests

Fix smoke tests, rate limiting, and document conflict tests.

## Success Criteria

### Phase Completion Metrics

- **Phase 1**: Playwright web server starts successfully in CI
- **Phase 2**: All config values correct, no timeout warnings
- **Phase 3**: All WCAG AA tests pass (0 AAA tests)
- **Phase 4**: Health endpoint tests pass with correct format
- **Phase 5**: Login and registration flows complete successfully
- **Phase 6**: All remaining tests pass

### Final Success Criteria

- All 88 E2E tests pass in CI environment
- Test execution time < 15 minutes (current Chromium-only config)
- No flaky tests (retries not required)
- Accessibility tests verify WCAG AA compliance only
- All test files use correct selectors and assertions

## Test Execution Strategy

### CI Environment Requirements

```yaml
# Required environment variables (already in ci.yml)
DATABASE_URL: postgresql://postgres:postgres@127.0.0.1:5432/streamline_test
MODE: single-tenant
SESSION_SECRET: test-secret-for-ci-only-do-not-use-in-production
DATA_DIR: /tmp/streamline-data
NODE_ENV: production
```

### Pre-Test Setup (already in ci.yml)

1. PostgreSQL service running
2. Database migrations complete
3. Next.js build complete (standalone mode)
4. Setup flag created at `/tmp/streamline-data/.setup-complete`

### Test Verification Commands

After each phase, verify fixes locally before pushing:

```bash
# Local verification (with dev server)
npm run test:e2e -- <test-file>

# CI simulation (with production build)
npm run build
NODE_ENV=production npm run test:e2e -- <test-file>
```

After all phases, run full suite:

```bash
# Full test suite
npm run test:e2e

# Specific test categories
npm run test:smoke
npm run test:auth
npm run test:a11y
```

## Risk Assessment

### Low Risk

- Phase 3 (WCAG): Only changes test expectations, not application code
- Phase 4 (tRPC): Only fixes assertions, API works correctly

### Medium Risk

- Phase 2 (Config): Changes global timeout settings, may affect test stability
- Phase 5 (Auth): Updates critical path tests, must verify carefully
- Phase 6 (Misc): Multiple files, but isolated changes

### High Risk

- Phase 1 (Infrastructure): Changes how server starts in CI, affects all tests
  - Mitigation: Test thoroughly in CI environment
  - Rollback: Revert to `npm run start` if issues arise

## Dependencies

### External Dependencies

- Playwright @1.49.1 (already installed)
- @axe-core/playwright @4.10.1 (already installed)
- Next.js 15.1.3 with standalone mode (already configured)
- PostgreSQL 16 service (already in CI)

### Internal Dependencies

- Phase 1 MUST complete before any other phase
- Phase 2 SHOULD complete before phases 3-6
- Phases 3-6 can run in parallel after 1-2 complete

## Rollback Plan

If any phase causes regressions:

1. **Phase 1 Rollback**: Revert playwright.config.ts webServer command
2. **Phase 2 Rollback**: Revert playwright.config.ts timeout changes
3. **Phase 3 Rollback**: Revert wcag-compliance.spec.ts changes
4. **Phase 4 Rollback**: Revert critical-paths.spec.ts health check changes
5. **Phase 5 Rollback**: Revert login.spec.ts and registration.spec.ts changes
6. **Phase 6 Rollback**: Revert smoke/rate-limiting/conflict test changes

Each phase is isolated and can be rolled back independently.

## Next Steps

1. Review this overview with stakeholders
2. Execute Phase 1 (Infrastructure Fix)
3. Verify Phase 1 in CI environment
4. Execute Phase 2 (Test Configuration)
5. Execute Phases 3-6 in parallel or sequentially
6. Run full test suite and verify success
7. Document lessons learned

## References

### Key Files

- `/playwright.config.ts` - Playwright configuration
- `/next.config.ts` - Next.js standalone mode config
- `/.github/workflows/ci.yml` - CI workflow
- `/e2e/**/*.spec.ts` - E2E test files

### Documentation

- [Next.js Standalone Output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Playwright CI Documentation](https://playwright.dev/docs/ci-intro)
- [WCAG 2.1 AA Guidelines](https://www.w3.org/WAI/WCAG21/quickref/?versions=2.1&levels=aa)
- [tRPC v11 Response Format](https://trpc.io/docs/client/react)

### Related Documents

- `/project-management/e2e-audit-findings.md` - Initial audit
- `/project-management/e2e-fix-summary.md` - Previous fix attempts
- `/docs/adrs/005-testing-strategy.md` - Testing strategy ADR

---

**Last Updated**: 2025-12-12
**Status**: Ready for execution
**Owner**: Project Orchestrator
