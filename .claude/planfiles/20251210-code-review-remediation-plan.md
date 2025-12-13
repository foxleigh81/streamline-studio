# Project: Streamline Studio Code Review Remediation Plan

**Date:** December 10, 2025
**Version:** 1.0
**Source Reports:** 8 specialized code review documents
**Status:** Strategic Planning Complete

---

## Overview

This plan consolidates findings from eight specialized code review reports into a prioritized, actionable remediation roadmap. The codebase has been assessed as "conditionally production-ready" with a consensus rating of B+ (8.2/10). While the architectural foundations are excellent, several critical blockers and high-priority issues must be addressed before production deployment.

---

## Golden Path Decision

### Explored Options

1. **Sequential Approach:** Address all critical issues first, then high, then medium, regardless of domain.
2. **Domain-Based Approach:** Fix all security issues, then all TypeScript issues, then all UX issues.
3. **Dependency-Aware Batching:** Group related issues that share code locations or infrastructure, addressing them in waves that minimize merge conflicts and maximize efficiency.

### Chosen Golden Path

**Dependency-Aware Batching with Priority Gates**

This approach groups related issues by code location and shared infrastructure while maintaining strict priority ordering. Each phase has clear exit criteria before proceeding.

### Rationale

- Reduces context switching by keeping developers in related code areas.
- Minimizes merge conflicts by batching changes to the same files.
- Allows parallel work streams where dependencies permit.
- Maintains safety by ensuring critical security issues are resolved first.

### Key Assumptions

- The development team has access to a Redis instance or can provision one.
- TypeScript errors do not currently block the build process (strict mode violations are warnings).
- No production traffic is being served until Phase 1 is complete.

---

## Critical Considerations

### Security

- In-memory rate limiting is bypassable in multi-instance deployments.
- Missing CSP and HSTS headers expose the application to XSS and downgrade attacks.
- Environment variable defaults could leak to production.
- Client-side cookie setting in invitation flow exposes session tokens.

### Performance

- N+1 query pattern in setVideoCategories needs batch optimization.
- Missing lazy loading for heavy components (DocumentEditor).
- No Suspense/streaming for improved perceived performance.
- Missing database indexes on frequently queried columns.

### Accessibility

- Focus trap missing in category delete dialog (WCAG 2.4.3 violation).
- Color picker lacks semantic color names for screen readers.
- Loading states need ARIA live region announcements.
- Tab component missing proper ARIA pattern.

---

## Issue Inventory by Priority

### Critical Priority (Production Blockers)

| ID       | Issue                             | Source Reports                    | Files Affected             |
| -------- | --------------------------------- | --------------------------------- | -------------------------- |
| CRIT-001 | Missing React Error Boundaries    | Lead Dev, QA, NextJS, Strategic   | src/app/, src/components/  |
| CRIT-002 | In-memory rate limiting           | Lead Dev, Security, QA, Strategic | src/lib/auth/rate-limit.ts |
| CRIT-003 | Environment variable security     | Lead Dev, Security                | src/lib/env.ts             |
| CRIT-004 | 40+ TypeScript compilation errors | Code Quality                      | Multiple files             |

### High Priority

| ID       | Issue                                               | Source Reports              | Files Affected                              |
| -------- | --------------------------------------------------- | --------------------------- | ------------------------------------------- |
| HIGH-001 | Missing CSP headers                                 | Security                    | next.config.ts                              |
| HIGH-002 | Missing HSTS header                                 | Security                    | next.config.ts                              |
| HIGH-003 | Client-side cookie setting in invite flow           | Security                    | src/app/(auth)/invite/[token]/page.tsx      |
| HIGH-004 | Missing loading.tsx files                           | NextJS, QA, Strategic       | src/app/(app)/w/[slug]/\*/                  |
| HIGH-005 | Category filtering throws NOT_IMPLEMENTED           | Code Quality, Lead Dev      | src/server/trpc/routers/video.ts            |
| HIGH-006 | DocumentEditor not integrated (stale Phase 2B refs) | Lead Dev, QA                | src/app/(app)/w/[slug]/videos/[id]/page.tsx |
| HIGH-007 | Console statements in production code (30+)         | Code Quality, QA, Security  | Multiple files                              |
| HIGH-008 | Test coverage at 50% vs ADR target of 80%           | Code Quality, QA, Strategic | vitest.config.ts                            |

