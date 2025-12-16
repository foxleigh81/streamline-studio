# Teamspace Hierarchy Remediation Tasks

**Status**: In Progress
**Started**: 2025-12-15
**Priority**: Critical

## Overview

Following QA, Code Quality, and TRON reviews of the teamspace hierarchy implementation, 13 issues have been identified requiring remediation. These issues span testing, type safety, error handling, security, and code standards.

## Task Breakdown

### Phase 1: Critical Issues (Must Fix)

#### Task 1.1: Add TeamspaceRepository Unit Tests

- **Owner**: senior-nextjs-developer
- **Reviewer**: qa-architect
- **Status**: Pending
- **Files**:
  - Create `/src/server/repositories/teamspace-repository.test.ts`
- **Details**:
  - Follow pattern from `workspace-isolation.test.ts`
  - Test all methods: getAll, getById, getBySlug, create, update, delete
  - Test role-based access control
  - Test slug uniqueness validation
- **Acceptance**: 80%+ coverage for TeamspaceRepository

#### Task 1.2: Fix Non-Null Assertions in Project Router

- **Owner**: senior-nextjs-developer
- **Reviewer**: code-quality-enforcer
- **Status**: Pending
- **Files**: `/src/server/trpc/routers/project.ts` (lines 82, 178, 206)
- **Details**: Replace `!` assertions with proper guard patterns
- **Acceptance**: No non-null assertions, TypeScript strict mode passes

#### Task 1.3: Create Access Denied Page

- **Owner**: senior-nextjs-developer
- **Reviewer**: tron-user-advocate
- **Status**: Pending
- **Files**:
  - Create `/src/app/(app)/access-denied/page.tsx`
  - Create `/src/app/(app)/access-denied/layout.tsx`
  - Update `/src/app/(app)/t/[teamspace]/[project]/layout.tsx`
- **Details**:
  - Informative page explaining access denial
  - Link back to teamspace list
  - Use CSS Modules for styling
- **Acceptance**: Clear UX, no silent redirects

#### Task 1.4: Add Error Boundaries

- **Owner**: senior-nextjs-developer
- **Reviewer**: qa-architect, tron-user-advocate
- **Status**: Pending
- **Files**:
  - Create `/src/app/(app)/t/[teamspace]/error.tsx`
  - Create `/src/app/(app)/t/[teamspace]/[project]/error.tsx`
- **Details**:
  - Follow Next.js error boundary pattern
  - Use CSS Modules (no Tailwind)
  - Include helpful error messages
- **Acceptance**: Error boundaries exist, use CSS Modules

### Phase 2: High Priority Issues (Security & Type Safety)

#### Task 2.1: Fix Unsafe Role Mapping

