# E2E Test Remediation - Complete Strategy

## Overview

This directory contains the complete remediation plan for fixing 70+ failing E2E tests in the Streamline Studio CI pipeline.

## Quick Start

1. **Read**: `00-overview.md` - Executive summary and strategy
2. **Execute**: Plans 01-06 in sequential order
3. **Verify**: Run full E2E suite after each phase

## File Structure

```
e2e-remediation/
├── README.md (this file)           # Quick reference guide
├── 00-overview.md                  # Executive summary and strategy
├── plan-01-infrastructure.md       # P0: Fix standalone server startup (BLOCKING)
├── plan-02-test-configuration.md   # P1: Update Playwright config
├── plan-03-wcag-accessibility.md   # P1: Fix WCAG AAA → AA mismatch
├── plan-04-trpc-endpoints.md       # P2: Fix tRPC response format
├── plan-05-auth-tests.md           # P2: Fix login/registration tests
└── plan-06-remaining-tests.md      # P2: Fix smoke/rate-limit/conflict tests
```

## Execution Order

### Phase 1: Critical Infrastructure (BLOCKING)

```bash
# MUST execute first - blocks all other phases
1. Read plan-01-infrastructure.md
2. Update package.json start script
3. Verify server starts with standalone build
4. Commit and push to verify CI
```

### Phase 2: Test Configuration (REQUIRED)

```bash
# SHOULD execute second - improves test stability
1. Read plan-02-test-configuration.md
2. Update playwright.config.ts
3. Test locally with CI simulation
4. Commit and push
```

### Phase 3-6: Test Fixes (PARALLEL OR SEQUENTIAL)

```bash
# Can execute in parallel or sequentially after Phase 1-2

# Parallel execution (faster):
git checkout -b fix-wcag
git checkout -b fix-trpc
git checkout -b fix-auth
git checkout -b fix-remaining

# Sequential execution (simpler):
# Execute plans 03, 04, 05, 06 one at a time
```

## Priority Levels

- **P0 (Critical)**: Plan 01 - Blocks everything
- **P1 (High)**: Plans 02, 03 - Required for stability
- **P2 (Medium)**: Plans 04, 05, 06 - Fix specific tests

## Success Metrics

### Per-Phase Metrics

- Plan 01: Server starts in CI ✓
- Plan 02: Config warnings gone ✓
- Plan 03: ~14 accessibility tests pass ✓
- Plan 04: ~3 health check tests pass ✓
- Plan 05: ~20 auth tests pass ✓
- Plan 06: ~10 remaining tests pass ✓

### Final Success

- **88/88 E2E tests passing** in CI
- **Test execution time < 15 minutes**
- **No flaky tests** (retries not needed)
- **Zero failing jobs** in GitHub Actions

## Quick Reference

### Commands

```bash
# Run specific test categories
npm run test:smoke      # Smoke tests
npm run test:auth       # Auth tests
npm run test:a11y       # Accessibility tests
npm run test:e2e        # All E2E tests

# Simulate CI environment
CI=true npm run build
CI=true npm run test:e2e

# Debug specific test
npm run test:e2e:debug -- e2e/auth/login.spec.ts -g "renders login form"
```

### Files to Modify

| Plan | Files to Modify                                           | Lines Changed |
| ---- | --------------------------------------------------------- | ------------- |
| 01   | `package.json`                                            | 1 line        |
| 02   | `playwright.config.ts`                                    | ~20 lines     |
| 03   | `e2e/accessibility/wcag-compliance.spec.ts`               | ~30 lines     |
| 04   | `e2e/smoke/critical-paths.spec.ts`                        | ~10 lines     |
| 05   | `e2e/auth/login.spec.ts`, `e2e/auth/registration.spec.ts` | ~50 lines     |
| 06   | Multiple test files                                       | ~40 lines     |

**Total**: ~150 lines of changes across 6 files

## Risk Management

### Low Risk

- Plan 03: Only changes test expectations
- Plan 04: Only fixes assertions

### Medium Risk

- Plan 02: Changes global config
- Plan 05: Updates critical path tests
- Plan 06: Multiple files

### High Risk

- Plan 01: Changes server startup (affects all environments)
  - **Mitigation**: Aligns with Next.js best practices
  - **Rollback**: Simple one-line revert

## Rollback Strategy

Each plan includes detailed rollback instructions. All changes are isolated and can be reverted independently.

Quick rollback:

```bash
# Revert specific commit
git revert <commit-hash>

# Or reset to previous state
git reset --hard <previous-commit>
```

## Dependencies

### External Dependencies

- Playwright @1.49.1 ✓ (installed)
- @axe-core/playwright @4.10.1 ✓ (installed)
- Next.js 15.1.3 standalone mode ✓ (configured)
- PostgreSQL 16 ✓ (CI service)

### Internal Dependencies

```
Plan 01 (Infrastructure)
    ↓ BLOCKS
Plan 02 (Configuration)
    ↓ ENABLES
Plans 03-06 (Test Fixes)
    ↓ RESULTS IN
88/88 Tests Passing
```

## CI Configuration

### GitHub Actions Workflow

File: `.github/workflows/ci.yml`

E2E job already configured with:

- PostgreSQL service ✓
- Node.js 20 ✓
- Playwright browsers ✓
- Environment variables ✓
- Build artifacts ✓

### Required Environment Variables

```yaml
DATABASE_URL: postgresql://postgres:postgres@127.0.0.1:5432/streamline_test
MODE: single-tenant
SESSION_SECRET: test-secret-for-ci-only-do-not-use-in-production
DATA_DIR: /tmp/streamline-data
NODE_ENV: production
```

## Testing Strategy

### Before Each Phase

1. Read the plan document thoroughly
2. Understand the root cause
3. Verify assumptions locally
4. Make changes incrementally
5. Test locally before pushing

### After Each Phase

1. Run affected tests locally
2. Verify CI passes
3. Check for regressions
4. Document any issues
5. Proceed to next phase

### Final Verification

```bash
# 1. Run full suite locally
npm run test:e2e

# 2. Verify CI passes
git push origin <branch>
# Check GitHub Actions

# 3. Verify metrics
# - All 88 tests pass
# - Execution time < 15 minutes
# - No retries needed
```

## Troubleshooting

### Server Won't Start in CI

→ Check Plan 01 implementation
→ Verify `npm run start` uses standalone server
→ Check `.next/standalone/server.js` exists

### Tests Timeout

→ Check Plan 02 configuration
→ Verify timeout values appropriate
→ Add explicit waits in tests

### Accessibility Tests Fail

→ Check Plan 03 implementation
→ Verify AAA rules disabled
→ Confirm UI meets AA standards

### tRPC Tests Fail

→ Check Plan 04 implementation
→ Inspect actual response format
→ Update assertions to match

### Auth Tests Fail

→ Check Plan 05 implementation
→ Verify selectors match HTML
→ Add hydration waits

### Other Tests Fail

→ Check Plan 06 implementation
→ Review specific test requirements
→ Consider skipping inappropriate tests

## Resources

### Documentation

- [Next.js Standalone Output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Playwright CI Best Practices](https://playwright.dev/docs/ci)
- [WCAG 2.1 AA Guidelines](https://www.w3.org/WAI/WCAG21/quickref/?levels=aa)
- [tRPC v11 Documentation](https://trpc.io/docs)

### Project Documentation

- `/CLAUDE.md` - Project overview
- `/CONTRIBUTING.md` - Development workflow
- `/docs/adrs/005-testing-strategy.md` - Testing strategy
- `/docs/adrs/014-security-architecture.md` - Security requirements

### Related Project Management

- `/project-management/README.md` - Overall project status
- `/project-management/e2e-audit-findings.md` - Initial audit
- `/project-management/e2e-fix-summary.md` - Previous fix attempts

## Support

### Questions or Issues?

1. Review the specific plan document
2. Check troubleshooting section above
3. Review related ADRs and documentation
4. Escalate to Project Orchestrator if blocked

### Need to Adjust Strategy?

1. Document the reason
2. Update affected plan documents
3. Communicate changes to team
4. Update this README

## Status Tracking

Update this section as phases complete:

- [ ] Plan 01: Infrastructure (P0) - **BLOCKED**
- [ ] Plan 02: Configuration (P1) - **PENDING**
- [ ] Plan 03: WCAG (P1) - **PENDING**
- [ ] Plan 04: tRPC (P2) - **PENDING**
- [ ] Plan 05: Auth (P2) - **PENDING**
- [ ] Plan 06: Remaining (P2) - **PENDING**

---

**Last Updated**: 2025-12-12
**Status**: Ready for execution
**Total Estimated Time**: 2-3 hours
**Owner**: Project Orchestrator
**Reviewers**: Senior Developer, QA Architect