### Medium Priority

| ID      | Issue                                       | Source Reports         | Files Affected                                               |
| ------- | ------------------------------------------- | ---------------------- | ------------------------------------------------------------ |
| MED-001 | Focus trap missing in delete dialog         | TRON, QA               | src/app/(app)/w/[slug]/categories/categories-page-client.tsx |
| MED-002 | Color picker lacks semantic names           | TRON                   | src/components/category/color-picker/color-picker.tsx        |
| MED-003 | Loading states need ARIA live regions       | TRON                   | Multiple pages                                               |
| MED-004 | N+1 query in setVideoCategories             | NextJS, Lead Dev       | src/server/repositories/workspace-repository.ts              |
| MED-005 | Inconsistent error handling patterns        | Code Quality           | src/server/repositories/, src/server/trpc/routers/           |
| MED-006 | Unused state setters in WorkspaceProvider   | Code Quality           | src/lib/workspace/provider.tsx                               |
| MED-007 | Logout form points to non-existent endpoint | Code Quality, Lead Dev | src/components/layout/app-shell/app-shell.tsx                |
| MED-008 | Missing empty states for lists              | TRON, QA               | Video/Document/Category lists                                |
| MED-009 | Tab component missing ARIA pattern          | QA                     | src/app/(app)/w/[slug]/videos/[id]/page.tsx                  |
| MED-010 | Duplicated statusColors/statusLabels        | Lead Dev, QA           | Multiple components                                          |
| MED-011 | Global idCounter SSR hydration issue        | Lead Dev               | src/lib/accessibility/aria.ts                                |
| MED-012 | Non-constant time token comparison          | Security               | src/server/trpc/routers/invitation.ts                        |
| MED-013 | Session token returned in response          | Security               | src/server/trpc/routers/invitation.ts                        |

### Low Priority

| ID      | Issue                                    | Source Reports         | Files Affected                                               |
| ------- | ---------------------------------------- | ---------------------- | ------------------------------------------------------------ |
| LOW-001 | Emoji icons inconsistency                | Code Quality, TRON     | src/components/layout/app-shell/app-shell.tsx                |
| LOW-002 | Magic numbers not centralized            | Code Quality, Lead Dev | Multiple files                                               |
| LOW-003 | Import order inconsistency               | Code Quality           | src/test/helpers/render.tsx                                  |
| LOW-004 | Hardcoded DEFAULT_CATEGORY_COLOR         | Code Quality           | src/app/(app)/w/[slug]/categories/categories-page-client.tsx |
| LOW-005 | Missing lazy loading for DocumentEditor  | QA                     | src/components/document/document-editor/                     |
| LOW-006 | Missing React.memo on list items         | QA                     | src/components/team/member-list/member-list.tsx              |
| LOW-007 | tRPC v11 RC instead of stable            | Lead Dev, Strategic    | package.json                                                 |
| LOW-008 | @types/marked deprecated                 | Strategic              | package.json                                                 |
| LOW-009 | Missing breadcrumbs in deep routes       | TRON                   | Video/document detail pages                                  |
| LOW-010 | Missing keyboard shortcuts help          | TRON                   | Application-wide                                             |
| LOW-011 | Setup flag file permissions              | Security               | src/lib/setup.ts                                             |
| LOW-012 | Unused \_enableRevisionHistory parameter | Lead Dev               | src/components/document/document-editor/document-editor.tsx  |

---

## Task Breakdown

### Phase 1: Production Blockers (Critical)

**Exit Criteria:** All critical issues resolved, TypeScript compiles without errors, CI passes.

