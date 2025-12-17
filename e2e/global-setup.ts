/**
 * Playwright Global Setup
 *
 * Runs before all tests to validate environment and prepare test state.
 * Seeds the database with a default teamspace to avoid first-user flow issues.
 *
 * @see /docs/adrs/005-testing-strategy.md
 */

import * as fs from 'fs';
import * as path from 'path';
import pg from 'pg';

/**
 * Global setup function
 *
 * This runs once before all tests.
 */
async function globalSetup(): Promise<void> {
  console.log('\n🔧 Playwright Global Setup\n');

  // ==========================================================================
  // Environment Validation
  // ==========================================================================

  const warnings: string[] = [];
  const errors: string[] = [];

  // Check DATABASE_URL
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is not set');
  } else if (!process.env.DATABASE_URL.includes('test')) {
    warnings.push(
      'DATABASE_URL does not contain "test" - make sure you\'re using a test database'
    );
  }

  // Check E2E_TEST_MODE
  if (process.env.E2E_TEST_MODE !== 'true') {
    warnings.push(
      'E2E_TEST_MODE is not set to "true" - rate limiting may block tests'
    );
  }

  // Check SESSION_SECRET
  if (!process.env.SESSION_SECRET) {
    errors.push('SESSION_SECRET is not set');
  }

  // Check MODE
  if (!process.env.MODE) {
    warnings.push('MODE is not set - defaulting to single-tenant');
  }

  // Check DATA_DIR and setup flag
  const dataDir = process.env.DATA_DIR;
  if (dataDir) {
    const setupFlagPath = path.join(dataDir, '.setup-complete');
    if (!fs.existsSync(setupFlagPath)) {
      warnings.push(
        `Setup flag not found at ${setupFlagPath} - first-user flow may trigger`
      );
    }
  } else {
    warnings.push('DATA_DIR is not set - setup completion status unknown');
  }

  // ==========================================================================
  // Report Results
  // ==========================================================================

  if (warnings.length > 0) {
    console.log('⚠️  Warnings:');
    for (const warning of warnings) {
      console.log(`   - ${warning}`);
    }
    console.log();
  }

  if (errors.length > 0) {
    console.log('❌ Errors:');
    for (const error of errors) {
      console.log(`   - ${error}`);
    }
    console.log();
    console.log(
      '💡 To fix: run `npm run validate:ci-env` for detailed guidance\n'
    );
    throw new Error('Environment validation failed. See errors above.');
  }

  // ==========================================================================
  // Database Seeding
  // ==========================================================================
  // Seed a default teamspace to avoid first-user flow issues.
  // Each parallel test will still create unique users, but they'll join
  // this existing teamspace instead of trying to create one.

  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    try {
      const client = new pg.Client({ connectionString: dbUrl });
      await client.connect();

      // Check if teamspace already exists
      const existing = await client.query(
        "SELECT id FROM teamspaces WHERE slug = 'workspace'"
      );

      if (existing.rows.length === 0) {
        console.log('🌱 Seeding default teamspace for E2E tests...');

        // Create default teamspace
        await client.query(`
          INSERT INTO teamspaces (id, name, slug, mode, created_at, updated_at)
          VALUES (
            gen_random_uuid(),
            'Test Workspace',
            'workspace',
            'single-tenant',
            NOW(),
            NOW()
          )
        `);
        console.log('   ✓ Created default teamspace "workspace"');
      } else {
        console.log('✓ Default teamspace already exists');
      }

      await client.end();
    } catch (error) {
      warnings.push(
        `Failed to seed database: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ==========================================================================
  // CI vs Local Mode Detection
  // ==========================================================================

  const isCI = !!process.env.CI;
  const isCIMode =
    process.env.NODE_ENV === 'production' &&
    process.env.E2E_TEST_MODE === 'true';

  if (isCI) {
    console.log('🏭 Running in GitHub Actions CI');
  } else if (isCIMode) {
    console.log('🔬 Running in local CI mode (production build)');
  } else {
    console.log('💻 Running in local dev mode');
    console.log(
      '   (Use `npm run test:e2e:ci-mode` to replicate CI behavior)\n'
    );
  }

  // ==========================================================================
  // Summary
  // ==========================================================================

  console.log('📋 Environment Summary:');
  console.log(
    `   DATABASE_URL: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@') ?? 'not set'}`
  );
  console.log(`   E2E_TEST_MODE: ${process.env.E2E_TEST_MODE ?? 'not set'}`);
  console.log(`   MODE: ${process.env.MODE ?? 'not set'}`);
  console.log(`   DATA_DIR: ${process.env.DATA_DIR ?? 'not set'}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV ?? 'not set'}`);
  console.log();

  console.log('✅ Global setup complete\n');
}

export default globalSetup;
