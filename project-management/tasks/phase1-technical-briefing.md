# Phase 1 Technical Briefing - Critical Issues Remediation

**Coordinator**: Project Orchestrator
**Developer**: senior-nextjs-developer
**Date**: 2025-12-15

## Overview

You have been assigned 4 critical remediation tasks following QA, Code Quality, and TRON reviews. This briefing provides all technical context needed to complete the work.

## Critical Context

### Project Structure

- **Root**: `/Users/foxleigh81/dev/internal/streamline-studio`
- **Tests**: Place repository tests in `/src/server/repositories/__tests__/`
- **Error Boundaries**: App router error boundaries use `error.tsx` pattern
- **Styles**: SCSS modules (`.module.scss`) only - NO Tailwind, NO inline styles

### Code Standards

- **TypeScript**: Strict mode enabled, no `any` types without justification
- **Logging**: Use Pino logger (`@/lib/logger`), never `console.error`
- **Testing**: Follow Vitest patterns from existing tests
- **CSS**: Reference theme SCSS variables from `/src/themes/default/`

## Task 1: TeamspaceRepository Unit Tests

### File to Create

`/src/server/repositories/__tests__/teamspace-repository.test.ts`

### Reference Files

- **Pattern**: `/src/server/repositories/__tests__/workspace-isolation.test.ts`
- **Implementation**: `/src/server/repositories/teamspace-repository.ts`

### TeamspaceRepository Methods to Test

```typescript
// Constructor
constructor(db, teamspaceId) // throws if teamspaceId empty

// Teamspace Methods
getTeamspaceById(id: string): Promise<Teamspace | null>
getTeamspaceBySlug(slug: string): Promise<Teamspace | null>
updateTeamspace(data: Partial<Teamspace>): Promise<Teamspace | null>

// Member Methods
getTeamspaceMembers(): Promise<TeamspaceUser[]>
getMemberRole(userId: string): Promise<TeamspaceRole | null>
addMember(userId: string, role: TeamspaceRole): Promise<TeamspaceUser>
updateMemberRole(userId: string, role: TeamspaceRole): Promise<TeamspaceUser | null>
removeMember(userId: string): Promise<boolean>

// Project Methods
getProjects(): Promise<Project[]>
createProject(data: NewProject): Promise<Project>
```

### Test Structure

```typescript
import { describe, it, expect, vi } from 'vitest';
import { TeamspaceRepository } from '../teamspace-repository';

// Mock database
vi.mock('@/server/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('TeamspaceRepository', () => {
  describe('Constructor validation', () => {
    it('throws error when teamspaceId is empty', () => {
      // Test empty string throws
    });

    it('stores teamspaceId correctly', () => {
      // Test getTeamspaceId() returns correct value
    });
  });

  describe('Teamspace isolation', () => {
    it('repository is scoped to single teamspace', () => {
      // Create two repos, verify different IDs
    });

    it('has expected methods defined', () => {
      // Verify all public methods exist
    });
  });
});
```

### Acceptance Criteria

- All methods have tests (constructor + 11 methods)
- Follows workspace-isolation.test.ts pattern
- 80%+ coverage for TeamspaceRepository
- Uses Vitest, not Jest

---

## Task 2: Fix Non-Null Assertions

### File to Edit

`/src/server/trpc/routers/project.ts`

### Lines with `!` Assertions

- **Line 82**: `const { teamspaceId, teamspaceRole } = teamspaceAccess[0]!;`
- **Line 178**: `const { teamspaceId, teamspaceRole } = teamspaceAccess[0]!;`
- **Line 206**: `const project = projectResult[0]!;`

### Current Code Pattern (Line 82)

