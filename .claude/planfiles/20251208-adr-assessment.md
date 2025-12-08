# ADR and Planning Assessment for Streamline Studio

**Assessment Date**: 2025-12-08
**Assessor**: Strategic Project Planner
**Status**: Complete

---

## Executive Summary

Streamline Studio's ADRs and planning documents demonstrate a **well-considered architecture** for a YouTube content planning application. The decisions are largely coherent and show evidence of rigorous debate through the three-agent collaboration model (Strategic Planner, Lead Developer, QA Architect).

However, there are **notable gaps and inconsistencies** between the ADR numbering/topics referenced in the planning document versus the actual ADRs that exist. Additionally, several important architectural decisions are either missing ADRs entirely or are distributed across multiple documents without clear ownership.

**Overall Assessment**: 7.5/10 - Strong foundation with addressable gaps.

---

## Section 1: Summary of All ADRs Reviewed

### ADR-001: Next.js Framework Selection

- **Status**: Accepted
- **Decision**: Next.js 14+ with App Router
- **Key Points**: Standalone output for Docker, React Server Components, tRPC integration
- **Quality**: Excellent - thorough alternatives analysis, clear rationale

### ADR-002: Styling Solution

- **Status**: Accepted
- **Decision**: CSS Modules with modern CSS features (nesting, container queries, :has())
- **Key Points**: Radix UI primitives, CSS custom properties for theming, no Tailwind
- **Quality**: Excellent - comprehensive token system defined, browser support documented

### ADR-003: Storybook Integration

- **Status**: Accepted
- **Decision**: Storybook 8+ with CSF3, interaction testing, a11y addon
- **Key Points**: MSW for tRPC mocking, Chromatic for visual regression (optional)
- **Quality**: Good - clear scope, though dependency on ADR-002 styling could be more explicit

### ADR-004: TypeScript Configuration

- **Status**: Accepted
- **Decision**: Strict mode with additional safety flags (noUncheckedIndexedAccess, exactOptionalPropertyTypes)
- **Key Points**: Path aliases with @/, ESLint integration
- **Quality**: Good - practical guidance for strict TypeScript

### ADR-005: Testing Strategy

- **Status**: Accepted
- **Decision**: Vitest (unit) + Storybook (component) + Playwright (E2E)
- **Key Points**: axe-core for accessibility, test database isolation, coverage targets
- **Quality**: Excellent - clear test pyramid, CI configuration included

### ADR-006: ORM Selection

- **Status**: Accepted
- **Decision**: Drizzle ORM over Prisma
- **Key Points**: SQL-like syntax, no binary dependencies, better for optimistic locking
- **Quality**: Good - clear performance rationale, migration concerns addressed

### ADR-007: API Style and Authentication

- **Status**: Accepted
- **Decision**: tRPC for internal APIs, Lucia Auth for authentication
- **Key Points**: CSRF protection, session configuration, middleware chain
- **Quality**: Good - security considerations well documented

### ADR-008: Multi-Tenancy Strategy

- **Status**: Accepted
- **Decision**: Application-level workspace scoping with workspace_id column
- **Key Points**: WorkspaceRepository pattern, MODE environment variable, RLS as future option
- **Quality**: Excellent - thorough security discussion, edge cases addressed

### ADR-009: Versioning and Audit Approach

- **Status**: Accepted
- **Decision**: Optimistic locking with document_revisions table, separate audit_log
- **Key Points**: SELECT FOR UPDATE, conflict resolution UI, 500KB document limit
- **Quality**: Excellent - implementation details clear, edge cases covered

### ADR-010: Markdown Import/Export and Data Ownership

- **Status**: Accepted
- **Decision**: Database as source of truth, file export/import as convenience
- **Key Points**: 1MB file limit, UTF-8 validation, round-trip guarantee
- **Quality**: Good - clear data ownership story for self-hosters

### ADR-011: Self-Hosting Strategy

- **Status**: Accepted
- **Decision**: Docker + docker-compose, multi-stage Dockerfile, auto-migrations
- **Key Points**: Setup wizard with persistent completion flag, health check endpoint
- **Quality**: Good - addresses key self-hosting concerns, multi-arch noted

### ADR-012: Background Jobs Strategy

- **Status**: Accepted
- **Decision**: No jobs for MVP; Graphile Worker in Phase 5; BullMQ evaluation in Phase 6
- **Key Points**: PostgreSQL-based queue for emails, Redis only for YouTube sync
- **Quality**: Good - pragmatic deferral approach

---

## Section 2: Coherence Analysis

### 2.1 Areas of Strong Alignment

