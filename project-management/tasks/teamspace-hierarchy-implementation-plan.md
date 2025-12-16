# Teamspace Hierarchy Implementation Plan

**Created**: 2025-12-15
**Status**: Ready for Implementation
**Related ADRs**: ADR-017 (Teamspace Hierarchy), ADR-018 (Data Portability)
**Estimated Effort**: 3-4 weeks (2 senior devs + QA)

## Overview

This document outlines the implementation plan for introducing a two-tier teamspace hierarchy (Teamspace → Project) to replace the current flat workspace structure. This change supports SaaS billing, team-level permissions, and future data portability.

**Key Architectural Change:**

- Current: `/w/[workspace-slug]` → Flat workspace structure
- New: `/t/[teamspace-slug]/[project-slug]` → Two-tier hierarchy

## Pre-Implementation Checklist

- [x] ADR-017 approved and documented
- [x] ADR-018 approved and documented
- [x] ADR-008 marked as superseded
- [x] ADR-007 updated with permission model notes
- [ ] Team alignment meeting completed
- [ ] Database backup strategy confirmed
- [ ] Rollback plan documented

## Phase 1: Database Schema Changes (3-4 days)

### 1.1 Create New Tables

**Priority**: Critical
**Assignee**: Senior Developer
**Estimated**: 1 day

Create new `teamspaces` and `teamspace_users` tables:

```sql
-- Create teamspaces table
CREATE TABLE teamspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  external_id TEXT UNIQUE,  -- For future data portability (ADR-018)
  billing_plan TEXT,        -- 'free' | 'pro' | 'enterprise'
  billing_customer_id TEXT, -- Stripe customer ID
  mode TEXT NOT NULL DEFAULT 'single-tenant', -- 'single-tenant' | 'multi-tenant'
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_teamspaces_slug ON teamspaces(slug);
CREATE INDEX idx_teamspaces_external_id ON teamspaces(external_id) WHERE external_id IS NOT NULL;

-- Create teamspace_users join table
CREATE TABLE teamspace_users (
  teamspace_id UUID NOT NULL REFERENCES teamspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  joined_at TIMESTAMP NOT NULL DEFAULT now(),
  PRIMARY KEY (teamspace_id, user_id)
);

CREATE INDEX idx_teamspace_users_teamspace ON teamspace_users(teamspace_id);
CREATE INDEX idx_teamspace_users_user ON teamspace_users(user_id);
```

**Testing**:

- Unit tests for table creation
- Verify constraints (role enum, unique constraints)
- Test cascade deletion behavior

### 1.2 Rename and Modify Existing Tables

**Priority**: Critical
**Assignee**: Senior Developer
**Estimated**: 1 day

Rename `workspaces` → `projects` and `workspace_users` → `project_users`:

```sql
-- Rename tables
ALTER TABLE workspaces RENAME TO projects;
ALTER TABLE workspace_users RENAME TO project_users;

-- Add teamspace_id to projects
ALTER TABLE projects
ADD COLUMN teamspace_id UUID REFERENCES teamspaces(id) ON DELETE CASCADE;

-- Will be set to NOT NULL after data migration
-- For now, allow NULL during transition

-- Add role_override to project_users
ALTER TABLE project_users
ADD COLUMN role_override TEXT CHECK (role_override IN ('admin', 'editor', 'viewer'));

-- Drop old unique constraint on slug
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS workspaces_slug_key;

-- Add composite unique constraint (after teamspace_id populated)
-- Will be added in migration step
```

**Testing**:

- Verify table renames
- Verify new columns added
- Test foreign key constraints
- Verify NULL handling during transition

### 1.3 Update Drizzle Schema

**Priority**: Critical
**Assignee**: Senior Developer
**Estimated**: 1 day

Update `/src/server/db/schema.ts` with new schema:

