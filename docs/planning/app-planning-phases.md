# Streamline Studio: Multi-Phase Implementation Plan

**Project**: YouTube Content Planner
**Version**: 2.7 (Phase 6 Design Complete)
**Date**: 2025-12-10
**Status**: Approved for Implementation
**Last Progress Update**: 2025-12-10 (Phase 6 Design Complete)

---

## Current Progress Summary

| Phase   | Status             | Completion          |
| ------- | ------------------ | ------------------- |
| Phase 1 | ✅ Complete        | 100%                |
| Phase 2 | ✅ Complete        | 100%                |
| Phase 3 | ✅ Complete        | 100%                |
| Phase 4 | ✅ Complete        | 100%                |
| Phase 5 | ✅ Complete        | 100%                |
| Phase 6 | 📐 Design Complete | 0% (implementation) |

**Phase 1 Breakdown:**

- 1.1 Project Setup: ✅ Complete (8/8 tasks)
- 1.2 Database Schema: ✅ Complete (13/13 tasks)
- 1.3 Authentication: ✅ Complete (11/11 tasks)
- 1.4 Workspace Foundation: ✅ Complete (6/6 tasks)

**Phase 1 Review Results (2025-12-08):**

- QA Architect: PASS WITH RECOMMENDATIONS
- Security Architect: SECURE WITH RECOMMENDATIONS
- Code Quality Enforcer: APPROVED

**Key Achievements (Phase 1):**

- Auth unit test coverage: 92.42% (exceeded 80% target)
- Rate limiting E2E tests: Created and passing
- Security logging tests: Verified no secrets in logs
- CI Pipeline: GitHub Actions configured (/.github/workflows/ci.yml)
- All integration tests passing with database

---

**Phase 2 Breakdown:**

- 2.1 Video Management: ✅ Complete (10/10 tasks)
- 2.2 Category Management: ✅ Complete (5/5 tasks)
- 2.3 Document Editing: ✅ Complete (12/12 tasks)
- 2.4 Layout and Navigation: ✅ Complete (5/5 tasks)
- 2.5 Accessibility: ✅ Complete (8/8 tasks)

**Phase 2 Review Results (2025-12-08):**

- QA Architect: PASS WITH RECOMMENDATIONS
- Security Architect: SECURE WITH RECOMMENDATIONS (server-side 500KB limit added)
- Code Quality Enforcer: APPROVED

**Key Achievements (Phase 2):**

- Video Card component with status badges and category tags
- Video List page with grid layout, skeleton loading, and empty state
- Video Form Modal with comprehensive validation
- Video Detail page with document tabs navigation
- Video Delete confirmation dialog
- Category Selector with multi-select support
- CodeMirror 6 markdown editor (lazy-loaded for performance)
- Markdown preview with DOMPurify sanitization (XSS prevention)
- Auto-save with 2-second debounce and visual indicator
- Local storage backup for crash recovery
- Version checking for optimistic concurrency control
- Manual save support (Cmd+S / Ctrl+S)
- Character and word count display
- Aria-live regions for accessibility
- Category management page with full CRUD operations
- Color picker with 18 preset accessible colors
- Breadcrumb navigation component
- Skeleton loading components
- Empty state component with helpful messaging
- Skip link component for keyboard users
- Focus trap utilities for modal dialogs
- ARIA utilities for screen reader support
- Contrast checker utilities (4.5:1 minimum verified)
- Accessibility testing documentation
- E2E accessibility tests with axe-core

---

**Phase 3 Breakdown:**

- 3.1 Optimistic Locking: ✅ Complete (6/6 tasks)
- 3.2 Revision History: ✅ Complete (7/7 tasks)
- 3.3 Audit Log: ✅ Complete (4/4 tasks)
- 3.4 Import/Export: ✅ Complete (3/3 tasks)

**Phase 3 Review Results (2025-12-09):**

- QA Architect: PASS WITH RECOMMENDATIONS
- Security Architect: SECURE WITH RECOMMENDATIONS
- Code Quality Enforcer: APPROVED (after fixes)

**Key Achievements (Phase 3):**

- Server-side version checking with SELECT FOR UPDATE in transactions
- ConflictError returned with current version on mismatch
- Conflict Resolution Modal integrated into Document Editor
- "Reload and discard changes" and "Force save as new version" options
- Two-tab conflict E2E test written and passing
- Automatic revision creation on every save (atomic transactions)
- tRPC endpoints: revision.list (paginated, max 100), revision.get, revision.restore
- Revision History Panel component with Storybook stories
- Read-only Revision Viewer component with Storybook stories
- Restore functionality creates new version (preserves history)
- Restore confirmation dialog added
- Centralized audit log service (/src/lib/audit-log.ts)
- Video status change, due date/publish date change, and category CRUD logging
- Document export endpoint (download .md with sanitized filename)
- Document import endpoint (upload .md, 1MB limit, UTF-8 validation)
- Import/Export UI in document editor toolbar
- Security: Removed 'style' from DOMPurify ALLOWED_ATTR (aligns with ADR-014)
- CSS: All Phase 3 components use theme variables (no hardcoded colors)
- Accessibility: All modals have proper aria-describedby
- Code quality: Shared date-utils.ts for formatRelativeTime
- Code quality: CONTENT_PREVIEW_LENGTH constant defined

---

**Phase 4 Breakdown:**

- 4.1 Docker Image: ✅ Complete (8/8 tasks)
- 4.2 Docker Compose: ✅ Complete (6/6 tasks)
- 4.3 First-Run Experience: ✅ Complete (5/5 tasks)
- 4.4 Documentation: ✅ Complete (9/9 tasks)

**Phase 4 Review Results (2025-12-09):**

- QA Architect: NEEDS WORK → PASS (after fixes)
- Security Architect: SECURE WITH RECOMMENDATIONS
- Code Quality Enforcer: APPROVED WITH RECOMMENDATIONS

**Key Achievements (Phase 4):**

- Multi-stage Dockerfile with Alpine (~200MB image)
- Non-root user (nextjs:nodejs, UID 1001)
- dumb-init for proper signal handling
- Next.js standalone output mode
- PostgreSQL 16 with health checks
- Named volumes for data persistence
- File-based setup completion flag (/data/.setup-complete)
- Setup wizard UI with accessibility improvements
- Comprehensive DOCKER.md documentation
- Reverse proxy examples (Caddy)
- Backup/restore procedures documented
- CI/CD pipeline for Docker builds
- Security hardening (no-new-privileges, read-only filesystem)

**Critical Fixes Applied:**

- Migration dependencies bundled in Docker image
- DATABASE_URL clarified for local vs Docker usage
- PostgreSQL port commented out by default (security)
- isSetupComplete() deduplicated (DRY principle)
- Setup wizard accessibility improved (aria-describedby)
- Type safety improved in setup form

---

**Phase 5 Breakdown:**

| Task                           | Description                                                | Status                  |
| ------------------------------ | ---------------------------------------------------------- | ----------------------- |
| 5.1 Multi-Tenant Configuration | MODE detection, setup wizard handling, public registration | ✅ Complete (4/4 tasks) |
| 5.2 Team Management            | Invitations, email service, RBAC, audit logging            | ✅ Complete (9/9 tasks) |
| 5.3 Workspace Switching        | Switcher component, modals, team management UI             | ✅ Complete (4/4 tasks) |
| 5.4 Defense-in-Depth           | RLS evaluation, ADR-015 created                            | ✅ Complete (2/2 tasks) |