#### Task 1.1: Implement React Error Boundaries

**Assigned to:** frontend-agent
**Priority:** Critical
**Dependencies:** None
**Files to Create:**

- src/components/error-boundary/error-boundary.tsx
- src/components/error-boundary/index.ts
- src/app/error.tsx
- src/app/global-error.tsx
- src/app/(app)/w/[slug]/videos/error.tsx
- src/app/(app)/w/[slug]/documents/error.tsx
- src/app/(app)/w/[slug]/categories/error.tsx
- src/app/(app)/w/[slug]/team/error.tsx

**Acceptance Criteria:**

- ErrorBoundary component created with proper TypeScript types.
- Route-level error.tsx files created for all major routes.
- global-error.tsx handles root-level errors.
- Errors are logged before rendering fallback UI.
- User-friendly error messages with retry functionality.

**Implementation Notes:**

- Use class component for ErrorBoundary (required by React).
- Integrate with future structured logging.
- Include "Report Issue" link in error UI.

---

#### Task 1.2: Implement Redis-Based Rate Limiting

**Assigned to:** backend-agent
**Priority:** Critical
**Dependencies:** None
**Files to Modify:**

- src/lib/auth/rate-limit.ts
- src/lib/env.ts (add REDIS_URL)

**Acceptance Criteria:**

- Rate limiting persists across server restarts.
- Rate limiting works across multiple server instances.
- Graceful fallback if Redis is unavailable (fail-open with warning, or fail-closed based on configuration).
- Memory leak eliminated.
- Existing rate limit logic preserved (window size, max requests, exponential backoff).

**Implementation Notes:**

- Use @upstash/redis or ioredis depending on deployment target.
- Add REDIS_URL to environment schema with optional default for development.
- Maintain backward compatibility with in-memory mode for local development.

---

#### Task 1.3: Harden Environment Variable Security

**Assigned to:** backend-agent
**Priority:** Critical
**Dependencies:** None
**Files to Modify:**

- src/lib/env.ts

**Acceptance Criteria:**

- No development defaults for DATABASE_URL or SESSION_SECRET.
- Clear error messages when required variables are missing.
- Validation fails fast at application startup.
- Documentation updated with required environment variables.

**Implementation Notes:**

- Remove conditional defaults based on NODE_ENV.
- Consider separate env schema for development vs production.
- Update docker-compose.yml and setup-wizard.sh if needed.

---

#### Task 1.4: Fix TypeScript Compilation Errors

**Assigned to:** fullstack-agent
**Priority:** Critical
**Dependencies:** None
**Files to Modify:**

- src/app/(app)/w/[slug]/categories/categories-page-client.tsx (lines 80, 120, 158, 235)
- src/lib/auth/workspace.ts (line 51)
- src/lib/accessibility/contrast.ts (lines 15-17, 33)
- src/server/trpc/routers/video.ts (lines 115, 170, 229)
- src/lib/trpc/**tests**/client.test.tsx (lines 60, 73, 87+)
- src/app/(app)/w/[slug]/videos/page.tsx (line 121)

**Acceptance Criteria:**

- `npx tsc --noEmit` produces zero errors.
- All exactOptionalPropertyTypes violations resolved.
- Test infrastructure type errors fixed.
- No new type assertions or `any` types introduced.

**Implementation Notes:**

- Fix useState<'#6B7280'> to useState<string>.
- Update UserValidationResult interface (username -> name).
- Add null checks for regex match results.
- Add transformer: superjson to test httpBatchLink calls.
- Fix categoryIds type error on videos page.

---

### Phase 2: Security Hardening (High Priority)

**Exit Criteria:** All security headers configured, cookie handling secure, security audit passing.

#### Task 2.1: Add Security Headers (CSP and HSTS)

**Assigned to:** backend-agent
**Priority:** High
**Dependencies:** Task 1.3 (env hardening)
**Files to Modify:**

- next.config.ts

**Acceptance Criteria:**

