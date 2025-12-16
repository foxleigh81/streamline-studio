# tRPC Middleware Usage Guide

This directory contains middleware for implementing the two-tier teamspace/project authorization hierarchy.

## Overview

The application uses a two-tier authorization model:

1. **Teamspace** - Top-level organization containing projects
2. **Project** - Individual work context within a teamspace

Authorization flows through both levels with role inheritance and overrides.

## Middleware Files

### `teamspace.ts`

Validates teamspace membership and adds teamspace context to tRPC procedures.

**What it does:**

- Extracts `teamspaceSlug` from procedure input
- Resolves teamspace by slug
- Verifies user is a member of the teamspace
- Adds to context: `teamspace`, `teamspaceUser`, `teamspaceRole`, `teamspaceRepository`

**Usage:**

```typescript
import { teamspaceProcedure } from '@/server/trpc/procedures';

export const myRouter = createTRPCRouter({
  getTeamData: teamspaceProcedure
    .input(z.object({ teamspaceSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      // ctx.teamspace, ctx.teamspaceRole, ctx.teamspaceRepository available
      return ctx.teamspaceRepository.getMembers();
    }),
});
```

### `project.ts`

Validates project access within a teamspace and calculates effective role.

**What it does:**

- Requires `teamspaceMiddleware` to have run first
- Extracts `projectSlug` from procedure input
- Resolves project by (teamspaceId, slug)
- Verifies user has access (direct membership OR teamspace admin)
- Calculates effective role: `roleOverride ?? teamspaceRole`
- Adds to context: `project`, `projectUser`, `projectRole`, `projectRepository`

**Usage:**

```typescript
import { projectProcedure } from '@/server/trpc/procedures';

export const myRouter = createTRPCRouter({
  getVideos: projectProcedure
    .input(
      z.object({
        teamspaceSlug: z.string(),
        projectSlug: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // ctx.project, ctx.projectRole, ctx.projectRepository available
      return ctx.projectRepository.getVideos();
    }),
});
```

### `workspace.ts` (Legacy)

**DEPRECATED** - Use `project.ts` instead.

This is maintained for backward compatibility during the transition to the two-tier model.

## Authorization Flow

### Request Flow Example

For URL: `/t/acme-corp/video-production/videos`

1. **Authentication** (`protectedProcedure`)
   - Validates session from cookies
   - Adds `user` and `session` to context

2. **Teamspace Resolution** (`teamspaceMiddleware`)
   - Resolves teamspace by slug: `acme-corp`
   - Verifies user is member
   - Adds `teamspace`, `teamspaceRole` to context

3. **Project Resolution** (`projectMiddleware`)
   - Resolves project by slug within teamspace: `video-production`
   - Verifies user has access
   - Calculates effective role
   - Adds `project`, `projectRole` to context

### Role Calculation

**Teamspace Admin Override:**

```
User is teamspace admin → Always has 'owner' role in all projects
```

**Normal Users:**

```
effectiveRole = project_users.role_override ?? teamspace_users.role
```

**Examples:**

1. Alice is "editor" in teamspace, invited to Project A with no override
   - `effectiveRole = 'editor'`

2. Alice is "editor" in teamspace, Project B overrides to "viewer"
   - `effectiveRole = 'viewer'`

3. Bob is "viewer" in teamspace, Project C overrides to "owner"
   - `effectiveRole = 'owner'`

4. Carol is "admin" in teamspace, not invited to Project D
   - `effectiveRole = 'owner'` (admin bypass)

## Available Procedures

### Base Procedures

- `publicProcedure` - No authentication required
- `protectedProcedure` - Requires authentication

### Teamspace Procedures

- `teamspaceProcedure` - Requires teamspace membership
- `teamspaceEditorProcedure` - Requires editor role or higher
- `teamspaceAdminProcedure` - Requires admin role or higher
- `teamspaceOwnerProcedure` - Requires owner role

### Project Procedures

- `projectProcedure` - Requires project access
- `projectEditorProcedure` - Requires editor role or higher
- `projectOwnerProcedure` - Requires owner role

### Legacy Procedures (Deprecated)