```typescript
// New teamspaces table
export const teamspaces = pgTable('teamspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  externalId: text('external_id').unique(),
  billingPlan: text('billing_plan'),
  billingCustomerId: text('billing_customer_id'),
  mode: text('mode').notNull().default('single-tenant'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// New teamspace_users join table
export const teamspaceUsers = pgTable(
  'teamspace_users',
  {
    teamspaceId: uuid('teamspace_id')
      .notNull()
      .references(() => teamspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // 'admin' | 'editor' | 'viewer'
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey(table.teamspaceId, table.userId),
  })
);

// Updated projects table (renamed from workspaces)
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamspaceId: uuid('teamspace_id')
      .notNull()
      .references(() => teamspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueSlug: unique().on(table.teamspaceId, table.slug),
  })
);

// Updated project_users table (renamed from workspace_users)
export const projectUsers = pgTable(
  'project_users',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleOverride: text('role_override'), // 'admin' | 'editor' | 'viewer' | null
    invitedAt: timestamp('invited_at').notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey(table.projectId, table.userId),
  })
);
```

**Testing**:

- TypeScript compilation succeeds
- Drizzle generates correct migrations
- Type inference works correctly

### 1.4 Generate and Test Migration

**Priority**: Critical
**Assignee**: Senior Developer
**Estimated**: 0.5 day

```bash
npm run db:generate
npm run db:migrate # On test database
```

**Testing**:

- Test migration on fresh database
- Test migration rollback
- Verify all constraints active
- Check indexes created

**Deliverables**:

- Migration files in `/drizzle/`
- Migration testing checklist
- Rollback procedure documented

## Phase 2: Repository Layer Refactoring (4-5 days)

### 2.1 Create TeamspaceRepository

**Priority**: Critical
**Assignee**: Senior Developer
**Estimated**: 2 days

Create `/src/server/repositories/teamspace-repository.ts`:

```typescript
export class TeamspaceRepository {
  constructor(
    private db: Database,
    private teamspaceId: string
  ) {}

  async getTeamspace(): Promise<Teamspace> {
    // Get teamspace by ID
  }

  async getProjects(): Promise<Project[]> {
    // Get all projects in this teamspace
  }

  async getMembers(): Promise<TeamspaceMember[]> {
    // Get all teamspace members with roles
  }

  async getBillingInfo(): Promise<BillingInfo | null> {
    // Get billing information (SaaS mode only)
  }

  async updateSettings(settings: TeamspaceSettings): Promise<void> {
    // Update teamspace settings
  }

  async addMember(userId: string, role: TeamspaceRole): Promise<void> {
    // Add user to teamspace
  }

  async updateMemberRole(userId: string, role: TeamspaceRole): Promise<void> {
    // Update user's teamspace role
  }

  async removeMember(userId: string): Promise<void> {
    // Remove user from teamspace
  }
}
```

**Testing**:

- Unit tests for all methods
- Test with mock database
- Verify scoping (no data leaks)
- Test cascade deletion behavior

### 2.2 Rename and Update WorkspaceRepository → ProjectRepository

**Priority**: Critical
**Assignee**: Senior Developer
**Estimated**: 2 days

Rename `/src/server/repositories/workspace-repository.ts` → `project-repository.ts`:

```typescript
// Update all references from "workspace" to "project"
export class ProjectRepository {
  constructor(
    private db: Database,
    private projectId: string
  ) {}

  // Keep existing methods, update table names
  async getVideos(): Promise<Video[]>;
  async getVideo(id: string): Promise<Video>;
  async createVideo(data: CreateVideoInput): Promise<Video>;
  // ... etc
}
```

**Global Find-Replace**:

- `WorkspaceRepository` → `ProjectRepository`
- `workspace-repository` → `project-repository`
- Update all imports across codebase

**Testing**:

- Update all existing repository tests
- Verify no regression in functionality
- Test with new project foreign keys

### 2.3 Update Repository Exports

**Priority**: Critical
**Assignee**: Senior Developer
**Estimated**: 0.5 day

Update `/src/server/repositories/index.ts`:

```typescript
export { TeamspaceRepository } from './teamspace-repository';
export { ProjectRepository } from './project-repository';
export type {
  Teamspace,
  TeamspaceMember,
  TeamspaceRole,
} from './teamspace-repository';
export type { Project } from './project-repository';
```

**Deliverables**:

- TeamspaceRepository implemented and tested
- ProjectRepository renamed and tested
- All repository tests passing

