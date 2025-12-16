# Phase 1: Critical Issues - Agent Assignment

**Date**: 2025-12-15
**Phase**: 1 of 4
**Assigned To**: senior-nextjs-developer
**Coordinator**: project-orchestrator

## Instructions for Senior Developer

You are assigned 4 critical tasks that must be completed before we can proceed to Phase 2. These tasks can be worked on in sequence or parallel as you see fit.

### Task 1.1: Add TeamspaceRepository Unit Tests

**Priority**: Critical
**File to Create**: `/src/server/repositories/teamspace-repository.test.ts`
**Reviewer**: qa-architect

**Requirements**:

1. Follow the pattern from `/src/server/repositories/workspace-isolation.test.ts`
2. Test all methods:
   - `getAll()` - test filtering by user access
   - `getById()` - test access control
   - `getBySlug()` - test access control
   - `create()` - test creation and validation
   - `update()` - test updates and access control
   - `delete()` - test deletion and access control
3. Test role-based access control (admin, member, viewer)
4. Test slug uniqueness validation
5. Achieve 80%+ coverage for TeamspaceRepository

**Acceptance Criteria**:

- All methods have test coverage
- Role-based access control is tested
- Tests follow existing patterns
- Coverage meets 80% threshold

### Task 1.2: Fix Non-Null Assertions in Project Router

**Priority**: Critical
**File to Edit**: `/src/server/trpc/routers/project.ts` (lines 82, 178, 206)
**Reviewer**: code-quality-enforcer

**Requirements**:

1. Remove all `!` non-null assertions at lines 82, 178, and 206
2. Replace with proper guard patterns (if checks, early returns, or type narrowing)
3. Ensure TypeScript strict mode compliance
4. No `any` types introduced

**Example Pattern**:

```typescript
// WRONG
const project = projects.find((p) => p.id === id)!;

// CORRECT
const project = projects.find((p) => p.id === id);
if (!project) {
  throw new TRPCError({
    code: 'NOT_FOUND',
    message: 'Project not found',
  });
}
```

**Acceptance Criteria**:

- No non-null assertions remain
- TypeScript strict mode passes
- Proper error handling in place

### Task 1.3: Create Access Denied Page

**Priority**: Critical
**Files to Create**:

- `/src/app/(app)/access-denied/page.tsx`
- `/src/app/(app)/access-denied/page.module.scss`
  **File to Edit**:
- `/src/app/(app)/t/[teamspace]/[project]/layout.tsx`
  **Reviewer**: tron-user-advocate

**Requirements**:

1. Create a clear, user-friendly access denied page
2. Explain what happened (tried to access a project without permission)
3. Provide actionable next steps:
   - Link back to teamspace list
   - Suggest contacting team admin for access
4. Use CSS Modules for styling (NO Tailwind, NO inline styles)
5. Follow existing error page patterns
6. Update the project layout to redirect to `/access-denied` instead of `/login`

**Acceptance Criteria**:

- Clear, helpful error message
- Actionable next steps provided
- CSS Modules used for styling
- No silent redirects to login
- Accessible (WCAG 2.1 AA)

### Task 1.4: Add Error Boundaries

**Priority**: Critical
**Files to Create**:

- `/src/app/(app)/t/[teamspace]/error.tsx`
- `/src/app/(app)/t/[teamspace]/error.module.scss`
- `/src/app/(app)/t/[teamspace]/[project]/error.tsx`
- `/src/app/(app)/t/[teamspace]/[project]/error.module.scss`
  **Reviewer**: qa-architect, tron-user-advocate

**Requirements**:

1. Follow Next.js error boundary pattern (use 'use client' directive)
2. Use CSS Modules for styling (NO Tailwind classes)
3. Include helpful error messages
4. Provide reset functionality
5. Check existing error boundaries for patterns to follow:
   - `/src/app/(app)/t/[teamspace]/[project]/videos/error.tsx` (but convert from Tailwind)
6. Log errors using Pino logger (not console.error)

**Acceptance Criteria**:

- Both error boundaries created
- CSS Modules used (ADR-002 compliant)
- Helpful error messages included
- Reset functionality works
- Pino logger used for error logging

## General Guidelines

1. **Read First**: Before editing any file, use the Read tool to examine it
2. **Follow Patterns**: Match existing codebase patterns
3. **TypeScript Strict**: Ensure all changes pass strict mode
4. **Test Coverage**: Add tests where appropriate
5. **No Console**: Use Pino logger for all logging
6. **CSS Modules**: Never use Tailwind or inline styles

## When You Encounter Issues

If you are unsure about anything, escalate to me (project-orchestrator) immediately. Do not guess or make assumptions.

## Reporting

After completing each task:

1. Report completion to me
2. List files changed
3. Note any issues or concerns
4. Request review from assigned reviewer

## Starting

Please begin with Task 1.1 (TeamspaceRepository tests) as this establishes our testing foundation. Then proceed to the other tasks in any order you prefer.