**Phase 5 Review Results (2025-12-10):**

- QA Architect: PASS WITH RECOMMENDATIONS (after fixes)
- Security Architect: SECURE WITH RECOMMENDATIONS
- Code Quality Enforcer: NEEDS WORK → APPROVED (after fixes)
- TRON User Advocate: PASS (after accessibility fixes)

**Key Achievements (Phase 5):**

- MODE=multi-tenant detection and handling
- Setup wizard disabled in multi-tenant mode
- Public registration with workspace creation
- Workspace slug generation with uniqueness validation
- Invitations table schema with indexes
- 256-bit secure token generation
- 24-hour token expiration
- 3-attempt limit per invitation
- Inline email service with CRLF injection prevention
- HTML-escaped email templates (XSS prevention)
- Invitation tRPC router (create, list, revoke, validate, accept)
- Team tRPC router (list, updateRole, remove)
- Audit logging for all team and invitation operations
- Owner/editor/viewer RBAC enforcement
- Shared role schema to eliminate duplication
- Workspace switcher component with Storybook stories
- Create workspace modal
- Workspaces selector page
- Team management page with member list and invite form
- Role select component
- Invitation accept page with auto-login
- Custom confirmation modals (replaced window.confirm)
- Error banner component (replaced alert())
- ADR-015 created evaluating RLS
- Decision: Defer RLS, strengthen application-level isolation
- Rationale documented with clear criteria for reconsidering

**Critical Fixes Applied:**

- XSS vulnerability in email templates fixed (htmlEscape)
- Session creation after invitation acceptance
- Audit logging added to all invitation operations
- Shared role schema created
- Native dialogs replaced with custom modals
- Table accessibility improved (scope="col")
- Theme shadow variables used throughout

**TRON Accessibility Fixes Applied:**

- Focus management in dialogs (saveFocus/restoreFocus pattern)
- Focus trapping in all modals
- Full keyboard navigation in workspace switcher (arrows, Home, End, Enter)
- LiveRegion component for screen reader announcements
- Descriptive aria-labels on all interactive elements
- Table caption for member list accessibility
- Success feedback messages for form submissions
- Invitation expiry precision improved (hours remaining)

**Ready to proceed to Phase 6: YouTube Integration (Design Only)**

---

## Executive Summary

Streamline Studio is a self-hostable web application for YouTubers to plan and manage video content. The application supports both single-tenant (self-hosted) and multi-tenant (SaaS) deployment modes from a single codebase.

This plan was developed through structured collaboration between three specialised agents:

- **Strategic Project Planner**: Explored the problem space and proposed phases
- **Lead Developer**: Evaluated options and made definitive architectural decisions
- **QA Architect**: Stress-tested the plan for edge cases and risks

### Version 2.0 Revisions

This revision incorporates findings from a comprehensive assessment of all ADRs:

- **Strategic Assessment**: 7.5/10 - Strong foundation with addressable gaps
- **Technical Review**: 8.5/10 - APPROVED with conditions
- **Risk Assessment**: MEDIUM-HIGH - Manageable with documented mitigations

Key changes in v2.0:

1. Fixed ADR numbering to match actual ADR files
2. Added ADR-013 for Markdown Editor Selection
3. Added explicit rate limiting configuration to ADR-007
4. Updated ADR-003 to reference Radix UI (not shadcn/ui)
5. Added phase gates and QA checkpoints
6. Incorporated 26 risk mitigations

### Version 2.1 Revisions (Security Architecture)

The Strategic Project Planner and Next.js Security Architect collaborated to create a comprehensive security architecture:

1. **Created ADR-014: Security Architecture** - Consolidates all security decisions
2. **Updated ADR-011** - Docker hardening (non-root user, dumb-init, no default credentials)
3. **Corrected CSRF approach** - Origin header verification (not double-submit cookies) for tRPC
4. **Added security implementation patterns** - Password policy, session invalidation, XSS prevention

### Architecture Summary

| Layer           | Technology                          | Decision Reference |
| --------------- | ----------------------------------- | ------------------ |
| Framework       | Next.js 14+ App Router              | ADR-001            |
| Styling         | CSS Modules + Radix UI              | ADR-002            |
| Component Dev   | Storybook 8+                        | ADR-003            |
| TypeScript      | Strict mode + safety flags          | ADR-004            |
| Testing         | Vitest + Storybook + Playwright     | ADR-005            |
| ORM             | Drizzle ORM                         | ADR-006            |
| API             | tRPC                                | ADR-007            |
| Auth            | Lucia Auth                          | ADR-007            |
| Multi-tenancy   | Application-level workspace scoping | ADR-008            |
| Versioning      | Optimistic locking + revisions      | ADR-009            |
| Markdown I/O    | DB as source of truth               | ADR-010            |
| Deployment      | Docker + docker-compose             | ADR-011            |
| Background Jobs | Graphile Worker (Phase 5)           | ADR-012            |
| Markdown Editor | CodeMirror 6                        | ADR-013            |
| Security        | Defense-in-depth architecture       | ADR-014            |

---

## Phase Overview

| Phase       | Focus                                  | Critical Path | Phase Gate                         |
| ----------- | -------------------------------------- | ------------- | ---------------------------------- |
| **Phase 1** | Core architecture, data model, auth    | Yes           | Security + workspace isolation     |
| **Phase 2** | Core UI for videos and documents       | Yes           | Accessibility + performance        |
| **Phase 3** | Version history and optimistic locking | Yes           | Data integrity + E2E conflict test |
| **Phase 4** | Self-hosting packaging (Docker)        | Yes           | Deployment + documentation         |
| **Phase 5** | Multi-tenant SaaS mode                 | No            | Multi-tenancy + role enforcement   |
| **Phase 6** | YouTube integration (design only)      | No            | Design documents complete          |

---

## Critical Issues (From QA Review)

The QA Architect identified these critical issues that MUST be addressed:

### Security Critical (Before Phase 1 Start)

1. **Cross-tenant data isolation** (SEC-001)
   - WorkspaceRepository pattern is single point of failure
   - Add comprehensive integration tests before any workspace-scoped code
   - Consider RLS policies as defense-in-depth in Phase 5+

2. **Rate limiting specifics** (SEC-005)
   - Login: 5 attempts/minute/IP
   - Registration: 3 attempts/hour/IP
   - Password reset: 3 attempts/hour/email
   - Document in ADR-007 ✅ (Added in v2.0)

3. **CSRF implementation pattern** (SEC-004) - **Updated in ADR-014**
   - Origin header verification (NOT double-submit cookies for tRPC)
   - Verify Content-Type: application/json as defense-in-depth
   - SameSite=Lax cookies prevent cross-site cookie attachment
   - See ADR-014 for complete implementation

### Data Integrity Critical (Phase 2)

4. **Auto-save data loss prevention**
   - Visual save indicator (Saved / Saving / Failed)
   - Local storage backup for unsaved changes
   - Queue failed saves with retry

5. **Concurrent edit protection**
   - Basic version check before Phase 3 optimistic locking
   - Warning when document modified by another session

### Deployment Critical (Phase 4)

6. **Setup wizard security** (SEC-002)
   - Persistent completion flag outside database
   - Prevent admin account creation after initial setup
   - Flag must persist across database wipe

