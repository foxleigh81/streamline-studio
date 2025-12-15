/**
 * Teamspace Repository
 *
 * The ONLY interface for accessing teamspace-scoped data.
 * All queries MUST go through this pattern to ensure proper isolation.
 *
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 * @see /docs/adrs/017-teamspace-hierarchy.md
 */

import { eq, and } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  teamspaces,
  teamspaceUsers,
  projects,
  type Teamspace,
  type TeamspaceUser,
  type TeamspaceRole,
  type Project,
  type NewProject,
} from '@/server/db/schema';
import type * as schema from '@/server/db/schema';

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
 * const projects = await repo.getProjects();
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
  // PROJECTS
  // ===========================================================================

  /**
   * Get all projects in the teamspace
   */
  async getProjects(): Promise<Project[]> {
    return this.db
      .select()
      .from(projects)
      .where(eq(projects.teamspaceId, this.teamspaceId));
  }

  /**
   * Create a project in the teamspace
   */
  async createProject(
    data: Omit<NewProject, 'id' | 'teamspaceId' | 'createdAt' | 'updatedAt'>
  ): Promise<Project> {
    const result = await this.db
      .insert(projects)
      .values({
        ...data,
        teamspaceId: this.teamspaceId,
      })
      .returning();

    const project = result[0];
    if (!project) {
      throw new Error('Failed to create project');
    }
    return project;
  }
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
