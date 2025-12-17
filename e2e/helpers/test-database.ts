/**
 * Test Database Utilities
 *
 * Provides utilities for managing database state during E2E tests.
 * Ensures test isolation by cleaning up data between tests.
 *
 * @see /docs/adrs/005-testing-strategy.md
 */

import pg from 'pg';

/**
 * Tables to clean in order (respects foreign key constraints)
 * Order matters: children before parents
 */
const TABLES_TO_CLEAN = [
  'document_versions',
  'documents',
  'videos',
  'channel_users',
  'channels',
  'workspace_users',
  'user_preferences',
  'sessions',
  'users',
  'workspaces',
] as const;

/**
 * Tables that should NOT be cleaned (system/config tables)
 */
const PROTECTED_TABLES = ['drizzle_migrations'] as const;

/**
 * Test Database Manager
 *
 * Provides methods for cleaning up test data and managing database state.
 */
export class TestDatabase {
  private client: pg.Client | null = null;
  private connectionString: string;

  constructor(connectionString?: string) {
    this.connectionString =
      connectionString ??
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/streamline_test';
  }

  /**
   * Connect to the database
   */
  async connect(): Promise<void> {
    if (this.client) return;

    this.client = new pg.Client({
      connectionString: this.connectionString,
    });

    await this.client.connect();
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }

  /**
   * Execute a query
   */
  async query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    sql: string,
    params?: unknown[]
  ): Promise<pg.QueryResult<T>> {
    if (!this.client) {
      await this.connect();
    }
    return this.client!.query<T>(sql, params);
  }

  /**
   * Truncate all test tables (respects foreign key constraints)
   *
   * This is the primary method for cleaning up between tests.
   * Uses TRUNCATE with CASCADE for efficiency.
   */
  async truncateAll(): Promise<void> {
    await this.connect();

    // Use CASCADE to handle foreign key constraints automatically
    const tableList = TABLES_TO_CLEAN.join(', ');
    await this.query(`TRUNCATE TABLE ${tableList} CASCADE`);
  }

  /**
   * Delete all data from tables (slower but works with triggers)
   *
   * Use this if TRUNCATE causes issues with triggers or if you need
   * to fire DELETE triggers.
   */
  async deleteAll(): Promise<void> {
    await this.connect();

    // Delete in order to respect foreign key constraints
    for (const table of TABLES_TO_CLEAN) {
      await this.query(`DELETE FROM ${table}`);
    }
  }

  /**
   * Reset sequences to 1 (for predictable IDs in tests)
   *
   * Note: Our schema uses UUIDs, so this is mainly for any
   * integer sequences that might be added later.
   */
  async resetSequences(): Promise<void> {
    await this.connect();

    // Get all sequences in the database
    const result = await this.query<{ sequence_name: string }>(`
      SELECT sequence_name
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
    `);

    for (const row of result.rows) {
      await this.query(`ALTER SEQUENCE ${row.sequence_name} RESTART WITH 1`);
    }
  }

  /**
   * Clean up and reset the database to a fresh state
   *
   * This is the recommended method to call in test setup/teardown.
   */
  async reset(): Promise<void> {
    await this.truncateAll();
    await this.resetSequences();
  }

  /**
   * Get the count of rows in a table
   */
  async getCount(table: string): Promise<number> {
    await this.connect();

    // Validate table name to prevent SQL injection
    if (
      !TABLES_TO_CLEAN.includes(table as (typeof TABLES_TO_CLEAN)[number]) &&
      !PROTECTED_TABLES.includes(table as (typeof PROTECTED_TABLES)[number])
    ) {
      throw new Error(`Unknown table: ${table}`);
    }

    const result = await this.query<{ count: string }>(
      `SELECT COUNT(*) FROM ${table}`
    );
    return parseInt(result.rows[0]?.count ?? '0', 10);
  }

  /**
   * Check if the database is in a "fresh" state (no user data)
   */
  async isFresh(): Promise<boolean> {
    const userCount = await this.getCount('users');
    return userCount === 0;
  }

  /**
   * Seed the database with minimal test data
   *
   * Creates the bare minimum data needed for tests to run.
   * This matches what CI does with `npm run db:seed`.
   */
  async seedMinimal(): Promise<void> {
    // The actual seeding is done by the seed script
    // This is a placeholder for any test-specific seeding
  }

  /**
   * Create a clean user for testing
   *
   * Returns the user ID for use in tests.
   */
  async createTestUser(options: {
    email: string;
    passwordHash: string;
    name?: string;
  }): Promise<string> {
    await this.connect();

    const result = await this.query<{ id: string }>(
      `
      INSERT INTO users (id, email, password_hash, name, email_verified, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, true, NOW(), NOW())
      RETURNING id
    `,
      [options.email, options.passwordHash, options.name ?? 'Test User']
    );

    return result.rows[0]!.id;
  }

  /**
   * Delete a specific user and their related data
   */
  async deleteUser(userId: string): Promise<void> {
    await this.connect();

    // Delete in order to respect foreign key constraints
    await this.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    await this.query('DELETE FROM user_preferences WHERE user_id = $1', [
      userId,
    ]);
    await this.query('DELETE FROM channel_users WHERE user_id = $1', [userId]);
    await this.query('DELETE FROM workspace_users WHERE user_id = $1', [
      userId,
    ]);
    await this.query('DELETE FROM users WHERE id = $1', [userId]);
  }
}

/**
 * Global test database instance
 *
 * Use this in test fixtures for database operations.
 */
export const testDb = new TestDatabase();

/**
 * Clean up the database before/after tests
 *
 * Usage in Playwright:
 * ```typescript
 * import { cleanDatabase } from './helpers/test-database';
 *
 * test.beforeEach(async () => {
 *   await cleanDatabase();
 * });
 * ```
 */
export async function cleanDatabase(): Promise<void> {
  await testDb.reset();
}

/**
 * Check if database matches CI state (fresh)
 */
export async function isDatabaseFresh(): Promise<boolean> {
  return testDb.isFresh();
}