7. **Docker security**
   - Non-root user in Dockerfile
   - Generate random PostgreSQL password (never use defaults)
   - Document SSL/HTTPS configuration

---

## Phase 1: Core Architecture, Data Model, and Basic Auth

### Goals

- Establish project structure and tooling
- Implement complete database schema with migrations
- Build authentication system with Lucia Auth
- Create workspace management foundation
- Validate Docker deployment early (smoke test)

### Non-Goals

- UI beyond basic auth flows
- Document editing
- Version history
- Full Docker packaging (Phase 4)
- Multi-tenant mode features (Phase 5)

### Task Breakdown

#### 1.1 Project Setup

| ID    | Task                                                            | Priority | ADR Reference    | Status |
| ----- | --------------------------------------------------------------- | -------- | ---------------- | ------ |
| 1.1.1 | Initialize Next.js 15 with App Router, TypeScript strict mode   | Critical | ADR-001, ADR-004 | ✅     |
| 1.1.2 | Configure ESLint (strict), Prettier, lint-staged, husky         | High     | ADR-004          | ✅     |
| 1.1.3 | Set up Drizzle ORM with pg driver and drizzle-kit               | Critical | ADR-006          | ✅     |
| 1.1.4 | Configure environment handling with Zod validation              | High     | -                | ✅     |
| 1.1.5 | Set up tRPC with App Router (fetchRequestHandler)               | Critical | ADR-007          | ✅     |
| 1.1.6 | Configure Vitest for unit tests, Playwright for E2E             | High     | ADR-005          | ✅     |
| 1.1.7 | Create basic Dockerfile and docker-compose for early validation | Medium   | ADR-011          | ✅     |
| 1.1.8 | Set up Storybook with @storybook/nextjs                         | High     | ADR-003          | ✅     |

#### 1.2 Database Schema

| ID     | Task                                                   | Priority | Notes       | Status |
| ------ | ------------------------------------------------------ | -------- | ----------- | ------ |
| 1.2.1  | Define `workspaces` table                              | Critical |             | ✅     |
| 1.2.2  | Define `users` table                                   | Critical |             | ✅     |
| 1.2.3  | Define `workspace_users` join table with role enum     | Critical |             | ✅     |
| 1.2.4  | Define `sessions` table for auth                       | Critical |             | ✅     |
| 1.2.5  | Define `videos` table with all core fields             | Critical |             | ✅     |
| 1.2.6  | Define `categories` table                              | High     |             | ✅     |
| 1.2.7  | Define `video_categories` join table                   | High     |             | ✅     |
| 1.2.8  | Define `documents` table with type enum, version field | Critical |             | ✅     |
| 1.2.9  | Define `document_revisions` table                      | High     |             | ✅     |
| 1.2.10 | Define `audit_log` table                               | High     |             | ✅     |
| 1.2.11 | Add required indexes                                   | Critical | See ADR-006 | ✅     |
| 1.2.12 | Create and test migration                              | Critical |             | ✅     |
| 1.2.13 | Create seed script for development                     | Medium   |             | ✅     |

**Required Indexes (from Lead Developer Review):**

```sql
CREATE INDEX idx_videos_workspace_status ON videos(workspace_id, status);
CREATE INDEX idx_videos_workspace_due_date ON videos(workspace_id, due_date);
CREATE INDEX idx_documents_video_type ON documents(video_id, type);
CREATE INDEX idx_revisions_document_created ON document_revisions(document_id, created_at DESC);
```

#### 1.3 Authentication

| ID     | Task                                       | Priority | ADR Reference | Status |
| ------ | ------------------------------------------ | -------- | ------------- | ------ |
| 1.3.1  | Set up Lucia Auth with Drizzle adapter     | Critical | ADR-007       | ✅     |
| 1.3.2  | Configure password hashing (Argon2id)      | Critical | ADR-007       | ✅     |
| 1.3.3  | Create registration tRPC procedure         | Critical | ADR-007       | ✅     |
| 1.3.4  | Create login tRPC procedure                | Critical | ADR-007       | ✅     |
| 1.3.5  | Create logout tRPC procedure               | High     | ADR-007       | ✅     |
| 1.3.6  | Implement auth middleware for tRPC context | Critical | ADR-007       | ✅     |
| 1.3.7  | Implement CSRF protection (Origin header)  | Critical | ADR-007       | ✅     |
| 1.3.8  | Build registration page UI                 | High     | ADR-002       | ✅     |
| 1.3.9  | Build login page UI                        | High     | ADR-002       | ✅     |
| 1.3.10 | Add rate limiting to auth endpoints        | Critical | ADR-007       | ✅     |
| 1.3.11 | Write unit tests for auth flows            | High     | ADR-005       | ✅     |

#### 1.4 Workspace Foundation

| ID    | Task                                                        | Priority | ADR Reference    | Status |
| ----- | ----------------------------------------------------------- | -------- | ---------------- | ------ |
| 1.4.1 | Implement MODE environment variable handling                | High     | ADR-008          | ✅     |
| 1.4.2 | Create WorkspaceRepository with enforced scoping            | Critical | ADR-008          | ✅     |
| 1.4.3 | Auto-create workspace on first registration (single-tenant) | Critical | ADR-008          | ✅     |
| 1.4.4 | Create workspace context provider for frontend              | High     | ADR-008          | ✅     |
| 1.4.5 | Create workspace-scoped tRPC middleware                     | Critical | ADR-007, ADR-008 | ✅     |
| 1.4.6 | Write integration tests for workspace isolation             | Critical | ADR-005, ADR-008 | ✅     |

### Phase 1 Gate (ALL MUST PASS) - ✅ PASSED

**Security Gate:**

- [x] Password hashing uses Argon2id (verified in database)
- [x] Session tokens are 256-bit minimum
- [x] Cookies are HTTP-only, Secure, SameSite=Lax
- [x] Rate limiting blocks 6th login attempt within 60 seconds _(verified via E2E test)_
- [x] CSRF protection blocks cross-origin mutations
- [x] No secrets appear in application logs _(verified via security-logging.test.ts)_
- [x] Environment validation fails on missing required vars

**Data Integrity Gate:**

- [x] Workspace scoping prevents cross-tenant access (integration test) _(verified with database)_
- [x] All tables have workspace_id where required
- [x] Required indexes exist on workspace_id columns

**Testing Gate:**

- [x] Unit test coverage > 80% for auth module _(achieved 92.42%)_
- [x] Integration tests for all tRPC procedures _(complete)_
- [x] CI pipeline runs all tests on every push _(/.github/workflows/ci.yml)_
- [x] Docker smoke test: build, startup, basic auth flow works _(verified)_

### Risks

| Risk                                   | Likelihood | Impact | Mitigation                                        |
| -------------------------------------- | ---------- | ------ | ------------------------------------------------- |
| Argon2 native deps fail in Docker      | Medium     | Medium | Test Docker build early on arm64; bcrypt fallback |
| Lucia Auth v3 instability              | Low        | High   | Keep auth interface abstract                      |
| Rate limiting ineffective behind proxy | Medium     | High   | TRUSTED_PROXY env var with validation             |

---

## Phase 2: Core UI for Videos and Documents

### Goals

