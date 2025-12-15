# ADR-017: Teamspace Hierarchy Architecture

**Status**: Accepted
**Date**: 2025-12-15
**Deciders**: Project Orchestrator, Senior Developer, Security Architect, TRON, QA Architect

**Supersedes**: ADR-008 (Multi-Tenancy Strategy) - extends with two-tier hierarchy
**Related**: ADR-007 (API and Authentication), ADR-018 (Data Portability Strategy)

## Context

The application currently uses a flat workspace structure where workspaces are the top-level entity with globally unique slugs. This was documented in ADR-008 (Multi-Tenancy Strategy).

New requirements have emerged that fundamentally change the architecture:

1. **SaaS Billing Requirement**: In multi-tenant SaaS mode, billing must occur at a team/organization level, not per workspace or per user
2. **Dual Deployment Model**: Single codebase must support both self-hosted single-tenant and multi-tenant SaaS deployments
3. **Permission Management**: Users need team-level role defaults with project-specific overrides (Slack-style permissions)
4. **Data Portability**: Users must be able to migrate from self-hosted to SaaS (addressed in ADR-018)

The current flat workspace model cannot support these requirements without significant complexity. A hierarchical model with teams containing projects provides natural boundaries for billing, permissions, and data scoping.

### Current Architecture Limitations

- **No billing entity**: Workspaces cannot be billed collectively
- **Repetitive permissions**: Each workspace invitation requires setting permissions from scratch
- **Global slug uniqueness**: Creates collision issues that don't map to real-world team structures
- **No organization concept**: Cannot model teams that manage multiple projects

## Decision

Implement a **two-tier Teamspace Hierarchy** with the following structure:

### Tier 1: Teamspace (Top Level)

A teamspace represents an organization, team, or individual's namespace. It is the primary entity for:

- Globally unique identification (slug)
- Billing and subscription management (SaaS mode)
- Team membership and default roles
- Grouping related projects

**Key Properties:**

- Globally unique slug (e.g., `acme-corp`, `my-studio`)
- Contains 1+ projects
- Has members with roles (admin, editor, viewer)
- Billing entity in SaaS mode
- Hidden/simplified in single-tenant mode

### Tier 2: Project (formerly Workspace)

A project represents a specific work context within a teamspace. Projects are:

- Unique within their parent teamspace (not globally)
- The container for videos, documents, and content
- The context where actual work happens
- Subject to inherited or overridden permissions

**Key Properties:**

- Slug unique within teamspace only (e.g., `video-production`)
- Belongs to exactly one teamspace
- Inherits permissions from teamspace by default
- Allows project-specific permission overrides

### URL Structure

```
Current: /w/[workspace-slug]/videos/[id]
New:     /t/[teamspace-slug]/[project-slug]/videos/[id]
```

Examples:

- `/t/acme-corp/video-production/videos/123`
- `/t/my-studio/podcast-editing/documents/456`
- `/t/freelance-work/client-a/videos/789`

### Permission Model (Slack-Style)

**Teamspace Membership:**

- Users join teamspace with a role (admin, editor, viewer)
- Teamspace membership alone does NOT grant project access
- Users only see projects they are explicitly invited to

**Project Invitation:**

- User is invited to specific project within teamspace
- Default permission = their teamspace role
- Example: Alice is "editor" in teamspace → invited to Project A → automatically "editor" in Project A

**Project-Level Override:**

- Project admins can override permissions for specific users
- Example: Make Alice "viewer" on sensitive Project B despite being "editor" in teamspace
- Or elevate Bob to "admin" on Project C despite being "viewer" in teamspace

**Teamspace Admin Override:**

- Teamspace admins always have full access to all projects (prevent lockout)
- Can manage billing, invite users, delete projects, access all content

### Schema Design

**New `teamspaces` table:**