1. **Technology Stack Consistency**
   - All ADRs align on: Next.js, TypeScript strict mode, PostgreSQL, Drizzle ORM
   - Clear separation of concerns between frontend (React/tRPC) and backend (Drizzle/PostgreSQL)
   - Docker deployment strategy is consistent across ADRs

2. **Security-First Approach**
   - ADR-007 (Auth), ADR-008 (Multi-tenancy), ADR-011 (Self-hosting) all reinforce security requirements
   - CSRF, rate limiting, session management consistently mentioned
   - Workspace isolation is a cross-cutting concern properly addressed

3. **Testing Philosophy**
   - ADR-003 (Storybook) and ADR-005 (Testing) complement each other well
   - Clear delineation: Storybook for component tests, Vitest for unit/integration, Playwright for E2E
   - Accessibility testing woven into both Storybook and E2E layers

4. **Self-Hosting and SaaS Duality**
   - ADR-008 (Multi-tenancy), ADR-011 (Self-hosting), ADR-012 (Background Jobs) all account for both deployment modes
   - MODE environment variable consistently used
   - Infrastructure complexity is appropriately scoped to each mode

### 2.2 Potential Conflicts Identified

1. **CONFLICT: ADR Numbering vs Planning Document References**

   The planning document (`app-planning-phases.md`) references ADRs with different numbers than the actual ADR files:

   | Planning Doc Reference     | Actual ADR Topic             |
   | -------------------------- | ---------------------------- |
   | ADR-001 (ORM - Drizzle)    | ADR-001 is Next.js Framework |
   | ADR-002 (tRPC, Lucia Auth) | ADR-002 is Styling Solution  |
   | ADR-003 (Multi-tenancy)    | ADR-003 is Storybook         |
   | ADR-004 (Versioning)       | ADR-004 is TypeScript Config |
   | ADR-005 (Markdown I/O)     | ADR-005 is Testing Strategy  |
   | ADR-006 (Docker)           | ADR-006 is ORM Selection     |
   | ADR-007 (Background Jobs)  | ADR-007 is API/Auth          |

   **Impact**: HIGH - This creates confusion for anyone referencing the planning document against actual ADRs.

   **Recommendation**: Either renumber ADRs to match planning document or update planning document references.

2. **TENSION: CSS Modules vs Storybook Component Library**

   ADR-002 rejects shadcn/ui in favor of CSS Modules + Radix primitives. ADR-003 mentions "stories for shadcn/ui base components" which contradicts the styling decision.

   **Impact**: LOW - Appears to be a documentation error in ADR-003 where "shadcn/ui" should read "Radix UI primitives with our custom styles"

   **Recommendation**: Update ADR-003 to remove shadcn/ui references.

3. **AMBIGUITY: CodeMirror Accessibility**

   ADR-003 mentions "CodeMirror has known issues" in Playwright exclusion. ADR-005 testing excludes `.cm-editor` from a11y scans. However, no ADR explicitly addresses the CodeMirror selection decision or its accessibility implications.

   **Impact**: MEDIUM - Core editor component lacks formal ADR despite being mentioned in multiple places.

   **Recommendation**: Create ADR for Markdown Editor selection (see Missing ADRs section).

---

## Section 3: Gap Analysis - Missing ADRs

### 3.1 Critical Missing ADRs (Should Add Before Development)

#### ADR-013: Markdown Editor Selection (Recommended)

**Why Needed**: CodeMirror 6 is mentioned in ADR-001, planning document, and testing exclusions, but no formal decision record exists.

**Should Cover**:

- Why CodeMirror 6 over alternatives (Monaco, ProseMirror, TipTap)
- Accessibility limitations and mitigations
- Bundle size impact
- Server Component integration approach
- Auto-save debounce strategy

#### ADR-014: Error Handling and User Feedback Strategy (Recommended)

**Why Needed**: Multiple ADRs mention error states (conflict errors, save failures, database unavailable) but no unified strategy exists.

**Should Cover**:

- Error boundary placement
- Toast/notification system for transient errors
- Error logging and monitoring approach
- User-facing error messages (i18n considerations)
- Retry patterns for recoverable errors

#### ADR-015: URL and Routing Architecture (Recommended)

**Why Needed**: Planning document mentions `/w/[slug]/...` structure but no ADR formalizes this.

**Should Cover**:

- Route organization strategy
- Single-tenant vs multi-tenant URL mapping
- Deep linking requirements
- Navigation state management
- Back button behavior

### 3.2 Important Missing ADRs (Should Add During Phase 1-2)

#### ADR-016: Form Handling and Validation Strategy

**Why Needed**: Video creation, document editing, settings forms all need consistent patterns.