- Build main dashboard showing video list
- Implement video CRUD operations
- Create video detail view with document editing
- Build category management
- Implement markdown editor with preview

### Non-Goals

- Version history UI (Phase 3)
- Full conflict resolution UI (Phase 3)
- Import/export (Phase 3)

### Task Breakdown

#### 2.1 Video Management

| ID     | Task                                                         | Priority | ADR Reference    | Status |
| ------ | ------------------------------------------------------------ | -------- | ---------------- | ------ |
| 2.1.1  | Create tRPC video router (list, get, create, update, delete) | Critical | ADR-007          | ✅     |
| 2.1.2  | Implement video list pagination (cursor-based, 50 default)   | Critical | -                | ✅     |
| 2.1.3  | Add video filtering by status and category                   | High     | -                | ✅     |
| 2.1.4  | Add video sorting (due date, status, created)                | High     | -                | ✅     |
| 2.1.5  | Build video list page                                        | Critical | ADR-002          | ✅     |
| 2.1.6  | Build video card component + Storybook story                 | High     | ADR-002, ADR-003 | ✅     |
| 2.1.7  | Build video creation modal + Storybook story                 | Critical | ADR-002, ADR-003 | ✅     |
| 2.1.8  | Build video detail page shell                                | Critical | ADR-002          | ✅     |
| 2.1.9  | Implement video deletion with confirmation                   | High     | -                | ✅     |
| 2.1.10 | Auto-create documents when video created                     | Critical | ADR-009          | ✅     |

**Pagination Requirement (from Lead Developer):**

```typescript
videoRouter.list = protectedProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().optional(),
      status: z.string().optional(),
    })
  )
  .query(async ({ ctx, input }) => {
    // Cursor-based pagination required for 500+ video workspaces
  });
```

#### 2.2 Category Management

| ID    | Task                                             | Priority | ADR Reference    | Status |
| ----- | ------------------------------------------------ | -------- | ---------------- | ------ |
| 2.2.1 | Create tRPC category router                      | High     | ADR-007          | ✅     |
| 2.2.2 | Build category management UI + Storybook stories | High     | ADR-002, ADR-003 | ✅     |
| 2.2.3 | Implement preset color palette selector          | Medium   | ADR-002          | ✅     |
| 2.2.4 | Build category selector for video forms          | High     | ADR-002          | ✅     |
| 2.2.5 | Handle category deletion (unlink, no cascade)    | Medium   | -                | ✅     |

#### 2.3 Document Editing

| ID     | Task                                                   | Priority | ADR Reference    | Status |
| ------ | ------------------------------------------------------ | -------- | ---------------- | ------ |
| 2.3.1  | Create tRPC document router (get, update)              | Critical | ADR-007          | ✅     |
| 2.3.2  | Integrate CodeMirror 6 markdown editor (lazy-loaded)   | Critical | ADR-013          | ✅     |
| 2.3.3  | Implement markdown preview panel (DOMPurify sanitized) | High     | ADR-013          | ✅     |
| 2.3.4  | Create CodeMirror theme bridge for CSS Modules         | Critical | ADR-002, ADR-013 | ✅     |
| 2.3.5  | Add auto-save with debouncing (2 second delay)         | Critical | ADR-009, ADR-013 | ✅     |
| 2.3.6  | Implement save state indicator (Saved/Saving/Failed)   | Critical | -                | ✅     |
| 2.3.7  | Implement local storage backup for unsaved changes     | Critical | -                | ✅     |
| 2.3.8  | Add basic version check on save (pre-Phase 3)          | Critical | ADR-009          | ✅     |
| 2.3.9  | Implement manual save (Cmd+S)                          | High     | -                | ✅     |
| 2.3.10 | Build document type tabs in video detail               | High     | ADR-002          | ✅     |
| 2.3.11 | Add character/word count display                       | Low      | -                | ✅     |
| 2.3.12 | Add aria-live region for save status                   | Critical | ADR-013          | ✅     |

#### 2.4 Layout and Navigation

| ID    | Task                                       | Priority | ADR Reference | Status |
| ----- | ------------------------------------------ | -------- | ------------- | ------ |
| 2.4.1 | Build app shell with sidebar navigation    | Critical | ADR-002       | ✅     |
| 2.4.2 | Create breadcrumb component                | Medium   | ADR-002       | ✅     |
| 2.4.3 | Implement responsive sidebar (collapsible) | High     | ADR-002       | ✅     |
| 2.4.4 | Implement loading skeletons for all views  | High     | ADR-002       | ✅     |
| 2.4.5 | Add empty states with helpful messages     | Medium   | ADR-002       | ✅     |

#### 2.5 Accessibility

| ID    | Task                                                          | Priority | ADR Reference    | Status |
| ----- | ------------------------------------------------------------- | -------- | ---------------- | ------ |
| 2.5.1 | Add skip links to all pages                                   | High     | -                | ✅     |
| 2.5.2 | Implement keyboard navigation                                 | High     | -                | ✅     |
| 2.5.3 | Add focus management for modals (trap focus, return on close) | High     | -                | ✅     |
| 2.5.4 | Ensure color contrast compliance (4.5:1 minimum)              | High     | ADR-002          | ✅     |
| 2.5.5 | Add aria labels and live regions                              | High     | -                | ✅     |
| 2.5.6 | Run axe-core automated audit                                  | High     | ADR-003, ADR-005 | ✅     |
| 2.5.7 | Manual screen reader testing (VoiceOver, NVDA)                | Critical | ADR-013          | ✅     |
| 2.5.8 | Verify touch targets minimum 24x24px                          | High     | -                | ✅     |

### Phase 2 Gate (ALL MUST PASS) - PASSED

**Security Gate:**

- [x] DOMPurify sanitizes all markdown preview output
- [x] Document size limit enforced (500KB) - server-side validation added
- [x] File upload validates content type _(N/A - no file uploads in Phase 2)_

**Accessibility Gate:**

- [x] axe-core reports zero critical/serious violations (documented exclusions only)
- [x] Keyboard navigation works for all features
- [x] Screen reader testing completed (VoiceOver + NVDA)
- [x] Color contrast verified (4.5:1 minimum)
- [x] Focus indicators visible and compliant
- [x] Touch targets minimum 24x24px

**Data Integrity Gate:**

- [x] Auto-save indicator accurate within 500ms of change
- [x] Local storage backup created on every edit
- [x] Local storage recovery works after crash
- [x] Basic version check warns when document modified elsewhere

**Performance Gate:**

- [x] Initial page load < 3s on 3G simulation
- [x] Document save < 500ms P95
- [x] Video list pagination works with 500+ videos
- [x] CodeMirror lazy-loads (not in initial bundle)

### Risks

| Risk                                     | Likelihood | Impact | Mitigation                                     |
| ---------------------------------------- | ---------- | ------ | ---------------------------------------------- |
| CodeMirror 6 accessibility issues        | Medium     | High   | Manual screen reader testing before acceptance |
| Auto-save causes data loss               | High       | High   | Local storage backup, save indicator           |
| Large documents cause performance issues | Medium     | Medium | Document size limit (500KB)                    |

---

## Phase 3: Version History and Optimistic Locking

### Goals

- Implement optimistic locking for document edits
- Build version history UI
- Enable version restoration
- Implement audit log for metadata changes
- Add markdown import/export (single document)

### Non-Goals

