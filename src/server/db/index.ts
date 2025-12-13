import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

/**
 * Database Connection
 *
 * Creates a PostgreSQL connection pool and Drizzle ORM instance.
 *
 * @see /docs/adrs/006-orm-selection.md
 */

/**
 * Get the database connection string based on the environment.
 *
 * In test environments (NODE_ENV=test or VITEST=true):
 * - Use process.env.DATABASE_URL directly to avoid triggering full serverEnv validation
 * - Tests only need DATABASE_URL set, not all server environment variables
 *
 * In production/development:
 * - Use serverEnv.DATABASE_URL to ensure full environment validation
 * - This prevents silent failures from misconfigured environments
 *
 * @throws {Error} If DATABASE_URL is not set in any environment
 */
function getDatabaseConnectionString(): string {
  // Check if we're in a test environment
  const isTestEnv =
    process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

  if (isTestEnv) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL environment variable is required for tests. ' +
          'Ensure your test setup file sets this before importing database code.'
      );
    }
    return connectionString;
  }

  // In non-test environments, use serverEnv for full validation
  // This import is lazy to avoid triggering validation at module load time
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { serverEnv } = require('@/lib/env');
  return serverEnv.DATABASE_URL;
}

// Create connection pool
const pool = new Pool({
  connectionString: getDatabaseConnectionString(),
  max: 10, // Maximum pool size
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Fail fast if can't connect in 2s
});

// Create Drizzle instance with schema
export const db = drizzle(pool, { schema });

// Export pool for direct access if needed (e.g., health checks)
export { pool };

// Re-export schema for convenience
export * from './schema';
