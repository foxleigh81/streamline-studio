/**
 * Playwright Global Setup
 *
 * Runs before all tests to validate environment and database connectivity.
 * Each test creates its own isolated workspace (no shared seeding needed).
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

  // Check DATA_DIR and setup flag (for setup wizard)
  const dataDir = process.env.DATA_DIR;
  if (dataDir) {
    const setupFlagPath = path.join(dataDir, '.setup-complete');
    if (!fs.existsSync(setupFlagPath)) {
      warnings.push(
        `Setup flag not found at ${setupFlagPath} - setup wizard may be shown`
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
  // Database Validation
  // ==========================================================================
  // Validate database connectivity (no seeding needed - each test creates
  // its own isolated workspace)

  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    try {
      const client = new pg.Client({ connectionString: dbUrl });
      await client.connect();
      console.log('✓ Database connection validated');
      await client.end();
    } catch (error) {
      errors.push(
        `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Check for database errors
  if (errors.length > 0) {
    console.log('❌ Database Errors:');
    for (const error of errors) {
      console.log(`   - ${error}`);
    }
    console.log();
    throw new Error('Database validation failed. See errors above.');
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