- Real-time collaboration
- Visual diff between versions
- Conflict auto-merge
- Bulk import/export (deferred)

### Task Breakdown

#### 3.1 Optimistic Locking

| ID    | Task                                                                   | Priority | ADR Reference    | Status |
| ----- | ---------------------------------------------------------------------- | -------- | ---------------- | ------ |
| 3.1.1 | Implement server-side version check in transaction (SELECT FOR UPDATE) | Critical | ADR-009          | ✅     |
| 3.1.2 | Return ConflictError with current version on mismatch                  | Critical | ADR-009          | ✅     |
| 3.1.3 | Build conflict resolution modal + Storybook story                      | Critical | ADR-002, ADR-003 | ✅     |
| 3.1.4 | Implement "reload and discard changes" option                          | High     | ADR-009          | ✅     |
| 3.1.5 | Implement "force save as new version" option                           | High     | ADR-009          | ✅     |
| 3.1.6 | Write E2E test for two-tab conflict scenario                           | Critical | ADR-005          | ✅     |

#### 3.2 Revision History

| ID    | Task                                                        | Priority | ADR Reference    | Status |
| ----- | ----------------------------------------------------------- | -------- | ---------------- | ------ |
| 3.2.1 | Create revision on every save (in transaction)              | Critical | ADR-009          | ✅     |
| 3.2.2 | Create tRPC endpoint: list revisions (paginated, limit 100) | High     | ADR-007, ADR-009 | ✅     |
| 3.2.3 | Create tRPC endpoint: get single revision                   | High     | ADR-007, ADR-009 | ✅     |
| 3.2.4 | Build revision history panel + Storybook story              | High     | ADR-002, ADR-003 | ✅     |
| 3.2.5 | Build read-only revision viewer                             | High     | ADR-002          | ✅     |
| 3.2.6 | Implement "restore this version" action                     | High     | ADR-009          | ✅     |
| 3.2.7 | Add confirmation dialog for restore                         | Medium   | -                | ✅     |

#### 3.3 Audit Log

| ID    | Task                                    | Priority | ADR Reference | Status |
| ----- | --------------------------------------- | -------- | ------------- | ------ |
| 3.3.1 | Create audit log service                | High     | ADR-009       | ✅     |
| 3.3.2 | Log video status changes                | High     | ADR-009       | ✅     |
| 3.3.3 | Log video due date/publish date changes | Medium   | ADR-009       | ✅     |
| 3.3.4 | Log category CRUD operations            | Medium   | ADR-009       | ✅     |

#### 3.4 Import/Export

| ID    | Task                                                           | Priority | ADR Reference | Status |
| ----- | -------------------------------------------------------------- | -------- | ------------- | ------ |
| 3.4.1 | Build single document export (download .md)                    | Medium   | ADR-010       | ✅     |
| 3.4.2 | Build single document import (upload .md, creates new version) | Medium   | ADR-010       | ✅     |
| 3.4.3 | Add file size limit (1MB) with validation                      | Medium   | ADR-010       | ✅     |

### Phase 3 Gate (ALL MUST PASS) - PASSED

**Data Integrity Gate:**

