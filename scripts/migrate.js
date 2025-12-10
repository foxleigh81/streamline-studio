/**
 * Database Migration Runner
 *
 * Runs Drizzle migrations programmatically.
 * Used by docker-entrypoint.sh to apply migrations on container startup.
 *
 * ADR-011: Self-Hosting Packaging - Auto-run migrations
 * @see /docs/adrs/011-self-hosting-strategy.md
 */

const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');
const { Pool } = require('pg');

/**
 * Run database migrations
 *
 * @returns {Promise<void>}
 */
async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('[Migration] ERROR: DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('[Migration] Connecting to database...');

  const pool = new Pool({
    connectionString,
    max: 1, // Only need one connection for migrations
  });

  try {
    // Create drizzle instance
    const db = drizzle(pool);

    console.log('[Migration] Running migrations...');

    // Run migrations from ./drizzle directory
    await migrate(db, { migrationsFolder: './drizzle' });

    console.log('[Migration] All migrations completed successfully!');

    // Close the pool
    await pool.end();

    process.exit(0);
  } catch (error) {
    console.error('[Migration] ERROR: Migration failed');
    console.error('[Migration]', error.message);

    // Close the pool
    await pool.end();

    process.exit(1);
  }
}

// Run migrations
runMigrations();
