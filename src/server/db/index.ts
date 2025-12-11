import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { serverEnv } from '@/lib/env';

/**
 * Database Connection
 *
 * Creates a PostgreSQL connection pool and Drizzle ORM instance.
 *
 * @see /docs/adrs/006-orm-selection.md
 */

// Create connection pool
const pool = new Pool({
  connectionString: serverEnv.DATABASE_URL,
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