- **Owner**: senior-nextjs-developer
- **Reviewer**: code-quality-enforcer, nextjs-security-architect
- **Status**: Pending
- **Files**: `/src/server/trpc/routers/project.ts` (lines 28-46)
- **Details**:
  - Make TeamspaceRole → ProjectRole mapping explicit
  - Handle admin role properly (doesn't exist in ProjectRole)
  - Add type guards
- **Acceptance**: No unsafe type casts, type-safe mapping

#### Task 2.2: Convert Error Boundary to CSS Modules

- **Owner**: senior-nextjs-developer
- **Reviewer**: code-quality-enforcer
- **Status**: Pending
- **Files**:
  - `/src/app/(app)/t/[teamspace]/[project]/videos/error.tsx`
  - Create corresponding `.module.scss` file
- **Details**: Replace all Tailwind classes with CSS Modules
- **Acceptance**: ADR-002 compliance, no Tailwind classes

#### Task 2.3: Change FORBIDDEN to NOT_FOUND

- **Owner**: senior-nextjs-developer
- **Reviewer**: nextjs-security-architect
- **Status**: Pending
- **Files**: `/src/server/trpc/routers/project.ts` (lines 233-238)
- **Details**:
  - Replace FORBIDDEN with NOT_FOUND to prevent information disclosure
  - Update tests to expect NOT_FOUND
- **Acceptance**: Security best practice, no information leakage

#### Task 2.4: Add Loading/Error States to TeamspaceProvider

- **Owner**: senior-nextjs-developer
- **Reviewer**: tron-user-advocate
- **Status**: Pending
- **Files**: `/src/lib/teamspace/provider.tsx`
- **Details**:
  - Add explicit loading state component
  - Add explicit error state component
  - Don't render children until data loaded
- **Acceptance**: Clear loading/error UX

### Phase 3: Medium Priority Issues (Code Quality)

#### Task 3.1: Rename workspaceId to projectId in Schema

- **Owner**: senior-nextjs-developer
- **Reviewer**: code-quality-enforcer
- **Status**: Pending
- **Files**:
  - `/src/server/db/schema.ts`
  - Create new migration
  - Update all references in codebase
- **Details**:
  - Rename columns in videos, categories, auditLog, invitations
  - Generate and test migration
  - Update all TypeScript references
- **Acceptance**: Consistent naming, migration succeeds

#### Task 3.2: Replace console.error with Pino Logger

- **Owner**: senior-nextjs-developer
- **Reviewer**: code-quality-enforcer
- **Status**: Pending
- **Files**: `/src/app/(app)/t/[teamspace]/[project]/videos/error.tsx` (line 21)
- **Details**: Import and use `logger.error()` instead of `console.error()`
- **Acceptance**: No console usage, Pino logger used

#### Task 3.3: Extract Role Hierarchy to Shared Constant

- **Owner**: senior-nextjs-developer
- **Reviewer**: code-quality-enforcer
- **Status**: Pending
- **Files**:
  - Create `/src/lib/constants/roles.ts`
  - Update 4 locations to use shared constant
- **Details**:
  - Define role hierarchy once
  - Import in all locations
  - Locations:
    - `/src/lib/teamspace/context.tsx`
    - `/src/lib/project/context.tsx`
    - `/src/lib/permissions/index.ts` (2 places)
- **Acceptance**: Single source of truth, no duplication

#### Task 3.4: Add Slug Format Validation

- **Owner**: senior-nextjs-developer
- **Reviewer**: code-quality-enforcer
- **Status**: Pending
- **Files**: `/src/server/trpc/routers/teamspace.ts` (line 47)
- **Details**:
  - Add Zod regex validation: `/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/`
  - Test invalid slug formats
- **Acceptance**: Validation prevents invalid slugs

#### Task 3.5: Convert Teamspace Settings to CSS Modules

- **Owner**: senior-nextjs-developer
- **Reviewer**: code-quality-enforcer, tron-user-advocate
- **Status**: Pending
- **Files**:
  - `/src/app/(app)/t/[teamspace]/settings/page.tsx`
  - Create corresponding `.module.scss` file
- **Details**: Replace inline styles with CSS Modules
- **Acceptance**: ADR-002 compliance, no inline styles

### Phase 4: Verification

#### Task 4.1: Run Full CI Verification

- **Owner**: qa-architect
- **Status**: Pending
- **Commands**:
  - `npm run lint`
  - `npm run type-check`
  - `npm run test:coverage`
  - `npm run build`
- **Acceptance**: All checks pass, 80%+ coverage maintained

## Dependencies

- Tasks 1.1-1.4 can run in parallel (Phase 1)
- Tasks 2.1-2.4 can run in parallel after Phase 1 (Phase 2)
- Tasks 3.1-3.5 can run in parallel after Phase 2 (Phase 3)
- Task 4.1 runs after all other tasks complete (Phase 4)

## Risk Assessment

- **High Risk**: Task 3.1 (schema migration) - requires careful testing
- **Medium Risk**: Task 2.1 (role mapping) - affects authorization logic
- **Low Risk**: All other tasks - localized changes

## Estimated Complexity

- **Phase 1**: High complexity (testing + architecture)
- **Phase 2**: Medium complexity (type safety + security)
- **Phase 3**: Low-medium complexity (refactoring)
- **Phase 4**: Low complexity (verification)

## Success Criteria

- All 13 issues resolved
- No regressions introduced
- CI pipeline passes
- Code coverage maintained at 80%+
- No TypeScript errors
- No ESLint errors
- ADR compliance verified
