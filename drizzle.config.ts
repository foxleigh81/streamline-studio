import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit Configuration
 *
 * ADR-006 Requirements:
 * - Use PostgreSQL with pg driver
 * - Migration files in ./drizzle directory
 *
 * @see /docs/adrs/006-orm-selection.md
 */
export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://streamline:password@localhost:5432/streamline',
  },
  verbose: true,
  strict: true,
});
