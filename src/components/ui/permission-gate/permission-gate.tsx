/**
 * Permission Gate Component
 *
 * Conditionally renders children based on user permissions.
 * Used throughout the app to show/hide UI elements based on roles.
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 */

'use client';

import { type ReactNode } from 'react';
import {
  useCanEdit,
  useCanAdmin,
  useIsOwner,
  useCanManageTeamspace,
  useIsTeamspaceOwner,
} from '@/lib/permissions';

/**
 * Permission types that can be checked
 */
export type Permission =
  | 'canEdit'
  | 'canAdmin'
  | 'isOwner'
  | 'canManageTeamspace'
  | 'isTeamspaceOwner';

/**
 * Permission Gate Props
 */
export interface PermissionGateProps {
  /** Required permission to render children */
  requires: Permission;
  /** Content to render if user has permission */
  children: ReactNode;
  /** Optional fallback content to render if user lacks permission */
  fallback?: ReactNode;
}

/**
 * Permission Gate Component
 *
 * Renders children only if user has the required permission.
 * Optionally renders fallback content if permission is denied.
 *
 * @example
 * ```tsx
 * // Show edit button only to editors and owners
 * <PermissionGate requires="canEdit">
 *   <EditButton />
 * </PermissionGate>
 *
 * // Show different content based on permission
 * <PermissionGate requires="canAdmin" fallback={<ViewOnlyNotice />}>
 *   <AdminPanel />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  requires,
  children,
  fallback = null,
}: PermissionGateProps) {
  const canEdit = useCanEdit();
  const canAdmin = useCanAdmin();
  const isOwner = useIsOwner();
  const canManageTeamspace = useCanManageTeamspace();
  const isTeamspaceOwner = useIsTeamspaceOwner();

  const hasPermission = (() => {
    switch (requires) {
      case 'canEdit':
        return canEdit;
      case 'canAdmin':
        return canAdmin;
      case 'isOwner':
        return isOwner;
      case 'canManageTeamspace':
        return canManageTeamspace;
      case 'isTeamspaceOwner':
        return isTeamspaceOwner;
      default:
        return false;
    }
  })();

  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

PermissionGate.displayName = 'PermissionGate';
