# UI Component Migration Guide

This guide explains how to update UI components to use the new teamspace/project hierarchy and permission system.

## Overview

Phase 6 introduces new context providers and permission hooks that enable proper multi-tenancy support while maintaining backward compatibility with single-tenant deployments.

## Key Changes

### 1. Deployment Mode Detection

Use the new deployment mode utilities to conditionally render teamspace-related UI:

```tsx
import { isMultiTenant, isSingleTenant } from '@/lib/constants';

function MyComponent() {
  const multiTenant = isMultiTenant();

  return (
    <div>
      {multiTenant && <TeamspaceSelector />}
      <ProjectContent />
    </div>
  );
}
```

### 2. Context Hooks

#### Teamspace Context

```tsx
import {
  useTeamspace,
  useTeamspaceSlug,
  useTeamspaceRole,
} from '@/lib/teamspace';

function TeamspaceInfo() {
  const { teamspace, role, isLoading } = useTeamspace();

  if (isLoading) return <Loading />;
  if (!teamspace) return null;

  return (
    <div>
      <h2>{teamspace.name}</h2>
      <Badge>Role: {role}</Badge>
    </div>
  );
}
```

#### Project Context

```tsx
import { useProject, useProjectSlug, useProjectRole } from '@/lib/project';

function ProjectInfo() {
  const { project, role, isLoading } = useProject();

  if (isLoading) return <Loading />;
  if (!project) return null;

  return (
    <div>
      <h2>{project.name}</h2>
      <Badge>Role: {role}</Badge>
    </div>
  );
}
```

### 3. Permission Hooks

Use permission hooks to check user access levels:

```tsx
import {
  useCanEdit,
  useCanAdmin,
  useIsOwner,
  usePermissions,
} from '@/lib/permissions';

function ContentControls() {
  const canEdit = useCanEdit();
  const canAdmin = useCanAdmin();
  const isOwner = useIsOwner();

  return (
    <div>
      {canEdit && <EditButton />}
      {canAdmin && <SettingsButton />}
      {isOwner && <DeleteButton />}
    </div>
  );
}

// Or use the combined hook
function ContentControlsAlt() {
  const { canEdit, canAdmin, isOwner } = usePermissions();

  return (
    <div>
      {canEdit && <EditButton />}
      {canAdmin && <SettingsButton />}
      {isOwner && <DeleteButton />}
    </div>
  );
}
```

### 4. Permission Gate Component

Use the `PermissionGate` component for declarative permission checks:

```tsx
import { PermissionGate } from '@/components/ui/permission-gate';

function VideoPage() {
  return (
    <div>
      <h1>Video Details</h1>

      {/* Only show edit button to editors and owners */}
      <PermissionGate requires="canEdit">
        <EditButton />
      </PermissionGate>

      {/* Only show settings to project owners */}
      <PermissionGate requires="isOwner">
        <ProjectSettings />
      </PermissionGate>

      {/* Show fallback content for viewers */}
      <PermissionGate requires="canEdit" fallback={<ViewOnlyNotice />}>
        <EditorTools />
      </PermissionGate>
    </div>
  );
}
```

### 5. Breadcrumb Navigation

Use the new breadcrumb hooks to generate navigation with teamspace/project hierarchy:

```tsx
import { useBreadcrumbs, useBaseUrl } from '@/lib/hooks';
import { Breadcrumb } from '@/components/ui/breadcrumb';

function VideoDetailsPage({ videoId, videoTitle }: Props) {
  const baseUrl = useBaseUrl();

  const breadcrumbs = useBreadcrumbs([
    { label: 'Videos', href: `${baseUrl}/videos` },
    { label: videoTitle },
  ]);

  return (
    <div>
      <Breadcrumb items={breadcrumbs} />
      {/* Page content */}
    </div>
  );
}
```

### 6. Building Links

Use the `useBaseUrl` hook to build links that work in both single-tenant and multi-tenant modes:

```tsx
import { useBaseUrl } from '@/lib/hooks';
import Link from 'next/link';

function VideoCard({ video }: Props) {
  const baseUrl = useBaseUrl();

  return <Link href={`${baseUrl}/videos/${video.id}`}>{video.title}</Link>;
}
```

## Updated Components

### AppShell

The `AppShell` component now:

- Displays teamspace info (multi-tenant mode only)
- Shows current project role badge
- Adds teamspace settings link (for teamspace admins)
- Filters navigation items based on permissions

### WorkspaceSwitcher (ProjectSwitcher)

The workspace switcher now:

- Lists projects instead of workspaces
- Shows user role on each project
- Uses teamspace-aware routing

## Migration Checklist

When updating a page or component:

- [ ] Replace direct permission checks with permission hooks
- [ ] Use `PermissionGate` for conditional rendering
- [ ] Use `useBreadcrumbs` and `useBaseUrl` for navigation
- [ ] Use `isMultiTenant()` to conditionally show teamspace UI
- [ ] Update link building to use `useBaseUrl()`
- [ ] Test in both single-tenant and multi-tenant modes

## Common Patterns

### Conditional Settings Link

```tsx
import { useCanAdmin } from '@/lib/permissions';
import { useBaseUrl } from '@/lib/hooks';

function SettingsLink() {
  const canAdmin = useCanAdmin();
  const baseUrl = useBaseUrl();

  if (!canAdmin) return null;

  return <Link href={`${baseUrl}/settings`}>Settings</Link>;
}
```

### Role-Based Actions

```tsx
import { usePermissions } from '@/lib/permissions';

function ActionButtons({ item }: Props) {
  const { canEdit, canAdmin, isOwner } = usePermissions();

  return (
    <div>
      {canEdit && <EditButton item={item} />}
      {canAdmin && <ShareButton item={item} />}
      {isOwner && <DeleteButton item={item} />}
    </div>
  );
}
```

### Teamspace-Specific Features

```tsx
import { isMultiTenant } from '@/lib/constants';
import { useCanManageTeamspace } from '@/lib/permissions';

function TeamManagement() {
  const multiTenant = isMultiTenant();
  const canManage = useCanManageTeamspace();

  // Hide teamspace management in single-tenant mode
  if (!multiTenant || !canManage) return null;

  return <TeamspaceSettingsPanel />;
}
```

## Testing

When testing components that use these hooks, mock the context providers:

```tsx
import { TeamspaceProvider } from '@/lib/teamspace';
import { ProjectProvider } from '@/lib/project';

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <TeamspaceProvider teamspaceSlug="test-team">
      <ProjectProvider projectSlug="test-project">{children}</ProjectProvider>
    </TeamspaceProvider>
  );
}

test('renders with permissions', () => {
  render(
    <TestWrapper>
      <MyComponent />
    </TestWrapper>
  );
});
```

## References

- [ADR-017: Teamspace Hierarchy](/docs/adrs/017-teamspace-hierarchy.md)
- [ADR-008: Multi-Tenancy Strategy](/docs/adrs/008-multi-tenancy-strategy.md)
- [Permission Hooks](/src/lib/permissions/index.ts)
- [Teamspace Context](/src/lib/teamspace/context.tsx)
- [Project Context](/src/lib/project/context.tsx)
