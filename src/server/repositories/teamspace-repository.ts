/**
 * Teamspace Repository
 *
 * The ONLY interface for accessing teamspace-scoped data.
 * All queries MUST go through this pattern to ensure proper isolation.
 *
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 * @see /docs/adrs/017-teamspace-hierarchy.md
 */

import { eq, and, count } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  teamspaces,
  teamspaceUsers,
  channels,
  type Teamspace,
  type TeamspaceUser,
  type TeamspaceRole,
  type Channel,
  type NewChannel,
  type NewTeamspace,
} from '@/server/db/schema';
import type * as schema from '@/server/db/schema';
import { isSingleTenant } from '@/lib/constants';

/**
 * TeamspaceRepository - Enforces teamspace scoping on ALL queries
 *
 * This class is the ONLY way to access teamspace-scoped data.
 * Every method automatically includes teamspace_id filtering.
 *
 * SECURITY: Never bypass this class for direct database queries.
 *
 * @example
 * ```typescript
 * const repo = new TeamspaceRepository(db, teamspaceId);
 * const members = await repo.getTeamspaceMembers();
 * const channels = await repo.getChannels();
 * ```
 */
export class TeamspaceRepository {
  private readonly db: NodePgDatabase<typeof schema>;
  private readonly teamspaceId: string;

  constructor(db: NodePgDatabase<typeof schema>, teamspaceId: string) {
    if (!teamspaceId) {
      throw new Error('TeamspaceRepository requires a teamspaceId');
    }
    this.db = db;
    this.teamspaceId = teamspaceId;
  }

  /**
   * Get the teamspace ID this repository is scoped to
   */
  getTeamspaceId(): string {
    return this.teamspaceId;
  }

  // ===========================================================================
  // TEAMSPACE
  // ===========================================================================

