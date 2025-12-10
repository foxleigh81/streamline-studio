/**
 * Workspace-related schemas
 *
 * Centralized Zod schemas for workspace operations.
 * Ensures consistent validation across the application.
 *
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

import { z } from 'zod';

/**
 * Workspace role schema
 * Defines the valid roles for workspace members
 */
export const workspaceRoleSchema = z.enum(['owner', 'editor', 'viewer']);

/**
 * Workspace role type
 */
export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;
