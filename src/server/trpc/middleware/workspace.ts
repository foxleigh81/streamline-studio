/**
 * Workspace tRPC Middleware
 *
 * Ensures user has access to the requested workspace and provides
 * workspace-scoped repository in context.
 *
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 * @see /docs/adrs/007-api-and-auth.md
 */

import { TRPCError } from '@trpc/server';
import { eq, and } from 'drizzle-orm';
import { middleware } from '../trpc';
import { db } from '@/server/db';
import { workspaces, workspaceUsers } from '@/server/db/schema';
import type {
  Workspace,
  WorkspaceUser,
  WorkspaceRole,
} from '@/server/db/schema';
import {
  createWorkspaceRepository,
  type WorkspaceRepository,
} from '@/server/repositories';
import { serverEnv } from '@/lib/env';

/**
 * Extended context with workspace information
 */
export interface WorkspaceContext {
  workspace: Workspace;
  workspaceUser: WorkspaceUser;
  workspaceRole: WorkspaceRole;
  repository: WorkspaceRepository;
}

/**
 * Get workspace from request headers or default workspace for single-tenant mode
 */
async function resolveWorkspace(
  userId: string,
  headers: Headers
): Promise<{ workspace: Workspace; membership: WorkspaceUser } | null> {
  const mode = serverEnv.MODE;

  if (mode === 'single-tenant') {
    // In single-tenant mode, get the user's workspace (should be exactly one)
    const result = await db
      .select({
        workspace: workspaces,
        membership: workspaceUsers,
      })
      .from(workspaceUsers)
      .innerJoin(workspaces, eq(workspaceUsers.workspaceId, workspaces.id))
      .where(eq(workspaceUsers.userId, userId))
      .limit(1);

    const firstResult = result[0];
    if (!firstResult) {
      return null;
    }

    return {
      workspace: firstResult.workspace,
      membership: firstResult.membership,
    };
  }

  // In multi-tenant mode, workspace ID is required from headers
  const workspaceId = headers.get('x-workspace-id');
  if (!workspaceId) {
    return null;
  }

  // Verify user has access to this workspace
  const result = await db
    .select({
      workspace: workspaces,
      membership: workspaceUsers,
    })
    .from(workspaceUsers)
    .innerJoin(workspaces, eq(workspaceUsers.workspaceId, workspaces.id))
    .where(
      and(
        eq(workspaceUsers.workspaceId, workspaceId),
        eq(workspaceUsers.userId, userId)
      )
    )
    .limit(1);

  const firstResult = result[0];
  if (!firstResult) {
    return null;
  }

  return {
    workspace: firstResult.workspace,
    membership: firstResult.membership,
  };
}

/**
 * Workspace middleware - ensures user has access to workspace
 *
 * This middleware:
 * 1. Resolves the workspace (from header in multi-tenant, or default in single-tenant)
 * 2. Verifies the user is a member of the workspace
 * 3. Adds workspace context and scoped repository to the context
 *
 * SECURITY: Returns NOT_FOUND instead of FORBIDDEN to prevent workspace enumeration
 */
export const workspaceMiddleware = middleware(async ({ ctx, next }) => {
  // Require authenticated user
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  const resolved = await resolveWorkspace(ctx.user.id, ctx.headers);

  if (!resolved) {
    // Return NOT_FOUND instead of FORBIDDEN to prevent enumeration attacks
    // This is intentional security measure per ADR-008
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Workspace not found',
    });
  }

  const { workspace, membership } = resolved;

  // Create workspace-scoped repository
  const repository = createWorkspaceRepository(db, workspace.id);

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
      workspace,
      workspaceUser: membership,
      workspaceRole: membership.role,
      repository,
    },
  });
});

/**
 * Role-based middleware factory
 *
 * Creates middleware that requires a specific minimum role.
 * Role hierarchy: owner > editor > viewer
 */
export function requireRole(minimumRole: WorkspaceRole) {
  const roleHierarchy: Record<WorkspaceRole, number> = {
    viewer: 1,
    editor: 2,
    owner: 3,
  };

  return middleware(async ({ ctx, next }) => {
    // This middleware should be used after workspaceMiddleware
    // so ctx should have workspaceRole
    const role = (ctx as { workspaceRole?: WorkspaceRole }).workspaceRole;

    if (!role) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Role check failed: workspace context not available',
      });
    }

    const userLevel = roleHierarchy[role];
    const requiredLevel = roleHierarchy[minimumRole];

    if (userLevel < requiredLevel) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `This action requires ${minimumRole} role or higher`,
      });
    }

    return next();
  });
}

/**
 * Middleware that requires owner role
 */
export const requireOwner = requireRole('owner');

/**
 * Middleware that requires editor role or higher
 */
export const requireEditor = requireRole('editor');