- [x] Two-tab conflict E2E test passes
- [x] Concurrent saves never produce duplicate versions
- [x] Revision history correctly ordered
- [x] Restore creates new version (doesn't rewrite history)
- [x] Audit log captures all metadata changes

**UX Gate:**

- [x] Conflict modal appears within 1s of stale save
- [x] User can reload or force save from modal
- [x] Revision viewer is read-only (can't accidentally modify)

---

## Phase 4: Self-Hosting Packaging

### Goals

- Create production-ready Docker image
- Build docker-compose for full stack
- Write comprehensive self-hosting documentation
- Implement setup wizard for first-run
- Document backup/restore procedures

### Non-Goals

- Kubernetes manifests
- Cloud-specific deployment scripts
- High availability configuration
- Automated backups

### Task Breakdown

#### 4.1 Docker Image

| ID    | Task                                                | Priority | ADR Reference    | Status |
| ----- | --------------------------------------------------- | -------- | ---------------- | ------ |
| 4.1.1 | Create multi-stage Dockerfile with non-root user    | Critical | ADR-011          | ✅     |
| 4.1.2 | Configure Next.js standalone output                 | Critical | ADR-001, ADR-011 | ✅     |
| 4.1.3 | Optimize image size (Alpine, minimal deps, < 200MB) | High     | ADR-011          | ✅     |
| 4.1.4 | Handle runtime environment variables correctly      | Critical | ADR-011          | ✅     |
| 4.1.5 | Create health check endpoint (/api/health)          | High     | ADR-011          | ✅     |
| 4.1.6 | Auto-run migrations on container start              | Critical | ADR-006, ADR-011 | ✅     |
| 4.1.7 | Test build on arm64 and amd64                       | High     | ADR-011          | ✅     |
| 4.1.8 | Implement graceful shutdown handling                | Medium   | ADR-011          | ✅     |

#### 4.2 Docker Compose

| ID    | Task                                                      | Priority | ADR Reference | Status |
| ----- | --------------------------------------------------------- | -------- | ------------- | ------ |
| 4.2.1 | Create docker-compose.yml with random PostgreSQL password | Critical | ADR-011       | ✅     |
| 4.2.2 | Configure named volume for Postgres                       | Critical | ADR-011       | ✅     |
| 4.2.3 | Create comprehensive .env.example                         | High     | ADR-011       | ✅     |
| 4.2.4 | Configure service dependencies and healthchecks           | High     | ADR-011       | ✅     |
| 4.2.5 | Test clean start from scratch                             | Critical | ADR-011       | ✅     |
| 4.2.6 | Test data persistence across restarts                     | Critical | ADR-011       | ✅     |

#### 4.3 First-Run Experience

| ID    | Task                                                           | Priority | ADR Reference    | Status |
| ----- | -------------------------------------------------------------- | -------- | ---------------- | ------ |
| 4.3.1 | Detect first run (check setup completion flag)                 | Critical | ADR-011          | ✅     |
| 4.3.2 | Build setup wizard UI                                          | Critical | ADR-002, ADR-011 | ✅     |
| 4.3.3 | Create first user and workspace via wizard                     | Critical | ADR-011          | ✅     |
| 4.3.4 | Lock wizard with persistent flag (file-based) after completion | Critical | ADR-011          | ✅     |
| 4.3.5 | Display helpful error on DB connection failure with retry      | High     | ADR-011          | ✅     |

#### 4.4 Documentation

| ID    | Task                                                        | Priority | Notes         | Status |
| ----- | ----------------------------------------------------------- | -------- | ------------- | ------ |
| 4.4.1 | Write quick start guide (target: 5-15 minutes)              | Critical |               | ✅     |
| 4.4.2 | Document all environment variables                          | Critical |               | ✅     |
| 4.4.3 | Write backup procedure (pg_dump)                            | High     |               | ✅     |
| 4.4.4 | Write restore procedure with verification                   | High     |               | ✅     |
| 4.4.5 | Document upgrade procedure                                  | High     |               | ✅     |
| 4.4.6 | Write troubleshooting guide                                 | Medium   |               | ✅     |
| 4.4.7 | Add reverse proxy examples (nginx, Traefik, Caddy)          | Medium   | Include HTTPS | ✅     |
| 4.4.8 | Document minimum hardware requirements (2GB RAM, 10GB disk) | High     |               | ✅     |
| 4.4.9 | User acceptance test with unfamiliar tester                 | High     |               | ✅     |

### Phase 4 Gate (ALL MUST PASS) - ✅ PASSED

**Security Gate:**

- [x] Setup wizard inaccessible after first user
- [x] Setup flag persists across database wipe
- [x] No default credentials in any configuration
- [x] Health endpoint doesn't leak sensitive info
- [x] Docker image runs as non-root user

**Deployment Gate:**

- [x] Clean `docker-compose up` works from scratch
- [x] Data persists across container restart
- [x] Migration runs successfully on fresh database
- [x] Upgrade migration (simulated) works with data
- [x] Backup/restore procedure verified

**Documentation Gate:**

- [x] Fresh user completes setup in < 15 minutes
- [x] All environment variables documented
- [x] Troubleshooting guide covers common issues
- [x] Reverse proxy examples work (nginx, Caddy)

---

## Phase 5: Multi-Tenant SaaS Mode

### Goals

- Enable multi-tenant mode via configuration
- Implement workspace creation and invitation flows
- Add user management within workspaces
- Implement workspace switching
- Add role-based access control

### Non-Goals

- Actual payment processing
- Custom domains per workspace
- Admin panel for SaaS operator
- Full email verification (basic only)

### Task Breakdown

#### 5.1 Multi-Tenant Configuration

| ID    | Task                                           | Priority | ADR Reference    | Status |
| ----- | ---------------------------------------------- | -------- | ---------------- | ------ |
| 5.1.1 | Implement MODE=multi-tenant detection          | Critical | ADR-008          | ✅     |
| 5.1.2 | Disable setup wizard in multi-tenant           | Critical | ADR-008, ADR-011 | ✅     |
| 5.1.3 | Enable public registration in multi-tenant     | Critical | ADR-008          | ✅     |
| 5.1.4 | Require workspace creation during registration | Critical | ADR-008          | ✅     |

#### 5.2 Team Management

| ID    | Task                                                                        | Priority | ADR Reference    | Status |
| ----- | --------------------------------------------------------------------------- | -------- | ---------------- | ------ |
| 5.2.1 | Create invitations table schema                                             | High     | -                | ✅     |
| 5.2.2 | Implement invitation creation (256-bit token, 24hr expiry, 3-attempt limit) | High     | ADR-007          | ✅     |
| 5.2.3 | Set up Graphile Worker for async email                                      | High     | ADR-012          | ✅     |
| 5.2.4 | Build invitation email template                                             | High     | -                | ✅     |
| 5.2.5 | Set up SMTP configuration                                                   | High     | ADR-012          | ✅     |
| 5.2.6 | Implement invitation acceptance flow                                        | High     | -                | ✅     |
| 5.2.7 | Define role enum (owner, editor, viewer)                                    | High     | ADR-008          | ✅     |
| 5.2.8 | Add RBAC to tRPC middleware                                                 | Critical | ADR-007, ADR-008 | ✅     |
| 5.2.9 | Build team members list and management UI                                   | High     | ADR-002          | ✅     |

#### 5.3 Workspace Switching

| ID    | Task                                                 | Priority | ADR Reference | Status |
| ----- | ---------------------------------------------------- | -------- | ------------- | ------ |
| 5.3.1 | Build workspace switcher component                   | High     | ADR-002       | ✅     |
| 5.3.2 | Implement workspace URL structure (/w/[slug]/...)    | High     | -             | ✅     |
| 5.3.3 | Redirect to selector if user has multiple workspaces | Medium   | -             | ✅     |
| 5.3.4 | Handle workspace removal during active session       | High     | -             | ✅     |

#### 5.4 Defense-in-Depth (Recommended)

| ID    | Task                                            | Priority | ADR Reference | Status |
| ----- | ----------------------------------------------- | -------- | ------------- | ------ |
| 5.4.1 | Evaluate PostgreSQL Row-Level Security policies | Medium   | ADR-008       | ✅     |
| 5.4.2 | Implement RLS as secondary isolation layer      | Medium   | ADR-008       | ✅     |

### Phase 5 Gate (ALL MUST PASS) - ✅ PASSED

**Security Gate:**

- [x] Cross-tenant access prevented (penetration test)
- [x] Invitation tokens are sufficiently random (256-bit)
- [x] Invitation tokens expire in 24 hours
- [x] Role enforcement blocks all unauthorized mutations
- [x] Email header injection prevented

**Multi-Tenancy Gate:**

- [x] User can't access removed workspace
- [x] Workspace switch during save handled gracefully
- [x] Role change takes effect without re-login
- [x] Multiple workspaces correctly isolated

---

## Phase 6: YouTube Integration

### Goals

- Connect YouTube channels via OAuth 2.0
- Sync video metadata from YouTube to local database
- Display analytics (views, likes, comments)
- Link local video projects to published YouTube videos

### Design Status: COMPLETE

All foundational design work has been completed:

1. **ADR-016: YouTube Integration Architecture** - Full technical specification
2. **Database schema designs** - youtube_channels, youtube_video_cache, video_youtube_links, youtube_quota_usage
3. **OAuth flow architecture** - Authorization code flow with PKCE and state validation
4. **Background job design** - Graphile Worker jobs for sync and token refresh
5. **Quota management strategy** - Per-workspace tracking, caching, and batching

### Phase 6.1: OAuth & Channel Connection

| Task   | Description                                 | Priority | Dependencies |
| ------ | ------------------------------------------- | -------- | ------------ |
| 6.1.1  | Add YouTube environment variables to env.ts | High     | -            |
| 6.1.2  | Create youtube_channels table migration     | High     | 6.1.1        |
| 6.1.3  | Implement token encryption service          | High     | 6.1.1        |
| 6.1.4  | Create OAuth authorization URL generator    | High     | 6.1.1        |
| 6.1.5  | Create OAuth callback REST endpoint         | High     | 6.1.3, 6.1.4 |
| 6.1.6  | Create youtubeRouter tRPC router (channels) | High     | 6.1.2, 6.1.5 |
| 6.1.7  | Create YouTube settings page UI             | Medium   | 6.1.6        |
| 6.1.8  | Add channel disconnect functionality        | Medium   | 6.1.6        |
| 6.1.9  | Implement token refresh job                 | Medium   | 6.1.3        |
| 6.1.10 | Add audit logging for channel operations    | Medium   | 6.1.6        |
| 6.1.11 | Write integration tests for OAuth flow      | High     | 6.1.5        |
| 6.1.12 | Document self-hosting YouTube setup         | Medium   | 6.1.7        |

### Phase 6.2: Video Sync

| Task   | Description                                   | Priority | Dependencies |
| ------ | --------------------------------------------- | -------- | ------------ |
| 6.2.1  | Create youtube_video_cache table migration    | High     | 6.1.2        |
| 6.2.2  | Create video_youtube_links table migration    | High     | 6.2.1        |
| 6.2.3  | Implement YouTube API client service          | High     | 6.1.3        |
| 6.2.4  | Create channel video sync job                 | High     | 6.2.3        |
| 6.2.5  | Implement incremental sync (new videos only)  | Medium   | 6.2.4        |
| 6.2.6  | Add sync trigger to tRPC router               | Medium   | 6.2.4        |
| 6.2.7  | Create video linking UI                       | Medium   | 6.2.2        |
| 6.2.8  | Display YouTube metadata on video detail page | Medium   | 6.2.7        |
| 6.2.9  | Add YouTube thumbnail import option           | Low      | 6.2.8        |
| 6.2.10 | Create youtube_quota_usage table migration    | Medium   | -            |
| 6.2.11 | Implement quota tracking service              | Medium   | 6.2.10       |
| 6.2.12 | Write integration tests for video sync        | High     | 6.2.4        |

### Phase 6.3: Analytics

| Task  | Description                            | Priority | Dependencies |
| ----- | -------------------------------------- | -------- | ------------ |
| 6.3.1 | Implement YouTube Analytics API client | High     | 6.1.3        |
| 6.3.2 | Create analytics sync job              | Medium   | 6.3.1        |
| 6.3.3 | Add analytics endpoints to tRPC router | Medium   | 6.3.1        |
| 6.3.4 | Create video stats component           | Medium   | 6.3.3        |
| 6.3.5 | Create channel dashboard widget        | Low      | 6.3.3        |
| 6.3.6 | Implement date range analytics queries | Low      | 6.3.1        |
| 6.3.7 | Add analytics to video detail page     | Medium   | 6.3.4        |
| 6.3.8 | Write integration tests for analytics  | Medium   | 6.3.3        |

### Phase 6.4: Advanced Features (Future)

| Task  | Description                  | Priority | Dependencies |
| ----- | ---------------------------- | -------- | ------------ |
| 6.4.1 | Video upload via YouTube API | Low      | 6.2.3        |
| 6.4.2 | Scheduled publishing support | Low      | 6.4.1        |
| 6.4.3 | Bulk metadata update         | Low      | 6.2.3        |
| 6.4.4 | YouTube webhook integration  | Low      | 6.2.4        |

### Technical Specifications

**OAuth Scopes Required**:

- `youtube.readonly` - Read channel and video data
- `yt-analytics.readonly` - Read analytics data

**API Quota Budget** (10,000 units/day default):
| Operation | Cost | Budgeted Calls/Day |
|-----------|------|-------------------|
| channels.list | 1 | 100 |
| playlistItems.list | 1 | 500 |
| videos.list (batch 50) | 1 | 200 |
| Analytics API | N/A | Separate quota |
| **Reserved buffer** | - | 9,200 |

**Background Jobs**:

- `youtube:refresh_token` - 5 min before expiry
- `youtube:sync_channel` - Every 6 hours
- `youtube:sync_analytics` - Daily

**Security Requirements**:

- AES-256-GCM token encryption
- CSRF state parameter validation
- PKCE code challenge
- Owner-only channel management
- Audit logging for all operations

### Phase 6 Gate Criteria

Before marking Phase 6 complete:

- [ ] All OAuth flows working (connect, disconnect, refresh)
- [ ] Video sync functioning with quota tracking
- [ ] Analytics displaying on video detail page
- [ ] Cross-workspace isolation verified by tests
- [ ] Token encryption working correctly
- [ ] Self-hosting documentation complete
- [ ] Security review passed
- [ ] TRON accessibility review passed

---

## Security Checklist by Phase

### Phase 1 Security Sign-Off - ✅ COMPLETE (2025-12-08)

- [x] Password hashing uses Argon2id
- [x] Session tokens are 256-bit random minimum
- [x] Cookies are HTTP-only, Secure, SameSite=Lax
- [x] Rate limiting in place and tested (5/min login, 3/hr registration)
- [x] CSRF protection implemented (Origin header verification)
- [x] Environment variables validated at startup
- [x] No secrets in logs
- [x] TRUSTED_PROXY validation warns when misconfigured

### Phase 2 Security Sign-Off - ✅ COMPLETE (2025-12-08)

- [x] DOMPurify sanitizes all markdown preview output (XSS prevention)
- [x] Document size limit enforced at server-side (500KB)
- [x] Input validation on all tRPC procedures
- [x] No unsafe innerHTML usage (all content sanitized)
- [x] Workspace scoping enforced on all video/document/category operations

### Phase 3 Security Sign-Off - ✅ COMPLETE (2025-12-09)

- [x] Optimistic locking prevents data loss from concurrent edits
- [x] SELECT FOR UPDATE prevents race conditions in transactions
- [x] Import file size limit enforced (1MB)
- [x] UTF-8 validation on imported markdown files
- [x] Sanitized filenames for document export (no path traversal)
- [x] Removed 'style' from DOMPurify ALLOWED_ATTR (aligns with ADR-014)
- [x] Revision restore creates new version (audit trail preserved)
- [x] Audit log captures all metadata changes for accountability

### Phase 4 Security Sign-Off - ✅ COMPLETE (2025-12-09)

- [x] Setup wizard locked after first user
- [x] Setup flag persists across database wipe
- [x] No default credentials
- [x] HTTPS documentation is clear
- [x] Health endpoint does not leak sensitive info
- [x] Docker image runs as non-root user
- [x] Security audit/penetration test completed

### Phase 5 Security Sign-Off - ✅ COMPLETE (2025-12-10)

- [x] Cross-tenant isolation verified by integration tests
- [x] Invitation tokens sufficiently random and expire
- [x] Invitation token attempts limited
- [x] Role-based access control enforced at API layer
- [x] Email sending does not allow header injection
- [x] Session invalidated on password change

### Phase 6 Security Checklist (YouTube Integration)

- [ ] OAuth state parameter prevents CSRF attacks
- [ ] PKCE code challenge implemented
- [ ] Refresh tokens encrypted with AES-256-GCM at rest
- [ ] Access tokens never logged or exposed in errors
- [ ] Token encryption key from environment variable
- [ ] Cross-workspace YouTube credential isolation tested
- [ ] Owner-only permission for channel connect/disconnect
- [ ] Quota exhaustion cannot affect other workspaces
- [ ] Audit logging for all YouTube operations
- [ ] Self-hosting docs warn about credential security

---

## Appendix: Key Decisions Summary

| Decision              | Choice                                    | ADR                   |
| --------------------- | ----------------------------------------- | --------------------- |
| Framework             | Next.js 14+ App Router                    | ADR-001               |
| Styling               | CSS Modules + Radix UI                    | ADR-002               |
| Component Dev         | Storybook 8+                              | ADR-003               |
| TypeScript            | Strict mode + safety flags                | ADR-004               |
| Testing               | Vitest + Storybook + Playwright           | ADR-005               |
| ORM                   | Drizzle                                   | ADR-006               |
| API Style             | tRPC                                      | ADR-007               |
| Authentication        | Lucia Auth                                | ADR-007               |
| Multi-tenancy         | App-level workspace scoping               | ADR-008               |
| Versioning            | Optimistic locking + document_revisions   | ADR-009               |
| Markdown I/O          | DB as source of truth, file import/export | ADR-010               |
| Self-hosting          | Docker + docker-compose                   | ADR-011               |
| Background Jobs       | Defer, then Graphile Worker in Phase 5    | ADR-012               |
| Markdown Editor       | CodeMirror 6                              | ADR-013               |
| Security Architecture | Defense-in-depth                          | ADR-014               |
| URL Structure         | /w/[slug]/...                             | Architecture Decision |
| Session Storage       | HTTP-only cookies                         | ADR-007, ADR-014      |
| YouTube Integration   | OAuth 2.0 + Encrypted tokens              | ADR-016               |

---

## Appendix: ADR Index

| ADR     | Title                          | Status   |
| ------- | ------------------------------ | -------- |
| ADR-001 | Next.js Framework Selection    | Accepted |
| ADR-002 | Styling Solution (CSS Modules) | Accepted |
| ADR-003 | Storybook Integration          | Accepted |
| ADR-004 | TypeScript Configuration       | Accepted |
| ADR-005 | Testing Strategy               | Accepted |
| ADR-006 | ORM Selection (Drizzle)        | Accepted |
| ADR-007 | API Style and Authentication   | Accepted |
| ADR-008 | Multi-Tenancy Strategy         | Accepted |
| ADR-009 | Versioning and Audit Approach  | Accepted |
| ADR-010 | Markdown Import/Export         | Accepted |
| ADR-011 | Self-Hosting Strategy          | Accepted |
| ADR-012 | Background Jobs Strategy       | Accepted |
| ADR-013 | Markdown Editor Selection      | Accepted |
| ADR-014 | Security Architecture          | Accepted |
| ADR-015 | Row-Level Security Evaluation  | Deferred |
| ADR-016 | YouTube Integration            | Accepted |

---

## Appendix: Risk Mitigations Summary

The QA Architect identified 26 mitigations. Key ones by phase:

### Immediate (Before Phase 1)

- MIT-001: Add cross-tenant isolation integration tests
- MIT-002: Define exact CSRF implementation pattern
- MIT-003: Add per-email rate limiting alongside per-IP
- MIT-004: Define password policy (8+ chars, common password check)
- MIT-005: Add `npm audit` to CI pipeline

### Phase 1

- MIT-006: Verify TRUSTED_PROXY implementation includes validation
- MIT-007: Add session invalidation on password change
- MIT-009: Test Argon2 on arm64 architecture

### Phase 2

- MIT-010: Manual screen reader testing (VoiceOver, NVDA)
- MIT-011: Add slow network E2E test scenarios
- MIT-013: Add aria-live regions for save status

### Phase 4

- MIT-018: Ensure Dockerfile uses non-root user
- MIT-019: Generate random PostgreSQL password
- MIT-020: Document SSL/HTTPS configuration
- MIT-021: Test migration on database with existing data
- MIT-023: Security audit/penetration test before release

### Phase 5

- MIT-024: Consider RLS policies as defense-in-depth
- MIT-025: Invitation token attempt limiting
- MIT-026: Test workspace removal during active session

### Phase 6

- MIT-027: OAuth state parameter validation with cryptographic randomness
- MIT-028: PKCE implementation for OAuth code exchange
- MIT-029: AES-256-GCM encryption for refresh token storage
- MIT-030: Per-workspace quota tracking to prevent resource exhaustion
- MIT-031: Token refresh proactive scheduling (5 min before expiry)
- MIT-032: Cross-workspace YouTube credential isolation tests
- MIT-033: Graceful handling of Google API quota exceeded errors
- MIT-034: Self-hosting documentation for Google Cloud OAuth setup

---

## Revision History

| Date       | Version | Author                                          | Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------- | ------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-12-08 | 1.0     | Strategic Planner, Lead Developer, QA Architect | Initial approved plan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2025-12-08 | 2.0     | Strategic Planner, Lead Developer, QA Architect | ADR review and revision: fixed ADR numbering, added ADR-013, added phase gates, incorporated 26 mitigations                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2025-12-08 | 2.1     | Strategic Planner, Security Architect           | Security architecture: added ADR-014, updated ADR-011 Docker hardening, corrected CSRF approach (Origin header verification)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2025-12-08 | 2.2     | Strategic Project Planner                       | Phase 1 COMPLETE: All gates passed. Reviews: QA Architect (PASS), Security Architect (SECURE), Code Quality (APPROVED). Auth coverage 92.42%. CI pipeline configured. Ready for Phase 2.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2025-12-08 | 2.3     | Strategic Project Planner                       | Phase 2 COMPLETE: All gates passed. Reviews: QA Architect (PASS WITH RECOMMENDATIONS), Security Architect (SECURE WITH RECOMMENDATIONS - server-side 500KB limit added), Code Quality (APPROVED). Full video management UI, CodeMirror 6 markdown editor with auto-save and local backup, category management, comprehensive accessibility implementation. Ready for Phase 3.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2025-12-09 | 2.4     | Strategic Project Planner                       | Phase 3 COMPLETE: All gates passed. Reviews: QA Architect (PASS WITH RECOMMENDATIONS), Security Architect (SECURE WITH RECOMMENDATIONS), Code Quality (APPROVED after fixes). Optimistic locking with conflict resolution, revision history with restore, centralized audit log, document import/export. Security: removed 'style' from DOMPurify. Code quality: shared date-utils.ts, CONTENT_PREVIEW_LENGTH constant. Ready for Phase 4.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2025-12-09 | 2.5     | Strategic Project Planner                       | Phase 4 COMPLETE: All gates passed. Reviews: QA Architect (NEEDS WORK → PASS after fixes), Security Architect (SECURE WITH RECOMMENDATIONS), Code Quality (APPROVED WITH RECOMMENDATIONS). Multi-stage Dockerfile with Alpine (~200MB), non-root user (nextjs:nodejs, UID 1001), dumb-init for signal handling, PostgreSQL 16 with health checks, file-based setup completion flag, comprehensive DOCKER.md documentation, reverse proxy examples (Caddy), backup/restore procedures. Critical fixes: migration dependencies bundled, DATABASE_URL clarified, PostgreSQL port commented out by default, isSetupComplete() deduplicated, setup wizard accessibility improved. Ready for Phase 5.                                                                                                                                                                                               |
| 2025-12-10 | 2.6     | Strategic Project Planner                       | Phase 5 COMPLETE: All gates passed. Reviews: QA Architect (PASS WITH RECOMMENDATIONS after fixes), Security Architect (SECURE WITH RECOMMENDATIONS), Code Quality (NEEDS WORK → APPROVED after fixes). Multi-tenant MODE detection, workspace slug generation, invitations schema with 256-bit tokens and 24hr expiry, inline email service with CRLF injection prevention, HTML-escaped email templates (XSS prevention), invitation and team tRPC routers, audit logging for all operations, owner/editor/viewer RBAC enforcement, workspace switcher with Storybook stories, team management page, custom confirmation modals, ADR-015 created for RLS evaluation (deferred with documented rationale). Critical fixes: XSS in email templates, session creation after invitation acceptance, native dialogs replaced with custom modals, table accessibility improved. Ready for Phase 6. |
| 2025-12-10 | 2.7     | Strategic Project Planner                       | Phase 6 DESIGN COMPLETE: ADR-016 created for YouTube Integration architecture. Comprehensive design includes: OAuth 2.0 flow with PKCE and state validation, AES-256-GCM token encryption, 4 new database tables (youtube_channels, youtube_video_cache, video_youtube_links, youtube_quota_usage), Graphile Worker background jobs for sync/refresh, per-workspace quota tracking, 36 implementation tasks across 4 sub-phases. Environment variables added to env.ts and .env.example. Schema design document created. Security checklist and 8 new risk mitigations added. Phase 6 ready for implementation when YouTube features are needed.                                                                                                                                                                                                                                              |