**Should Cover**:

- Form library choice (react-hook-form, native forms)
- Validation approach (Zod schemas shared with tRPC)
- Error display patterns
- Optimistic updates

#### ADR-017: Date/Time Handling Strategy

**Why Needed**: Due dates, publish dates, audit timestamps need consistent handling.

**Should Cover**:

- Timezone handling (user timezone vs UTC storage)
- Date formatting library (date-fns, dayjs, Intl)
- Date picker component selection
- Relative time displays

### 3.3 Nice-to-Have ADRs (Can Add Later)

- **ADR-018: Logging and Monitoring Strategy** - Production observability
- **ADR-019: Performance Budgets and Optimization** - Bundle size, Core Web Vitals
- **ADR-020: Internationalization (i18n) Approach** - If multi-language support is planned

---

## Section 4: Phase Plan Alignment Analysis

### 4.1 Mapping ADRs to Phases

| Phase   | Relevant ADRs                                                                                            | Alignment Status                 |
| ------- | -------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Phase 1 | ADR-001 (Next.js), ADR-004 (TypeScript), ADR-006 (Drizzle), ADR-007 (tRPC/Auth), ADR-008 (Multi-tenancy) | GOOD - Core architecture covered |
| Phase 2 | ADR-002 (Styling), ADR-003 (Storybook), ADR-005 (Testing), ADR-009 (Versioning basics)                   | PARTIAL - Missing Editor ADR     |
| Phase 3 | ADR-009 (Full versioning), ADR-010 (Import/Export)                                                       | GOOD - Clear deliverables        |
| Phase 4 | ADR-011 (Self-hosting)                                                                                   | GOOD - Well documented           |
| Phase 5 | ADR-008 (Multi-tenant mode), ADR-012 (Background jobs)                                                   | GOOD - Dependencies clear        |
| Phase 6 | ADR-012 (BullMQ evaluation)                                                                              | ACCEPTABLE - Design-only phase   |

### 4.2 Phase Sequencing Issues

1. **Phase 1 Security Items**

   The planning document correctly prioritizes CSRF protection and rate limiting in Phase 1. These align with ADR-007. However, the critical issue about "Rate Limiting Behind Proxy" (TRUSTED_PROXY) is mentioned in planning document section but not explicitly in ADR-007.

   **Recommendation**: Add TRUSTED_PROXY handling explicitly to ADR-007 or create supplementary security ADR.

2. **Phase 2 Editor Development**

   Phase 2 includes markdown editor integration (task 2.3.2) but references no ADR. The styling approach in ADR-002 doesn't address editor theming specifically.

   **Recommendation**: Create Editor ADR before Phase 2 begins.

3. **Phase 2 Auto-Save Data Loss Prevention**

   Planning document calls out critical issues including local storage backup (task 2.3.6). This aligns with ADR-009 discussion but is scattered across documents.

   **Recommendation**: Consolidate auto-save requirements into a single location (either ADR-009 or new ADR).

### 4.3 Deliverable Clarity Assessment

| Phase   | Deliverables Clear? | Notes                                                                                          |
| ------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| Phase 1 | YES                 | Acceptance criteria specific and testable                                                      |
| Phase 2 | MOSTLY              | "axe-core reports zero critical violations" is good; editor-specific criteria could be clearer |
| Phase 3 | YES                 | E2E two-tab conflict test is excellent measurable criterion                                    |
| Phase 4 | YES                 | "User completes setup in under 15 minutes" is testable                                         |
| Phase 5 | YES                 | "256-bit token, expires in 24 hours" is specific                                               |
| Phase 6 | YES                 | Design-only, deliverables are documents                                                        |

---

## Section 5: Recommended Revisions

### 5.1 Immediate Actions (Before Phase 1)

#### Priority 1: Fix ADR Number Mismatch

The planning document references ADR numbers that don't match actual files. Options:

**Option A (Recommended)**: Update the planning document to use correct ADR numbers

- Lower risk, doesn't require renaming files
- Update the "Key Decisions Summary" appendix table

**Option B**: Renumber ADR files to match planning document

- More disruptive, but creates cleaner reference
- Risk of breaking any existing references

#### Priority 2: Create ADR-013 (Markdown Editor)

Draft should include:

- Selection of CodeMirror 6
- Rationale vs alternatives
- Known accessibility limitations
- Integration approach with CSS Modules theming
- Auto-save architecture

### 5.2 Before Phase 2

#### Priority 3: Create ADR-014 (Error Handling)

Unify error handling patterns before building UI components.

#### Priority 4: Update ADR-003 (Storybook)