## Phase 3: Middleware and Authorization (3-4 days)

### 3.1 Update tRPC Middleware

**Priority**: Critical
**Assignee**: Senior Developer
**Estimated**: 2 days

Update `/src/server/trpc/middleware.ts` with two-tier authorization:

```typescript
export const teamspaceProjectProcedure = authedProcedure.use(
  async ({ ctx, next }) => {
    // 1. Extract teamspace and project slugs from request context
    const { teamspaceSlug, projectSlug } = getRouteParams(ctx);

    if (!teamspaceSlug || !projectSlug) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Missing teamspace or project',
      });
    }

    // 2. Resolve teamspace
    const teamspace = await ctx.db
      .select()
      .from(teamspaces)
      .where(eq(teamspaces.slug, teamspaceSlug))
      .limit(1);

    if (!teamspace[0]) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Teamspace not found',
      });
    }

    // 3. Validate teamspace membership
    const teamspaceMember = await ctx.db
      .select()
      .from(teamspaceUsers)
      .where(
        and(
          eq(teamspaceUsers.teamspaceId, teamspace[0].id),
          eq(teamspaceUsers.userId, ctx.user.id)
        )
      )
      .limit(1);

    if (!teamspaceMember[0]) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Not a member of this teamspace',
      });
    }

    // 4. Resolve project
    const project = await ctx.db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.teamspaceId, teamspace[0].id),
          eq(projects.slug, projectSlug)
        )
      )
      .limit(1);

    if (!project[0]) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
    }

    // 5. Validate project access
    const projectMember = await ctx.db
      .select()
      .from(projectUsers)
      .where(
        and(
          eq(projectUsers.projectId, project[0].id),
          eq(projectUsers.userId, ctx.user.id)
        )
      )
      .limit(1);

    // Teamspace admins have automatic access to all projects
    const isTeamspaceAdmin = teamspaceMember[0].role === 'admin';

    if (!projectMember[0] && !isTeamspaceAdmin) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Not invited to this project',
      });
    }

    // 6. Calculate effective role
    const effectiveRole =
      projectMember[0]?.roleOverride || teamspaceMember[0].role;

    // 7. Create repositories
    const teamspaceRepo = new TeamspaceRepository(ctx.db, teamspace[0].id);
    const projectRepo = new ProjectRepository(ctx.db, project[0].id);

    return next({
      ctx: {
        ...ctx,
        teamspace: teamspace[0],
        project: project[0],
        userRole: effectiveRole,
        teamspaceRepo,
        projectRepo,
      },
    });
  }
);
```

**Testing**:

- Unit tests for middleware
- Test all authorization paths
- Test teamspace admin override
- Test role resolution logic
- Test error cases (404, 403)

### 3.2 Create Teamspace-Only Middleware

**Priority**: High
**Assignee**: Senior Developer
**Estimated**: 1 day

For teamspace-level routes (settings, billing):

```typescript
export const teamspaceProcedure = authedProcedure.use(async ({ ctx, next }) => {
  const { teamspaceSlug } = getRouteParams(ctx);

  // Steps 1-3 from above (no project validation)

  const teamspaceRepo = new TeamspaceRepository(ctx.db, teamspace[0].id);

  return next({
    ctx: {
      ...ctx,
      teamspace: teamspace[0],
      userRole: teamspaceMember[0].role,
      teamspaceRepo,
    },
  });
});
```

**Testing**:

- Test teamspace-level authorization
- Verify project-level routes not accessible
- Test role-based access (admin vs editor vs viewer)

### 3.3 Update All tRPC Routers

**Priority**: Critical
**Assignee**: Senior Developer + Lead Developer
**Estimated**: 1 day

Update all routers to use new middleware:

```typescript
// Video router example
export const videoRouter = createTRPCRouter({
  list: teamspaceProjectProcedure.query(async ({ ctx }) => {
    // ctx.projectRepo is now available and scoped
    return ctx.projectRepo.getVideos();
  }),

  get: teamspaceProjectProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.projectRepo.getVideo(input.id);
    }),

  // ... etc
});
```

**Routers to Update**:

- `videoRouter`
- `documentRouter`
- `categoryRouter`
- Create new `teamspaceRouter`
- Create new `projectRouter`

**Testing**:

- Update all router tests
- Verify context contains correct repos
- Test cross-project access blocked

**Deliverables**:

- Middleware updated and tested
- All routers updated
- Authorization tests passing

## Phase 4: Routing and URL Structure (3-4 days)

### 4.1 Update App Router Structure

**Priority**: Critical
**Assignee**: Senior Developer
**Estimated**: 2 days

Restructure routes from `/app/(app)/w/[slug]` to `/app/(app)/t/[teamspaceSlug]/[projectSlug]`:

```
Current:
/app/(app)/w/[slug]/
  ├── page.tsx
  ├── videos/page.tsx
  ├── videos/[id]/page.tsx
  └── settings/page.tsx

New:
/app/(app)/t/[teamspaceSlug]/
  ├── [projectSlug]/
  │   ├── page.tsx (project dashboard)
  │   ├── videos/page.tsx
  │   ├── videos/[id]/page.tsx
  │   └── settings/page.tsx (project settings)
  └── settings/page.tsx (teamspace settings)
```

**Steps**:

1. Create new route structure
2. Move page components to new locations
3. Update dynamic route parameters
4. Add teamspace-level pages

**Testing**:

- Test all routes accessible
- Test 404 for invalid slugs
- Test nested dynamic routes
- Verify middleware runs correctly

### 4.2 Update Route Parameters

**Priority**: Critical
**Assignee**: Senior Developer
**Estimated**: 1 day

Update all page components to use new params:

```typescript
// Before
type Props = {
  params: { slug: string; id?: string };
};

// After
type Props = {
  params: { teamspaceSlug: string; projectSlug: string; id?: string };
};

export default async function VideoPage({ params }: Props) {
  const { teamspaceSlug, projectSlug, id } = params;
  // ...
}
```

**Global Updates**:

- All page.tsx files
- All layout.tsx files
- All route handlers

**Testing**:

- TypeScript compilation
- Test param extraction
- Verify correct data fetching

### 4.3 Update Internal Links

**Priority**: High
**Assignee**: Lead Developer
**Estimated**: 1 day

Update all internal navigation links:

```typescript
// Before
<Link href={`/w/${workspace.slug}/videos`}>Videos</Link>

// After
<Link href={`/t/${teamspace.slug}/${project.slug}/videos`}>Videos</Link>
```

**Use grep to find all instances**:

```bash
grep -r "/w/" src/app/
grep -r "href=" src/components/
```

**Testing**:

- Manual testing of all navigation
- Test breadcrumbs
- Test back buttons

**Deliverables**:

- New route structure implemented
- All pages updated with correct params
- All internal links updated
- Navigation tests passing

## Phase 5: Context Providers and Hooks (2-3 days)

### 5.1 Create TeamspaceProvider

**Priority**: High
**Assignee**: Senior Developer
**Estimated**: 1 day

Create `/src/lib/teamspace/teamspace-provider.tsx`:

```typescript
'use client';

import { createContext, useContext, ReactNode } from 'react';

type Teamspace = {
  id: string;
  name: string;
  slug: string;
  mode: 'single-tenant' | 'multi-tenant';
};

const TeamspaceContext = createContext<Teamspace | null>(null);

export function TeamspaceProvider({
  children,
  teamspace,
}: {
  children: ReactNode;
  teamspace: Teamspace;
}) {
  return (
    <TeamspaceContext.Provider value={teamspace}>
      {children}
    </TeamspaceContext.Provider>
  );
}

export function useTeamspace() {
  const context = useContext(TeamspaceContext);
  if (!context) {
    throw new Error('useTeamspace must be used within TeamspaceProvider');
  }
  return context;
}
```

**Testing**:

- Test provider wrapping
- Test hook throws error outside provider
- Test context value passed correctly

### 5.2 Update Project Provider

**Priority**: High
**Assignee**: Senior Developer
**Estimated**: 1 day

Update `/src/lib/workspace/workspace-provider.tsx` → `/src/lib/project/project-provider.tsx`:

```typescript
'use client';

import { createContext, useContext, ReactNode } from 'react';

type Project = {
  id: string;
  name: string;
  slug: string;
  teamspaceId: string;
};

const ProjectContext = createContext<Project | null>(null);

export function ProjectProvider({
  children,
  project,
}: {
  children: ReactNode;
  project: Project;
}) {
  return (
    <ProjectContext.Provider value={project}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within ProjectProvider');
  }
  return context;
}
```

**Testing**:

- Test nested providers (Teamspace → Project)
- Test both hooks accessible
- Update all components using old `useWorkspace` hook

### 5.3 Create useUserRole Hook

**Priority**: High
**Assignee**: Senior Developer
**Estimated**: 0.5 day

Create `/src/lib/auth/use-user-role.ts`:

```typescript
'use client';

import { useContext } from 'react';
import { UserRoleContext } from './user-role-provider';

export type UserRole = 'admin' | 'editor' | 'viewer';

export function useUserRole(): UserRole {
  const context = useContext(UserRoleContext);
  if (!context) {
    throw new Error('useUserRole must be used within UserRoleProvider');
  }
  return context;
}

// Helper functions
export function useCanEdit(): boolean {
  const role = useUserRole();
  return role === 'admin' || role === 'editor';
}

export function useIsAdmin(): boolean {
  const role = useUserRole();
  return role === 'admin';
}
```

**Testing**:

- Test role-based rendering
- Test permission helpers
- Update UI components to use new hooks

**Deliverables**:

- TeamspaceProvider implemented
- ProjectProvider updated
- useUserRole hook created
- All components updated to use new hooks

## Phase 6: UI Updates (4-5 days)

### 6.1 Update Navigation Components

**Priority**: High
**Assignee**: Lead Developer
**Estimated**: 2 days

**Update Breadcrumbs**:

```typescript
// Before: Workspace > Videos
// After: Teamspace > Project > Videos
```

**Update Sidebar**:

- Show teamspace name at top (in multi-tenant mode)
- Show project switcher
- Conditional rendering based on `mode`

**Single-Tenant Mode**:

- Hide teamspace layer
- Show "Projects" directly

**Multi-Tenant Mode**:

- Show teamspace switcher
- Show two-tier navigation

**Testing**:

- Test both modes
- Test navigation switches projects
- Test breadcrumbs update correctly

### 6.2 Create Teamspace Management UI

**Priority**: High
**Assignee**: Lead Developer
**Estimated**: 2 days

**New Pages**:

- `/t/[teamspaceSlug]/settings` - Teamspace settings
- `/t/[teamspaceSlug]/members` - Team members management
- `/t/[teamspaceSlug]/billing` - Billing (SaaS mode only)

**Components**:

- TeamspaceSwitcher (multi-tenant mode)
- TeamspaceSettings form
- MemberList with role management
- InviteMemberModal

**Testing**:

- Test settings updates
- Test member invitation
- Test role changes
- Test billing UI (mock Stripe)

### 6.3 Update Project Management UI

**Priority**: High
**Assignee**: Lead Developer
**Estimated**: 1 day

**Update Existing Pages**:

- Project creation modal (now under teamspace)
- Project settings (remove workspace references)
- Project invitations (show teamspace role defaults)

**New Features**:

- Show inherited teamspace role in project members list
- Override role UI (admin can change from teamspace default)
- Visual indication of overridden permissions

**Testing**:

- Test project creation
- Test role overrides
- Test inherited permissions display

**Deliverables**:

- Navigation updated for two-tier structure
- Teamspace management UI complete
- Project management UI updated
- Conditional rendering based on mode

## Phase 7: Data Migration (If Needed) (1 day)

### 7.1 Development/Testing Data Migration

**Priority**: Medium (Only if dev/test data exists)
**Assignee**: Senior Developer
**Estimated**: 0.5 day

If there's development or testing data, create migration script:

```typescript
// scripts/migrate-to-teamspaces.ts

async function migrateWorkspacesToTeamspaces() {
  // 1. For each existing workspace, create a teamspace
  // 2. Convert workspace to project under that teamspace
  // 3. Migrate workspace_users to both teamspace_users and project_users
  // 4. Update foreign keys
}
```

**Testing**:

- Test on copy of dev database
- Verify all relationships preserved
- Verify data integrity

### 7.2 Fresh Install Setup

**Priority**: High
**Assignee**: Senior Developer
**Estimated**: 0.5 day

Update setup wizard to create default teamspace:

```typescript
// On first-run setup
async function createDefaultTeamspace(userId: string) {
  const teamspace = await db.insert(teamspaces).values({
    name: 'Main',
    slug: 'main',
    mode: 'single-tenant',
  });

  await db.insert(teamspaceUsers).values({
    teamspaceId: teamspace.id,
    userId,
    role: 'admin',
  });

  return teamspace;
}
```

**Testing**:

- Test fresh install
- Verify default teamspace created
- Verify user added as admin

**Deliverables**:

- Migration script (if needed)
- Setup wizard updated
- Fresh install tested

## Phase 8: Testing and QA (5-7 days)

### 8.1 Unit Tests

**Priority**: Critical
**Assignee**: QA Architect + Developers
**Estimated**: 2 days

**Test Coverage**:

- TeamspaceRepository methods
- ProjectRepository methods (updated)
- Middleware authorization logic
- Role resolution logic (override ?? teamspace default)
- Permission helpers

**Target**: 80% coverage (per ADR-005)

### 8.2 Integration Tests

**Priority**: Critical
**Assignee**: QA Architect
**Estimated**: 2 days

**Test Scenarios**:

- Teamspace creation and deletion
- Project creation within teamspace
- User invitation flows (teamspace + project)
- Permission inheritance and overrides
- Teamspace admin override behavior
- Cross-teamspace isolation

### 8.3 E2E Tests

**Priority**: Critical
**Assignee**: QA Architect
**Estimated**: 2 days

**Test Flows**:

- Single-tenant setup wizard
- Multi-tenant teamspace creation
- Invite user to teamspace
- Invite user to project (inherits role)
- Override project role
- Navigate between projects
- Access control (try accessing unauthorized project)

### 8.4 Edge Cases and Security

**Priority**: High
**Assignee**: Security Architect + QA
**Estimated**: 1 day

**Security Tests**:

- User cannot access project in teamspace they don't belong to
- User cannot access teamspace they're not a member of
- Slug enumeration doesn't leak teamspace existence
- Role escalation not possible via project override
- Teamspace admin can access all projects

**Edge Cases**:

- User in teamspace but no projects (empty list)
- Deleting teamspace cascades correctly
- Slug collision within teamspace (should error)
- Slug collision across teamspaces (should succeed)
- Very long teamspace/project names

**Deliverables**:

- All tests passing
- 80%+ code coverage
- Security audit complete
- Edge cases documented

## Phase 9: Documentation and Deployment (2-3 days)

### 9.1 Update Developer Documentation

**Priority**: High
**Assignee**: Lead Developer
**Estimated**: 1 day

**Update**:

- `/README.md` - New URL structure
- `/CONTRIBUTING.md` - Repository pattern changes
- `/CLAUDE.md` - Update with teamspace hierarchy
- API documentation (if exists)

**Add**:

- Migration guide (workspace → project terminology)
- Permission model explanation
- Examples of teamspace/project usage

### 9.2 Update User Documentation

**Priority**: High
**Assignee**: TRON + Lead Developer
**Estimated**: 1 day

**Add Guides**:

- "Understanding Teamspaces and Projects"
- "Managing Team Permissions"
- "Inviting Team Members"
- "Single-Tenant vs Multi-Tenant Mode"

**Update**:

- Getting started guide
- Screenshots (update URLs)

### 9.3 Deployment Preparation

**Priority**: Critical
**Assignee**: Senior Developer + DevOps
**Estimated**: 1 day

**Pre-Deployment**:

- Database backup strategy
- Migration testing on staging
- Rollback procedure documented
- Environment variable updates (`MODE` setting)

**Deployment Steps**:

1. Backup production database (if any)
2. Run migrations
3. Deploy application code
4. Verify health checks
5. Monitor for errors
6. Verify key user flows

**Rollback Plan**:

- Document rollback procedure
- Test rollback on staging
- Keep previous version deployable