```typescript
const teamspaceAccess = await ctx.db
  .select({ teamspaceId: teamspaces.id, teamspaceRole: teamspaceUsers.role })
  .from(teamspaceUsers)
  .innerJoin(teamspaces, eq(teamspaceUsers.teamspaceId, teamspaces.id))
  .where(
    and(
      eq(teamspaces.slug, input.teamspaceSlug),
      eq(teamspaceUsers.userId, ctx.user.id)
    )
  )
  .limit(1);

if (teamspaceAccess.length === 0) {
  throw new TRPCError({ code: 'NOT_FOUND', message: 'Teamspace not found' });
}

const { teamspaceId, teamspaceRole } = teamspaceAccess[0]!; // <- REMOVE THIS
```

### Correct Pattern

```typescript
const teamspaceAccess = await ctx.db
  .select({ teamspaceId: teamspaces.id, teamspaceRole: teamspaceUsers.role })
  .from(teamspaceUsers)
  .innerJoin(teamspaces, eq(teamspaceUsers.teamspaceId, teamspaces.id))
  .where(
    and(
      eq(teamspaces.slug, input.teamspaceSlug),
      eq(teamspaceUsers.userId, ctx.user.id)
    )
  )
  .limit(1);

const firstAccess = teamspaceAccess[0];
if (!firstAccess) {
  throw new TRPCError({ code: 'NOT_FOUND', message: 'Teamspace not found' });
}

const { teamspaceId, teamspaceRole } = firstAccess; // <- Type-safe
```

### Apply to All 3 Locations

1. Line 82 - `listInTeamspace` procedure
2. Line 178 - `getBySlug` procedure
3. Line 206 - `getBySlug` procedure (project result)

### Acceptance Criteria

- Zero non-null assertions (`!`) remain in the file
- TypeScript strict mode compiles without errors
- Proper null/undefined checks before destructuring
- Meaningful error messages maintained

---

## Task 3: Create Access Denied Page

### Files to Create

1. `/src/app/(app)/access-denied/page.tsx`
2. `/src/app/(app)/access-denied/page.module.scss`

### File to Edit

`/src/app/(app)/t/[teamspace]/[project]/layout.tsx`

### Current Problematic Code (layout.tsx, lines 34-38)

```typescript
const workspaceAccess = await validateWorkspaceAccess(user.id, params.project);
if (!workspaceAccess) {
  redirect('/login'); // <- BAD: Silent redirect, user confused
}
```

### Change To

```typescript
const workspaceAccess = await validateWorkspaceAccess(user.id, params.project);
if (!workspaceAccess) {
  redirect('/access-denied'); // <- GOOD: Informative page
}
```

### Access Denied Page Requirements

**Content to Include**:

- Clear heading: "Access Denied"
- Explanation: "You don't have permission to access this project"
- Why it happened: User isn't a member or lacks permission
- Next steps:
  - Link to teamspace list: "Return to My Teamspaces"
  - Suggestion: "Contact the team admin to request access"
- Professional, friendly tone

**Styling**:

- Use CSS Modules (`.module.scss`)
- Reference theme variables from `/src/themes/default/`
- Center content vertically and horizontally
- Use semantic HTML (main, section, heading hierarchy)
- Include ARIA labels for accessibility

**Example Structure**:

```tsx
import styles from './page.module.scss';
import Link from 'next/link';

export default function AccessDeniedPage() {
  return (
    <main className={styles.container}>
      <section className={styles.content}>
        <h1 className={styles.heading}>Access Denied</h1>
        <p className={styles.message}>...</p>
        <div className={styles.actions}>
          <Link href="/teamspaces" className={styles.button}>
            Return to My Teamspaces
          </Link>
        </div>
      </section>
    </main>
  );
}
```

### Acceptance Criteria

- Clear, user-friendly error message
- Actionable next steps (link to teamspaces)
- CSS Modules used (NO Tailwind, NO inline styles)
- Accessible (semantic HTML, ARIA)
- Layout redirects to `/access-denied` not `/login`

---

## Task 4: Add Error Boundaries

### Files to Create

**Teamspace Level**:

1. `/src/app/(app)/t/[teamspace]/error.tsx`
2. `/src/app/(app)/t/[teamspace]/error.module.scss`