- Remove shadcn/ui references (should be Radix UI)
- Clarify interaction with ADR-002 styling approach

### 5.3 During Phase 2

#### Priority 5: Create ADR-016 (Form Handling)

Before building video creation forms.

#### Priority 6: Create ADR-017 (Date/Time)

Before implementing due date functionality.

### 5.4 Nice-to-Have Refinements

1. **ADR-002 Enhancement**: Add CodeMirror-specific theming section or reference future editor ADR
2. **ADR-005 Enhancement**: Add explicit test coverage requirements per phase
3. **ADR-008 Enhancement**: Document MODE switching edge case (single to multi-tenant data migration)
4. **ADR-011 Enhancement**: Add troubleshooting section for common Docker issues

---

## Section 6: Dependency Map

### 6.1 ADR Dependencies (Must Read Before Implementing)

```
ADR-001 (Next.js)
  |
  +-- ADR-004 (TypeScript) - uses Next.js config
  |
  +-- ADR-006 (Drizzle) - integrates with Next.js API routes
  |
  +-- ADR-007 (tRPC/Auth) - uses Next.js App Router
       |
       +-- ADR-008 (Multi-tenancy) - depends on tRPC middleware
       |
       +-- ADR-009 (Versioning) - uses tRPC procedures
            |
            +-- ADR-010 (Import/Export) - extends document operations

ADR-002 (Styling)
  |
  +-- ADR-003 (Storybook) - uses CSS Modules, Radix UI
       |
       +-- ADR-005 (Testing) - includes Storybook tests

ADR-011 (Self-hosting)
  |
  +-- ADR-006 (Drizzle) - migration strategy
  |
  +-- ADR-012 (Background Jobs) - infrastructure additions
```

### 6.2 Undocumented Dependencies

1. **ADR-009 -> (Missing) Editor ADR**: Version conflicts depend on editor integration
2. **ADR-005 -> ADR-002**: Testing uses CSS Modules patterns
3. **Planning Phase 1 -> ADR-011**: Docker smoke test requires self-hosting decisions

---

## Section 7: Risk Assessment

### 7.1 High-Risk Gaps

| Gap                             | Risk Level  | Mitigation                                     |
| ------------------------------- | ----------- | ---------------------------------------------- |
| ADR number mismatch             | HIGH        | Fix before any development references ADRs     |
| No Editor ADR                   | MEDIUM-HIGH | Create before Phase 2, critical path component |
| shadcn/ui references in ADR-003 | LOW         | Documentation confusion, easy fix              |

### 7.2 Architectural Risks Not Fully Addressed in ADRs

1. **Database Connection Pooling**
   - ADR-006 mentions "configure connection pooling appropriately" but provides no guidance
   - Risk: Self-hosted instances with many concurrent saves could exhaust connections
   - Recommendation: Add specific pooling configuration to ADR-006 or ADR-011

2. **Session Token Storage**
   - ADR-007 mentions HTTP-only cookies but doesn't specify exact cookie configuration
   - Risk: Security misconfiguration
   - Current ADR is sufficient but could be more explicit

3. **Large Workspace Scale**
   - ADR-008 addresses isolation but not performance at scale (1000+ videos per workspace)
   - Risk: Query performance degradation
   - Recommendation: Add indexing strategy to ADR-008 or note as future consideration

---

## Section 8: Conclusion and Priority Order

### Recommended Action Priority

1. **IMMEDIATE**: Fix ADR numbering mismatch in planning document
2. **BEFORE PHASE 1 START**: Create ADR-013 (Markdown Editor Selection)
3. **DURING PHASE 1**: Create ADR-014 (Error Handling Strategy)
4. **BEFORE PHASE 2 START**: Update ADR-003 (remove shadcn/ui references)
5. **DURING PHASE 2**: Create ADR-016 (Form Handling) and ADR-017 (Date/Time)
6. **ONGOING**: Add connection pooling guidance to ADR-006 or ADR-011

### Overall Assessment

The ADR collection is **substantially complete** for MVP development. The most critical issue is the **numbering mismatch** between the planning document and actual ADR files, which will cause confusion during implementation.

The architectural decisions are well-reasoned and show clear tradeoff analysis. The three-agent discussion format provides excellent rationale documentation. The phased approach is sound, with appropriate deferral of complexity (e.g., BullMQ) until needed.

With the recommended additions (primarily the Editor ADR and numbering fix), the project has a **solid architectural foundation** for successful implementation.

---

_Assessment completed by Strategic Project Planner_
_Total ADRs reviewed: 12_
_Total planning phases reviewed: 6_
_Recommended new ADRs: 5 (2 critical, 2 important, 1 nice-to-have)_