**Deliverables**:

- Documentation updated
- Deployment plan finalized
- Rollback procedure tested

## Phase 10: Future Work (Data Portability)

**Status**: Designed, Not Implemented (per ADR-018)
**Priority**: Post-v1
**Estimated**: 3-4 weeks when implemented

### 10.1 Immediate Actions (v1.0)

- [x] Add `teamspaces.external_id` field (completed in Phase 1)
- [ ] Document export JSON schema specification (separate document)
- [ ] Document import validation rules (separate document)
- [ ] Add "Data portability coming soon" to roadmap and docs

### 10.2 Future Implementation

**Export Implementation** (1.5 weeks):

- Build export functionality
- Background job for large exports
- Audit logging
- Security review
- E2E testing

**Import Implementation** (1.5 weeks):

- Build import validation
- User identity mapping and invitation flow
- Conflict resolution UI
- Rollback on failure
- Comprehensive testing

See ADR-018 for full details.

## Risk Management

### Critical Risks

1. **Data Loss During Migration**
   - **Mitigation**: Comprehensive testing on staging, full database backup
   - **Rollback**: Documented rollback procedure, keep old version deployable

2. **Authorization Bugs (Access Control Breach)**
   - **Mitigation**: Extensive security testing, code review by Security Architect
   - **Monitoring**: Audit logging, immediate alerting on suspicious access patterns

3. **Performance Degradation (4 Queries per Request)**
   - **Mitigation**: Database indexing, query optimization, performance testing
   - **Monitoring**: Query timing, slow query logging

4. **Breaking Changes for Existing Code**
   - **Mitigation**: TypeScript will catch most issues, comprehensive testing
   - **Rollback**: Can rollback deployment if critical issues found

### Medium Risks

5. **Complexity Overwhelming Users**
   - **Mitigation**: Single-tenant mode hides teamspace layer, clear documentation
   - **Monitoring**: User feedback, support tickets

6. **Incomplete Global Refactoring**
   - **Mitigation**: Use TypeScript compiler to find all references, grep for URL patterns
   - **Testing**: E2E tests will catch missing updates

## Success Criteria

- [ ] All database migrations complete successfully
- [ ] All tests passing (unit, integration, E2E)
- [ ] 80%+ code coverage maintained
- [ ] Security audit complete with no critical findings
- [ ] Performance benchmarks meet targets (<200ms for auth)
- [ ] Documentation updated and reviewed
- [ ] Deployment successful on staging
- [ ] Team sign-off on production deployment

## Timeline Summary

| Phase                | Duration | Dependencies |
| -------------------- | -------- | ------------ |
| 1. Database Schema   | 3-4 days | None         |
| 2. Repository Layer  | 4-5 days | Phase 1      |
| 3. Middleware        | 3-4 days | Phase 2      |
| 4. Routing           | 3-4 days | Phase 3      |
| 5. Context Providers | 2-3 days | Phase 4      |
| 6. UI Updates        | 4-5 days | Phase 5      |
| 7. Data Migration    | 1 day    | Phase 1-6    |
| 8. Testing & QA      | 5-7 days | Phase 1-7    |
| 9. Documentation     | 2-3 days | Phase 1-8    |

**Total Estimated Time**: 27-38 days (calendar time will be less with parallel work)

**Recommended Team**:

- 2 Senior Developers (full-time)
- 1 QA Architect (full-time)
- 1 Security Architect (part-time, reviews)

**Target Completion**: 4-5 weeks from start

## Next Steps

1. [ ] Schedule team alignment meeting
2. [ ] Assign phases to specific developers
3. [ ] Set up project tracking (GitHub issues or similar)
4. [ ] Create staging environment for testing
5. [ ] Begin Phase 1: Database Schema Changes

## Questions for Resolution

1. What is the target deployment date?
2. Is there existing production data that needs migration?
3. Should we implement any Phase 10 (data portability) work now?
4. What is the rollback tolerance (how quickly must we be able to rollback)?
5. Are there any upcoming features that should wait until after this refactor?

---

**Document Owner**: Project Orchestrator
**Last Updated**: 2025-12-15
**Review Status**: Ready for team review and approval