- Content-Security-Policy header configured with appropriate directives.
- Strict-Transport-Security header configured for HTTPS enforcement.
- Headers verified in browser dev tools.
- No breaking changes to existing functionality (test YouTube thumbnail loading).

**Implementation Notes:**

- CSP should allow i.ytimg.com for YouTube thumbnails.
- Use report-uri or report-to for CSP violation monitoring.
- HSTS max-age of 31536000 (1 year) with includeSubDomains.

---

#### Task 2.2: Fix Invitation Flow Cookie Handling

**Assigned to:** backend-agent
**Priority:** High
**Dependencies:** None
**Files to Modify:**

- src/app/(auth)/invite/[token]/page.tsx
- src/server/trpc/routers/invitation.ts

**Acceptance Criteria:**

- Session cookie set server-side with HttpOnly flag.
- Session token not returned in API response body.
- Cookie has secure, sameSite, and path attributes.
- Invitation acceptance flow still works correctly.

**Implementation Notes:**

- Use Next.js cookies() API from next/headers.
- Consider using server action for the entire flow.
- Ensure redirect happens after cookie is set.

---

#### Task 2.3: Implement Constant-Time Token Comparison

**Assigned to:** backend-agent
**Priority:** Medium (grouped with security work)
**Dependencies:** None
**Files to Modify:**

- src/server/trpc/routers/invitation.ts

**Acceptance Criteria:**

- Token comparison uses crypto.timingSafeEqual.
- Tokens are hashed before comparison.
- No timing information leakage in validation flow.

**Implementation Notes:**

- Hash input token with same algorithm as stored token.
- Use Buffer.from for both values before comparison.

---

### Phase 3: UX and Loading States (High Priority)

**Exit Criteria:** All routes have loading states, no blank screens during data fetching.

#### Task 3.1: Add loading.tsx Files to All Routes

**Assigned to:** frontend-agent
**Priority:** High
**Dependencies:** Task 1.1 (Error Boundaries)
**Files to Create:**

- src/app/(app)/w/[slug]/videos/loading.tsx
- src/app/(app)/w/[slug]/documents/loading.tsx
- src/app/(app)/w/[slug]/categories/loading.tsx
- src/app/(app)/w/[slug]/team/loading.tsx
- src/app/(app)/w/[slug]/settings/loading.tsx

**Acceptance Criteria:**

- Skeleton loaders displayed during page transitions.
- Loading states are accessible (sr-only text).
- Consistent skeleton design across all routes.
- No layout shift when content loads.

**Implementation Notes:**

- Create reusable skeleton components.
- Match skeleton structure to actual content layout.
- Consider using Suspense boundaries for streaming.

---

#### Task 3.2: Implement or Remove Category Filtering

**Assigned to:** backend-agent
**Priority:** High
**Dependencies:** None
**Files to Modify:**

- src/server/trpc/routers/video.ts (lines 107-113)
- src/server/repositories/workspace-repository.ts

**Acceptance Criteria:**

- Either: categoryId filter works correctly and returns filtered videos.
- Or: categoryId parameter removed from schema entirely.
- No NOT_IMPLEMENTED errors thrown from production endpoints.

**Implementation Notes:**

- If implementing: add join with video_categories table.
- If removing: update any client code that passes categoryId.
- Decision should be documented in commit message.

---

#### Task 3.3: Integrate DocumentEditor or Update Placeholders

**Assigned to:** frontend-agent
**Priority:** High
**Dependencies:** None
**Files to Modify:**

- src/app/(app)/w/[slug]/videos/[id]/page.tsx (lines 292-331)

**Acceptance Criteria:**

- Either: DocumentEditor component integrated in video detail tabs.
- Or: Placeholder text updated to reflect actual status (not "Phase 2B").
- Tab panels provide useful content or are hidden.

**Implementation Notes:**

- DocumentEditor exists in src/components/document/document-editor/.
- Consider lazy loading if integrating (dynamic import).
- Update tab labels if changing functionality.