```typescript
{
  id: uuid(PK);
  name: string;
  slug: string(UNIQUE);
  external_id: string | null(UNIQUE); // For migration tracking (ADR-018)
  billing_plan: string | null; // 'free' | 'pro' | 'enterprise'
  billing_customer_id: string | null; // Stripe customer ID
  mode: string; // 'single-tenant' | 'multi-tenant'
  created_at: timestamp;
  updated_at: timestamp;
}
```

**New `teamspace_users` table:**

```typescript
{
  teamspace_id: uuid (FK → teamspaces.id)
  user_id: uuid (FK → users.id)
  role: string                        // 'admin' | 'editor' | 'viewer'
  joined_at: timestamp

  PRIMARY KEY (teamspace_id, user_id)
}
```

**Modified `workspaces` → `projects` table:**

```typescript
{
  id: uuid (PK)
  teamspace_id: uuid (FK → teamspaces.id, NOT NULL)
  name: string
  slug: string                        // Unique within teamspace
  created_at: timestamp
  updated_at: timestamp

  UNIQUE CONSTRAINT (teamspace_id, slug)
}
```

**Modified `workspace_users` → `project_users` table:**

```typescript
{
  project_id: uuid (FK → projects.id)
  user_id: uuid (FK → users.id)
  role_override: string | null        // 'admin' | 'editor' | 'viewer' | null
  invited_at: timestamp

  PRIMARY KEY (project_id, user_id)
}
```

**Effective Role Resolution:**

```
effective_role = project_users.role_override ?? teamspace_users.role
```

If `role_override` is NULL, the user's teamspace role applies. If set, it overrides.

### Authorization Middleware

Request flow for `/t/[teamspaceSlug]/[projectSlug]`:

1. **Resolve Teamspace**
   - Query: `SELECT id FROM teamspaces WHERE slug = ?`
   - If not found: 404 Not Found

2. **Validate Teamspace Membership**
   - Query: `SELECT role FROM teamspace_users WHERE teamspace_id = ? AND user_id = ?`
   - If not found: 403 Forbidden
   - Store teamspace role in context