  /**
   * Get teamspace by ID
   * Returns null if teamspace doesn't exist or ID doesn't match
   */
  async getTeamspaceById(id: string): Promise<Teamspace | null> {
    if (id !== this.teamspaceId) {
      return null;
    }

    const result = await this.db
      .select()
      .from(teamspaces)
      .where(eq(teamspaces.id, this.teamspaceId))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Get teamspace by slug
   * Returns null if teamspace doesn't exist or doesn't match this instance's ID
   */
  async getTeamspaceBySlug(slug: string): Promise<Teamspace | null> {
    const result = await this.db
      .select()
      .from(teamspaces)
      .where(
        and(eq(teamspaces.slug, slug), eq(teamspaces.id, this.teamspaceId))
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Update teamspace details
   * Returns null if teamspace doesn't exist
   */
  async updateTeamspace(
    data: Partial<Omit<Teamspace, 'id' | 'createdAt'>>
  ): Promise<Teamspace | null> {
    const result = await this.db
      .update(teamspaces)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(teamspaces.id, this.teamspaceId))
      .returning();

    return result[0] ?? null;
  }

  // ===========================================================================
  // TEAMSPACE MEMBERS
  // ===========================================================================

  /**
   * Get all members of the teamspace
   */
  async getTeamspaceMembers(): Promise<TeamspaceUser[]> {
    return this.db
      .select()
      .from(teamspaceUsers)
      .where(eq(teamspaceUsers.teamspaceId, this.teamspaceId));
  }

  /**
   * Get a user's role in the teamspace
   * Returns null if user is not a member
   */
  async getMemberRole(userId: string): Promise<TeamspaceRole | null> {
    const result = await this.db
      .select({ role: teamspaceUsers.role })
      .from(teamspaceUsers)
      .where(
        and(
          eq(teamspaceUsers.teamspaceId, this.teamspaceId),
          eq(teamspaceUsers.userId, userId)
        )
      )
      .limit(1);

    return result[0]?.role ?? null;
  }

  /**
   * Add a member to the teamspace
   * Throws if member already exists
   */
  async addMember(userId: string, role: TeamspaceRole): Promise<TeamspaceUser> {
    const result = await this.db
      .insert(teamspaceUsers)
      .values({
        teamspaceId: this.teamspaceId,
        userId,
        role,
      })
      .returning();

    const member = result[0];
    if (!member) {
      throw new Error('Failed to add member');
    }
    return member;
  }

  /**
   * Update a member's role in the teamspace
   * Returns null if member doesn't exist
   */
  async updateMemberRole(
    userId: string,
    role: TeamspaceRole
  ): Promise<TeamspaceUser | null> {
    const result = await this.db
      .update(teamspaceUsers)
      .set({ role })
      .where(
        and(
          eq(teamspaceUsers.teamspaceId, this.teamspaceId),
          eq(teamspaceUsers.userId, userId)
        )
      )
      .returning();

    return result[0] ?? null;
  }

  /**
   * Remove a member from the teamspace
   * Returns true if removed, false if not found
   */
  async removeMember(userId: string): Promise<boolean> {
    const result = await this.db
      .delete(teamspaceUsers)
      .where(
        and(
          eq(teamspaceUsers.teamspaceId, this.teamspaceId),
          eq(teamspaceUsers.userId, userId)
        )
      )
      .returning({ userId: teamspaceUsers.userId });

    return result.length > 0;
  }

  // ===========================================================================
  // CHANNELS
  // ===========================================================================

  /**
   * Get all channels in the teamspace
   */
  async getChannels(): Promise<Channel[]> {
    return this.db
      .select()
      .from(channels)
      .where(eq(channels.teamspaceId, this.teamspaceId));
  }

  /**
   * Create a channel in the teamspace
   */
  async createChannel(
    data: Omit<NewChannel, 'id' | 'teamspaceId' | 'createdAt' | 'updatedAt'>
  ): Promise<Channel> {
    const result = await this.db
      .insert(channels)
      .values({
        ...data,
        teamspaceId: this.teamspaceId,
      })
      .returning();

    const channel = result[0];
    if (!channel) {
      throw new Error('Failed to create channel');
    }
    return channel;
  }
}

// ===========================================================================
// GLOBAL TEAMSPACE OPERATIONS (not scoped to a specific teamspace)
// ===========================================================================

/**
 * Reserved teamspace slugs that cannot be used in multi-tenant mode
 */
const RESERVED_TEAMSPACE_SLUGS = ['workspace'];

/**
 * Default teamspace slug for single-tenant mode
 */
export const DEFAULT_SINGLE_TENANT_TEAMSPACE_SLUG = 'workspace';

/**
 * Create a new teamspace
 *
 * In single-tenant mode:
 * - Only allows creating ONE teamspace
 * - Returns error if teamspace already exists
 *
 * In multi-tenant mode:
 * - Allows creating multiple teamspaces
 * - Prevents use of reserved slugs ('workspace')
 *
 * @param db - Drizzle database instance
 * @param data - Teamspace data (name, slug, optional fields)
 * @param creatorUserId - User ID to add as teamspace owner
 * @returns Created teamspace with owner membership
 * @throws Error if constraints are violated
 */
export async function createTeamspace(
  db: NodePgDatabase<typeof schema>,
  data: Omit<NewTeamspace, 'id' | 'createdAt' | 'updatedAt'>,
  creatorUserId: string
): Promise<{ teamspace: Teamspace; membership: TeamspaceUser }> {
  const singleTenant = isSingleTenant();

  // Single-tenant mode: Check if a teamspace already exists
  if (singleTenant) {
    const existingCount = await db
      .select({ count: count() })
      .from(teamspaces)
      .then((result) => result[0]?.count ?? 0);

    if (existingCount > 0) {
      throw new Error(
        'SINGLE_TENANT_CONSTRAINT: Cannot create multiple teamspaces in single-tenant mode'
      );
    }
  } else {
    // Multi-tenant mode: Check for reserved slugs
    if (RESERVED_TEAMSPACE_SLUGS.includes(data.slug)) {
      throw new Error(
        `RESERVED_SLUG: The slug '${data.slug}' is reserved and cannot be used`
      );
    }
  }

  // Create the teamspace
  const teamspaceResult = await db.insert(teamspaces).values(data).returning();

  const teamspace = teamspaceResult[0];
  if (!teamspace) {
    throw new Error('Failed to create teamspace');
  }

  // Add the creator as the owner
  const membershipResult = await db
    .insert(teamspaceUsers)
    .values({
      teamspaceId: teamspace.id,
      userId: creatorUserId,
      role: 'owner',
    })
    .returning();

  const membership = membershipResult[0];
  if (!membership) {
    // Rollback by deleting the teamspace if membership creation fails
    await db.delete(teamspaces).where(eq(teamspaces.id, teamspace.id));
    throw new Error('Failed to create teamspace owner membership');
  }

  return { teamspace, membership };
}

/**
 * Check if a teamspace exists with the given slug
 *
 * @param db - Drizzle database instance
 * @param slug - Teamspace slug to check
 * @returns true if teamspace exists
 */
export async function teamspaceExists(
  db: NodePgDatabase<typeof schema>,
  slug: string
): Promise<boolean> {
  const result = await db
    .select({ id: teamspaces.id })
    .from(teamspaces)
    .where(eq(teamspaces.slug, slug))
    .limit(1);

  return result.length > 0;
}

/**
 * Get teamspace count (useful for single-tenant mode validation)
 *
 * @param db - Drizzle database instance
 * @returns Number of teamspaces in the database
 */
export async function getTeamspaceCount(
  db: NodePgDatabase<typeof schema>
): Promise<number> {
  const result = await db.select({ count: count() }).from(teamspaces);
  return result[0]?.count ?? 0;
}

/**
 * Create a TeamspaceRepository instance
 *
 * @param db - Drizzle database instance
 * @param teamspaceId - The teamspace ID to scope all queries to
 */
export function createTeamspaceRepository(
  db: NodePgDatabase<typeof schema>,
  teamspaceId: string
): TeamspaceRepository {
  return new TeamspaceRepository(db, teamspaceId);
}