---

### Phase 4: Structured Logging (High Priority)

**Exit Criteria:** All console statements replaced with structured logging, logs redact sensitive data.

#### Task 4.1: Implement Structured Logging Infrastructure

**Assigned to:** backend-agent
**Priority:** High
**Dependencies:** None
**Files to Create:**

- src/lib/logger.ts

**Files to Modify:**

- src/middleware.ts
- src/lib/email.ts
- src/lib/setup.ts
- src/lib/auth/rate-limit.ts
- Multiple other files with console statements

**Acceptance Criteria:**

- Pino logger configured with appropriate log levels.
- Sensitive data redacted (password, sessionToken, token).
- Structured JSON output in production.
- Pretty printing in development.
- All 30+ console statements replaced.

**Implementation Notes:**

- Use pino with pino-pretty for development.
- Configure log level via LOG_LEVEL environment variable.
- Create logger instances per module for context.

---

### Phase 5: Accessibility Fixes (Medium Priority)

**Exit Criteria:** WCAG 2.1 AA compliance improved, critical violations resolved.

#### Task 5.1: Add Focus Trap to Delete Dialog

**Assigned to:** frontend-agent
**Priority:** Medium
**Dependencies:** None
**Files to Modify:**

- src/app/(app)/w/[slug]/categories/categories-page-client.tsx (lines 305-343)

**Acceptance Criteria:**

- Focus trapped within dialog when open.
- Focus returns to trigger element when closed.
- Escape key closes dialog.
- role="alertdialog" and aria-modal="true" added.
- aria-labelledby points to dialog title.

**Implementation Notes:**

- Use existing useFocusTrap from src/lib/accessibility/focus-trap.ts.
- Test with keyboard-only navigation.
- Test with screen reader.

---

#### Task 5.2: Add Semantic Color Names to Color Picker

**Assigned to:** frontend-agent
**Priority:** Medium
**Dependencies:** None
**Files to Modify:**

- src/components/category/color-picker/color-picker.tsx

**Acceptance Criteria:**

- Each color has a human-readable name (e.g., "Coral Red" not "#FF5733").
- aria-label includes both name and hex value.
- Color names are consistent and descriptive.

**Implementation Notes:**

- Create colorNames map with hex -> name mappings.
- Consider grouping colors (warm, cool, neutral) for better organization.

---

#### Task 5.3: Add ARIA Live Regions for Loading States

**Assigned to:** frontend-agent
**Priority:** Medium
**Dependencies:** Task 3.1 (loading.tsx files)
**Files to Modify:**

- src/app/(app)/w/[slug]/videos/page.tsx
- src/app/(app)/w/[slug]/documents/page.tsx
- Other pages with async data loading

**Acceptance Criteria:**

- Loading states announced to screen readers.
- Completion states announced with item counts.
- Uses existing announce utility from src/lib/accessibility/aria.ts.

**Implementation Notes:**

- Use aria-live="polite" for non-urgent announcements.
- Announce both start and completion of loading.
- Include count of items loaded when relevant.

---

#### Task 5.4: Fix Tab Component ARIA Pattern

**Assigned to:** frontend-agent
**Priority:** Medium
**Dependencies:** None
**Files to Modify:**

- src/app/(app)/w/[slug]/videos/[id]/page.tsx (lines 244-282)

**Acceptance Criteria:**

- Tab buttons have id attributes.
- Tab panels have aria-labelledby pointing to tab button.
- aria-controls on tabs points to panel ids.
- Roving tabindex implemented (only active tab in tab order).

**Implementation Notes:**

- Consider extracting to reusable Tabs component.
- Follow WAI-ARIA tabs pattern.

---

### Phase 6: Code Quality and Refactoring (Medium Priority)

**Exit Criteria:** Code smells addressed, DRY violations fixed, patterns standardized.

#### Task 6.1: Standardize Error Handling Patterns

**Assigned to:** backend-agent
**Priority:** Medium
**Dependencies:** Task 4.1 (logging)
**Files to Modify:**