**Project Level**: 3. `/src/app/(app)/t/[teamspace]/[project]/error.tsx` 4. `/src/app/(app)/t/[teamspace]/[project]/error.module.scss`

### Reference (BUT DO NOT COPY - Has Tailwind)

`/src/app/(app)/t/[teamspace]/[project]/videos/error.tsx`

This file uses Tailwind classes - you must convert to CSS Modules.

### Error Boundary Pattern

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import styles from './error.module.scss';

export default function TeamspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  // Log with Pino, not console.error
  logger.error(
    { error: error.message, digest: error.digest },
    'Teamspace error'
  );

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Icon, heading, message */}
        <h2 className={styles.heading}>Teamspace Error</h2>
        <p className={styles.message}>
          {error.message || 'Something went wrong'}
        </p>

        {/* Action buttons */}
        <div className={styles.actions}>
          <button onClick={reset} className={styles.primaryButton}>
            Try Again
          </button>
          <button
            onClick={() => router.back()}
            className={styles.secondaryButton}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
```

### SCSS Module Template

```scss
@use '@/themes/default/variables' as *;

.container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: $spacing-4;
}

.card {
  max-width: 28rem;
  padding: $spacing-6;
  background: $color-background-primary;
  border: 1px solid $color-border;
  border-radius: $border-radius-lg;
  box-shadow: $shadow-lg;
}

// Continue with theme variables...
```

### Error Boundary Differences

**Teamspace Error** (`/t/[teamspace]/error.tsx`):

- Heading: "Teamspace Error"
- Message: "There was a problem loading this teamspace"
- Back button goes to `/teamspaces` list

**Project Error** (`/t/[teamspace]/[project]/error.tsx`):

- Heading: "Project Error"
- Message: "There was a problem loading this project"
- Back button uses `router.back()` (goes to teamspace)

### Acceptance Criteria

- Both error boundaries created (teamspace + project)
- Use `'use client'` directive (required for error boundaries)
- Pino logger used, NOT `console.error`
- CSS Modules used, NO Tailwind classes
- Helpful error messages with error.digest if available
- Reset functionality works
- Accessible (WCAG 2.1 AA - semantic HTML, focus management)

---

## Execution Guidelines

### Order of Work

1. Start with Task 1 (tests) - establishes foundation
2. Tasks 2-4 can be done in any order

### Before Editing Any File

1. Use Read tool to examine the file
2. Understand the context and patterns
3. Check for similar patterns in codebase

### After Each Task

1. Run type-check: `npm run type-check`
2. Run lint: `npm run lint`
3. Run tests if applicable: `npm test`
4. Report completion to project-orchestrator

### If You Encounter Issues

- **Unclear requirement**: Escalate to me immediately
- **TypeScript errors**: Check strict mode settings, fix properly
- **Test failures**: Review test patterns, check mocks
- **Missing theme variables**: Check `/src/themes/default/` for available variables

### Files You'll Need to Read

- `/src/server/repositories/teamspace-repository.ts` (Task 1)
- `/src/server/repositories/__tests__/workspace-isolation.test.ts` (Task 1)
- `/src/server/trpc/routers/project.ts` (Task 2)
- `/src/app/(app)/t/[teamspace]/[project]/layout.tsx` (Task 3)
- `/src/app/(app)/t/[teamspace]/[project]/videos/error.tsx` (Task 4 reference)
- `/src/themes/default/` (Task 3, 4 for SCSS variables)

## Success Criteria for Phase 1

- All 4 tasks completed
- No TypeScript errors (`npm run type-check` passes)
- No ESLint errors (`npm run lint` passes)
- Tests pass (`npm test` passes)
- 80%+ coverage for TeamspaceRepository
- No Tailwind classes, no inline styles, no console usage
- Ready for review by assigned specialist agents

## Starting Point

Begin with **Task 1: TeamspaceRepository Unit Tests**. Read the implementation file and the pattern file, then create comprehensive tests following the Vitest patterns.

Good luck! Report back after each task completion.