- `workspaceProcedure` - Use `projectProcedure` instead
- `editorProcedure` - Use `projectEditorProcedure` instead
- `ownerProcedure` - Use `projectOwnerProcedure` instead

## Input Schema Requirements

### Teamspace Procedures

Must include `teamspaceSlug` in input:

```typescript
.input(z.object({
  teamspaceSlug: z.string(),
  // ... other fields
}))
```

### Project Procedures

Must include both `teamspaceSlug` and `projectSlug`:

```typescript
.input(z.object({
  teamspaceSlug: z.string(),
  projectSlug: z.string(),
  // ... other fields
}))
```

## Security Considerations

### Fail Closed

All access checks fail closed (deny by default):

- Missing teamspace membership → 404 Not Found
- Missing project access → 403 Forbidden
- Invalid role → 403 Forbidden

### Enumeration Prevention

Returns `404 Not Found` instead of `403 Forbidden` for non-existent resources to prevent enumeration attacks.

### Teamspace Admin Bypass

Teamspace admins always have owner access to all projects to prevent lockout scenarios. This is intentional and follows industry best practices (Slack, GitHub, etc.).

### Role Override Security

Only project owners can set role overrides. The override can elevate OR restrict permissions:

- Elevate: viewer in teamspace → owner in specific project
- Restrict: editor in teamspace → viewer in sensitive project

## Context Types

### TeamspaceContext

Added by `teamspaceMiddleware`:

```typescript
{
  teamspace: Teamspace;
  teamspaceUser: TeamspaceUser;
  teamspaceRole: TeamspaceRole; // 'owner' | 'admin' | 'editor' | 'viewer'
  teamspaceRepository: TeamspaceRepository;
}
```

### ProjectContext

Added by `projectMiddleware` (extends TeamspaceContext):

```typescript
{
  // ... TeamspaceContext fields
  project: Project;
  projectUser: ProjectUser | null; // null if teamspace admin bypass
  projectRole: ProjectRole; // 'owner' | 'editor' | 'viewer'
  projectRepository: ProjectRepository;
}
```

## Migration from Legacy Workspace Middleware

### Before (Workspace)

```typescript
export const videoRouter = createTRPCRouter({
  list: workspaceProcedure.query(async ({ ctx }) => {
    return ctx.repository.getVideos();
  }),
});
```

### After (Project)

```typescript
export const videoRouter = createTRPCRouter({
  list: projectProcedure
    .input(
      z.object({
        teamspaceSlug: z.string(),
        projectSlug: z.string(),
      })
    )
    .query(async ({ ctx }) => {
      return ctx.projectRepository.getVideos();
    }),
});
```

**Key Changes:**

1. Input now requires `teamspaceSlug` and `projectSlug`
2. Use `ctx.projectRepository` instead of `ctx.repository`
3. Use `ctx.projectRole` instead of `ctx.workspaceRole`
4. Use `ctx.project` instead of `ctx.workspace`

## Testing

### Unit Testing Middleware

```typescript
import { teamspaceMiddleware } from './teamspace';
import { createInnerContext } from '../context';

// Mock the middleware behavior
const mockCtx = createInnerContext({
  session: mockSession,
  user: mockUser,
  teamspace: mockTeamspace,
  teamspaceRole: 'editor',
});
```

### Integration Testing Authorization

```typescript
describe('Authorization Flow', () => {
  it('should deny access if user not in teamspace', async () => {
    await expect(
      caller.myRouter.getData({
        teamspaceSlug: 'other-team',
        projectSlug: 'project',
      })
    ).rejects.toThrow('Teamspace not found');
  });

  it('should deny access if user not invited to project', async () => {
    await expect(
      caller.myRouter.getData({
        teamspaceSlug: 'my-team',
        projectSlug: 'secret-project',
      })
    ).rejects.toThrow('You do not have access to this project');
  });
});
```

## Related Documentation

- [ADR-017: Teamspace Hierarchy](/docs/adrs/017-teamspace-hierarchy.md)
- [ADR-008: Multi-Tenancy Strategy](/docs/adrs/008-multi-tenancy-strategy.md)
- [ADR-007: API and Authentication](/docs/adrs/007-api-and-auth.md)