- src/server/repositories/workspace-repository.ts
- src/server/trpc/routers/\*.ts

**Acceptance Criteria:**

- Consistent pattern for not-found errors (throw TRPCError vs return null).
- Documented convention for when to throw vs return.
- All repository methods follow the same pattern.

**Implementation Notes:**

- Recommendation: Always throw TRPCError for not-found.
- Add JSDoc comments documenting error behavior.
- Update tests to match new behavior.

---

#### Task 6.2: Extract Shared Constants and Utilities

**Assigned to:** frontend-agent
**Priority:** Medium
**Dependencies:** None
**Files to Create:**

- src/lib/constants/status.ts
- src/lib/constants/colors.ts

**Files to Modify:**

- src/components/video/video-card/video-card.tsx
- src/app/(app)/w/[slug]/videos/[id]/page.tsx
- Other files with duplicated status colors/labels

**Acceptance Criteria:**

- Status colors and labels defined in single location.
- DEFAULT_CATEGORY_COLOR constant created.
- All duplicated definitions replaced with imports.
- Magic numbers moved to named constants.

---

#### Task 6.3: Fix Logout Button Endpoint

**Assigned to:** fullstack-agent
**Priority:** Medium
**Dependencies:** None
**Files to Modify:**

- src/components/layout/app-shell/app-shell.tsx (lines 126-131)

**Acceptance Criteria:**

- Logout uses tRPC mutation or server action.
- Session properly invalidated server-side.
- User redirected to login page after logout.
- Cookie cleared correctly.

**Implementation Notes:**

- Check if auth.logout tRPC endpoint exists.
- If not, create it or use server action.

---

#### Task 6.4: Remove Unused State Setters

**Assigned to:** frontend-agent
**Priority:** Medium
**Dependencies:** None
**Files to Modify:**

- src/lib/workspace/provider.tsx (lines 59-62)

**Acceptance Criteria:**

- Unused \_setWorkspace and \_setRole removed.
- If functionality is needed, implement it; otherwise, use non-state approach.
- No underscore-prefixed variables to silence warnings.

---

#### Task 6.5: Fix N+1 Query in setVideoCategories

**Assigned to:** backend-agent
**Priority:** Medium
**Dependencies:** None
**Files to Modify:**

- src/server/repositories/workspace-repository.ts (lines 532-558)

**Acceptance Criteria:**

- Batch insert used instead of loop.
- Operation wrapped in transaction.
- Query count reduced from N+1 to 2.

---

### Phase 7: UX Polish (Medium/Low Priority)

**Exit Criteria:** Empty states implemented, emoji icons replaced, minor UX improvements complete.

#### Task 7.1: Add Empty States to Lists

**Assigned to:** frontend-agent
**Priority:** Medium
**Dependencies:** None
**Files to Modify:**

- src/app/(app)/w/[slug]/videos/page.tsx
- src/app/(app)/w/[slug]/documents/page.tsx
- src/app/(app)/w/[slug]/categories/categories-page-client.tsx

**Acceptance Criteria:**

- Helpful message displayed when lists are empty.
- CTA button to create first item.
- Visually distinct from loading/error states.

---

#### Task 7.2: Replace Emoji Icons with Icon Library

**Assigned to:** frontend-agent
**Priority:** Low
**Dependencies:** None
**Files to Modify:**

- src/components/layout/app-shell/app-shell.tsx (lines 112-117)

**Acceptance Criteria:**

- Emoji icons replaced with lucide-react icons.
- Icons render consistently across all operating systems.
- Icons have appropriate aria-hidden or aria-label.

---

### Phase 8: Testing and Documentation (Ongoing)

**Exit Criteria:** Coverage at 70%+, documentation gaps filled.

#### Task 8.1: Increase Test Coverage Thresholds

**Assigned to:** qa-agent
**Priority:** High
**Dependencies:** All critical fixes complete
**Files to Modify:**