3. **Resolve Project**
   - Query: `SELECT id FROM projects WHERE teamspace_id = ? AND slug = ?`
   - If not found: 404 Not Found (don't leak project existence)

4. **Validate Project Access**
   - Query: `SELECT role_override FROM project_users WHERE project_id = ? AND user_id = ?`
   - If not found: 403 Forbidden (user not invited to project)
   - Calculate effective role: `role_override ?? teamspace_role`

5. **Attach to Context**
   - `ctx.teamspace = { id, slug }`
   - `ctx.project = { id, slug, teamspaceId }`
   - `ctx.userRole = effectiveRole`

### Repository Pattern

Maintain the existing repository pattern from ADR-008, extended for two-tier hierarchy:

**TeamspaceRepository** (new):

```typescript
class TeamspaceRepository {
  constructor(db: Database, teamspaceId: string) {}

  // Teamspace-scoped operations
  async getProjects(): Promise<Project[]>;
  async getMembers(): Promise<TeamspaceMember[]>;
  async getBillingInfo(): Promise<BillingInfo>;
  async getAuditLogs(): Promise<AuditLog[]>;
}
```

**ProjectRepository** (renamed from WorkspaceRepository):

```typescript
class ProjectRepository {
  constructor(db: Database, projectId: string) {}

  // Project-scoped operations (same as WorkspaceRepository)
  async getVideos(): Promise<Video[]>;
  async getDocuments(): Promise<Document[]>;
  async getVideo(id: string): Promise<Video>;
  // etc.
}
```

### Single-Tenant vs Multi-Tenant Mode

**Single-Tenant Mode (Self-Hosted):**

- Setup wizard creates a default teamspace (auto-generated slug or user-chosen)
- Teamspace concept is hidden from UI ("My Projects" instead of "Teamspaces > Projects")
- URLs still use `/t/[slug]/[project]` internally but UI simplifies navigation
- Billing fields are ignored
- User sees streamlined project-focused interface

**Multi-Tenant SaaS Mode:**

- Users can create multiple teamspaces
- Full teamspace management UI visible
- Billing attached at teamspace level (Stripe integration)
- Two-tier navigation visible: "Acme Corp > Video Production"
- Invitation flows for both teamspace and project membership

**Mode Detection:**

```typescript
const mode = env.MODE; // 'single-tenant' | 'multi-tenant'
```

Same codebase, conditional UI rendering based on mode.

## Consequences

### Positive

1. **Natural Billing Boundary**: Teamspaces provide clear billing entity for SaaS (per-team pricing)
2. **Scalable Permissions**: Team role defaults eliminate repetitive permission setting
3. **Clear Mental Model**: Mirrors real-world structures (Slack, GitHub, Notion)
4. **Reduced Slug Collisions**: Projects only need unique slugs within teamspace
5. **Future-Proof**: Supports organization features (team settings, branding, audit logs)
6. **Data Portability**: Clean hierarchy makes export/import straightforward (ADR-018)
7. **Flexible Deployment**: Same codebase supports solo users and large teams
8. **Lockout Prevention**: Teamspace admin override prevents access loss

### Negative

1. **Increased Complexity**: Two-tier model vs flat structure
2. **More Database Queries**: 4 queries per request for auth (teamspace + project validation)
3. **Migration Effort**: Requires renaming tables and restructuring routes
4. **Larger Test Surface**: Permission inheritance, overrides, and cross-tier scenarios
5. **URL Length**: Longer URLs with two slug segments
6. **Learning Curve**: Developers must understand two-tier permission model

### Mitigation Strategies

- **Complexity**: Single-tenant mode hides teamspace layer from solo users
- **Performance**: Index optimization on (teamspace_id, slug) and foreign keys
- **Migration**: Pre-launch status means building fresh, no existing data to migrate
- **Testing**: Comprehensive test plan (see Implementation Notes)
- **Documentation**: Clear explanation of permission model with examples

## Alternatives Considered

### Option A: Keep Flat Workspace Structure

**Pros:**

- Simpler architecture
- No migration complexity
- Fewer database queries

**Cons:**

- No billing entity for SaaS (cannot charge per team)
- Repetitive permission management
- Global slug collisions remain
- Cannot add organization features later without major refactor

**Rejected because:** SaaS billing requirement is non-negotiable.

### Option B: Three-Tier Hierarchy (Organization > Teamspace > Project)

**Pros:**

- Even more granular organization
- Supports enterprise hierarchies

**Cons:**

- Massive overkill for target market
- Complexity explosion
- Most users would only use 2 tiers anyway

**Rejected because:** YAGNI (You Aren't Gonna Need It). Two tiers sufficient.

### Option C: Teamspace as Namespace Only (No Permissions)

**Pros:**

- Simpler than full permission model
- Cleaner URLs than auto-generated suffixes

**Cons:**

- No team role defaults (still repetitive permissions)
- No billing entity (teamspace is just a naming prefix)
- Doesn't justify the architectural complexity

**Rejected because:** If adding hierarchy, make it meaningful. Slack-style permissions provide real value.

## Implementation Notes

### Migration from Current State

Since the application is pre-launch with no production data:

1. **Rename tables**: `workspaces` → `projects`, `workspace_users` → `project_users`
2. **Add new tables**: `teamspaces`, `teamspace_users`
3. **Add foreign keys**: `projects.teamspace_id`
4. **Update routes**: `/w/[slug]` → `/t/[teamspace]/[project]`
5. **Update repository**: `WorkspaceRepository` → `ProjectRepository`
6. **Add**: `TeamspaceRepository`
7. **Update middleware**: Two-tier authorization validation
8. **Update UI**: Conditional rendering based on `MODE` environment variable

### Testing Strategy

**Unit Tests:**

- Teamspace creation/deletion
- Project creation within teamspace
- Slug uniqueness (global for teamspace, scoped for project)
- Role assignment and override logic
- Effective role resolution

**Integration Tests:**

- Middleware authorization flow (4-step validation)
- Permission inheritance scenarios
- Project invitation with role defaults
- Project-specific overrides
- Teamspace admin override behavior

**E2E Tests:**

- Single-tenant setup wizard
- Multi-tenant teamspace creation with billing
- User invitation flows (teamspace + project)
- Permission override scenarios
- Cross-teamspace access (user in multiple teams)

**Edge Cases:**

- User in teamspace but no project access (empty project list)
- Deleting teamspace (cascade to projects)
- Slug collision within teamspace (should error)
- Slug collision across teamspaces (should succeed)
- Teamspace admin accessing project they weren't invited to (should succeed)

### Security Considerations

**Authorization Validation:**

- Always validate both teamspace AND project membership
- Never leak project existence to non-teamspace members (404, not 403)
- Teamspace admin bypass must be carefully implemented (prevent privilege escalation)

**Audit Logging:**

- Log teamspace creation/deletion
- Log membership changes (added, removed, role changed)
- Log project access grants
- Log permission overrides

**Rate Limiting:**

- Invitation endpoints (prevent spam)
- Teamspace creation (prevent abuse in SaaS mode)

### Repository Scoping

**Teamspace-Scoped Entities:**

- Team members
- Billing information
- Teamspace settings
- Teamspace-wide audit logs

**Project-Scoped Entities:**

- Videos
- Documents/Scripts
- Project settings
- Project invitations
- Project-specific audit logs

### Context Providers (React)

```typescript
// Server-side context (tRPC)
ctx.teamspace: { id: string, slug: string }
ctx.project: { id: string, slug: string, teamspaceId: string }
ctx.userRole: 'admin' | 'editor' | 'viewer'

// Client-side providers
<TeamspaceProvider>
  <ProjectProvider>
    {children}
  </ProjectProvider>
</TeamspaceProvider>

// Hooks
useTeamspace() // Returns current teamspace
useProject()   // Returns current project
useUserRole()  // Returns effective role in current project
```

## Related Decisions

- **ADR-008**: Multi-Tenancy Strategy - superseded by this ADR, workspace-level scoping becomes project-level scoping within teamspaces
- **ADR-007**: API and Authentication - extended with two-tier permission model
- **ADR-018**: Data Portability Strategy - teamspace hierarchy enables clean export/import

## Reconsideration Triggers

Consider revisiting this decision if:

1. **Performance Issues**: If 4-query authorization becomes a bottleneck, consider caching or denormalization
2. **User Feedback**: If single-tenant users find two-tier model confusing despite UI simplification
3. **Billing Changes**: If SaaS moves to per-user or per-project billing instead of per-team
4. **Scale Requirements**: If enterprise needs require three-tier hierarchy (unlikely for target market)

## Discussion Summary

The team initially recommended keeping the flat workspace structure with auto-generated slugs. However, additional context from the user revealed:

1. SaaS billing must occur at team level (non-negotiable requirement)
2. Application is pre-launch (no migration burden)
3. Slack-style permission model desired (team role defaults with overrides)
4. Data portability required for self-hosted → SaaS migration

These requirements justified the added complexity of a two-tier hierarchy. The Slack-style permission model provides significant UX value by reducing repetitive permission management. The clean hierarchy also makes future data export/import straightforward (ADR-018).

Key insight from TRON: "The teamspace model reduces repetition and makes team management intuitive. Inviting Bob as 'editor' to the team means he's automatically an editor on new projects. Exceptions are explicit overrides."

Key insight from Security Architect: "Teamspace admin override prevents lockout scenarios where a project admin leaves and no one can access the project. This is standard in Slack, GitHub orgs, etc."

The decision was unanimous after the full context was provided.
