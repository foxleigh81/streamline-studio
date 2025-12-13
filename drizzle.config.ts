import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit Configuration
 *
 * ADR-006 Requirements:
 * - Use PostgreSQL with pg driver
 * - Migration files in ./drizzle directory
 *
 * IMPORTANT: This config file must explicitly specify a database URL.
 * If DATABASE_URL is not set, we fail with a clear error instead of
 * falling back to libpq defaults (which uses system USER as db username).
 *
 * @see /docs/adrs/006-orm-selection.md
 */

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is required. ' +
      'For local development: cp .env.example .env and configure it. ' +
      'For CI/production: ensure DATABASE_URL is set in environment.'
  );
}

export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