- vitest.config.ts (lines 41-46)

**Acceptance Criteria:**

- Thresholds raised to 60% initially.
- Plan documented for reaching 70%, then 80%.
- New tests added for critical paths (auth, workspace operations).

**Implementation Notes:**

- Prioritize WorkspaceRepository integration tests.
- Add component tests for complex interactions.
- Add accessibility tests using axe-core.

---

#### Task 8.2: Add Missing Documentation

**Assigned to:** docs-agent
**Priority:** Low
**Dependencies:** None
**Files to Create:**

- SECURITY.md
- CONTRIBUTING.md
- docs/architecture-diagram.md

**Acceptance Criteria:**

- SECURITY.md references ADR-014 and provides security contact.
- CONTRIBUTING.md includes setup instructions and development workflow.
- Architecture diagram created (C4 model or similar).

---

### Phase 9: Technical Debt Backlog (Low Priority)

These items can be addressed opportunistically or in dedicated tech debt sprints.

#### Task 9.1: Lazy Load DocumentEditor

**Files to Modify:** src/components/document/document-editor/

#### Task 9.2: Add React.memo to List Items

**Files to Modify:** src/components/team/member-list/member-list.tsx

#### Task 9.3: Monitor tRPC v11 Stable Release

**Action:** Pin current version, create ticket to upgrade when stable.

#### Task 9.4: Replace @types/marked

**Action:** Update to maintained types or remove if unused.

#### Task 9.5: Add Breadcrumbs to Deep Routes

**Files to Modify:** Video/document detail pages

#### Task 9.6: Add Keyboard Shortcuts Help Modal

**Files to Create:** src/components/keyboard-shortcuts-modal/

#### Task 9.7: Fix Setup Flag File Permissions

**Files to Modify:** src/lib/setup.ts (line 71)

#### Task 9.8: Fix Global idCounter SSR Issue

**Files to Modify:** src/lib/accessibility/aria.ts (line 49)

#### Task 9.9: Remove Unused \_enableRevisionHistory

**Files to Modify:** src/components/document/document-editor/document-editor.tsx

#### Task 9.10: Add Database Indexes

**Files to Modify:** Database schema for workspace_id, created_at columns.

---

## Agent Collaboration

| Agent           | Primary Responsibilities                                         |
| --------------- | ---------------------------------------------------------------- |
| frontend-agent  | Error boundaries, loading states, accessibility fixes, UX polish |
| backend-agent   | Rate limiting, security hardening, logging, API fixes            |
| fullstack-agent | TypeScript fixes, logout endpoint, cross-cutting concerns        |
| qa-agent        | Test coverage, integration tests, accessibility testing          |
| docs-agent      | SECURITY.md, CONTRIBUTING.md, architecture documentation         |
| security-agent  | Review security fixes, penetration testing guidance              |

---

## Risk Assessment

### High Risk

| Risk                                            | Mitigation                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------ |
| Redis dependency adds infrastructure complexity | Provide in-memory fallback for development; document Redis setup clearly |
| TypeScript fixes may have cascading effects     | Run full test suite after each file change; fix in small batches         |
| CSP may break existing functionality            | Test thoroughly in staging; use report-only mode initially               |

### Medium Risk

| Risk                                              | Mitigation                                                |
| ------------------------------------------------- | --------------------------------------------------------- |
| Test coverage increase takes longer than expected | Prioritize critical paths; accept incremental improvement |
| tRPC RC may have breaking changes                 | Pin version; monitor release notes; have rollback plan    |

### Mitigation Strategies

1. Create feature branch for each phase.
2. Require PR review before merging.
3. Run full E2E test suite before merging each phase.
4. Deploy to staging environment between phases.
5. Document any breaking changes in CHANGELOG.

---

## Success Metrics

- Zero TypeScript compilation errors.
- Zero critical security vulnerabilities.
- Error Boundary coverage on all routes.
- Loading states on all async routes.
- 60% test coverage (interim target).
- All WCAG 2.1 AA critical violations resolved.
- Structured logging in place.
- CSP and HSTS headers configured.
- Rate limiting persists across restarts.

---

## Dependency Graph

```
Phase 1 (Critical Blockers)
├── Task 1.1: Error Boundaries (independent)
├── Task 1.2: Redis Rate Limiting (independent)
├── Task 1.3: Env Variable Security (independent)
└── Task 1.4: TypeScript Fixes (independent)

Phase 2 (Security) - depends on Phase 1.3
├── Task 2.1: Security Headers (depends on 1.3)
├── Task 2.2: Cookie Handling (independent)
└── Task 2.3: Timing-Safe Comparison (independent)

Phase 3 (UX/Loading) - depends on Phase 1.1
├── Task 3.1: Loading States (depends on 1.1)
├── Task 3.2: Category Filtering (independent)
└── Task 3.3: DocumentEditor Integration (independent)

Phase 4 (Logging) - can start after Phase 1
└── Task 4.1: Structured Logging (independent)

Phase 5 (Accessibility) - can start after Phase 3.1
├── Task 5.1: Focus Trap (independent)
├── Task 5.2: Color Names (independent)
├── Task 5.3: ARIA Live Regions (depends on 3.1)
└── Task 5.4: Tab ARIA Pattern (independent)

Phase 6 (Code Quality) - can start after Phase 4.1
├── Task 6.1: Error Handling (depends on 4.1)
├── Task 6.2: Shared Constants (independent)
├── Task 6.3: Logout Button (independent)
├── Task 6.4: Unused State Setters (independent)
└── Task 6.5: N+1 Query Fix (independent)

Phase 7 (UX Polish) - can start any time
├── Task 7.1: Empty States (independent)
└── Task 7.2: Emoji Icons (independent)

Phase 8 (Testing) - continuous
├── Task 8.1: Coverage Thresholds (after Phase 1 complete)
└── Task 8.2: Documentation (independent)

Phase 9 (Tech Debt) - ongoing backlog
└── All tasks independent, address opportunistically
```

---

## Parallel Work Streams

Based on the dependency graph, these work streams can proceed in parallel:

**Stream A (Frontend):** Tasks 1.1 -> 3.1 -> 5.3 -> 7.1
**Stream B (Backend):** Tasks 1.2, 1.3 -> 2.1, 2.2, 2.3 -> 3.2 -> 4.1 -> 6.1, 6.5
**Stream C (Fullstack):** Tasks 1.4 -> 6.3 -> 5.4 -> 6.2
**Stream D (Accessibility):** Tasks 5.1, 5.2 (can start immediately)
**Stream E (QA/Docs):** Tasks 8.1, 8.2 (continuous)

---

## Quick Wins

These can be completed in under 1 hour each and provide immediate value:

1. Create DEFAULT_CATEGORY_COLOR constant (15 min)
2. Fix import order in test helpers (30 min)
3. Add robots.txt to public/ (30 min)
4. Update coverage thresholds in vitest.config.ts (30 min)
5. Add .DS_Store to .gitignore (5 min)
6. Remove unused \_setWorkspace/\_setRole (30 min)

---

## Conclusion

This remediation plan addresses 50+ issues identified across eight specialized code reviews. The dependency-aware batching approach allows for efficient parallel work while ensuring critical security and stability issues are resolved first.

**Recommended execution order:**

1. Complete all Phase 1 tasks before any production deployment.
2. Phase 2 security hardening should immediately follow.
3. Phases 3-7 can be parallelized based on team capacity.
4. Phase 8 testing improvements should be continuous.
5. Phase 9 tech debt items addressed opportunistically.

With this plan implemented, Streamline Studio will achieve production-grade security, accessibility, and maintainability standards.

---

_Plan generated by Strategic Project Planner_
_Based on code reviews by: Lead Developer, Security Architect, QA Architect, Senior Next.js Developer, Code Quality Enforcer, TRON User Advocate, and Strategic Project Planner_
