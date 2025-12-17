#!/usr/bin/env tsx
/**
 * CI Environment Validator
 *
 * Validates that the current environment matches CI configuration.
 * Run before E2E tests to catch environment mismatches early.
 *
 * Usage:
 *   npx tsx scripts/validate-ci-env.ts
 *   npm run validate:ci-env
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  expected?: string;
  actual?: string;
}

const results: ValidationResult[] = [];

function check(
  name: string,
  condition: boolean,
  message: string,
  options?: { expected?: string; actual?: string; warnOnly?: boolean }
): void {
  if (condition) {
    results.push({ name, status: 'pass', message });
  } else if (options?.warnOnly) {
    results.push({
      name,
      status: 'warn',
      message,
      expected: options?.expected,
      actual: options?.actual,
    });
  } else {
    results.push({
      name,
      status: 'fail',
      message,
      expected: options?.expected,
      actual: options?.actual,
    });
  }
}

// =============================================================================
// Environment Variable Checks
// =============================================================================

console.log('\n🔍 Validating CI Environment Parity\n');
console.log('━'.repeat(60));

// DATABASE_URL
const dbUrl = process.env.DATABASE_URL;
check(
  'DATABASE_URL',
  !!dbUrl && dbUrl.includes('streamline_test'),
  'Database URL should point to test database',
  {
    expected: 'postgresql://...@.../streamline_test',
    actual: dbUrl ? dbUrl.replace(/:[^:@]+@/, ':***@') : 'not set',
  }
);

// E2E_TEST_MODE
check(
  'E2E_TEST_MODE',
  process.env.E2E_TEST_MODE === 'true',
  'E2E test mode should be enabled for relaxed rate limiting',
  {
    expected: 'true',
    actual: process.env.E2E_TEST_MODE ?? 'not set',
  }
);

// SESSION_SECRET
check(
  'SESSION_SECRET',
  !!process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32,
  'Session secret should be set and at least 32 characters',
  {
    expected: 'At least 32 characters',
    actual: process.env.SESSION_SECRET
      ? `${process.env.SESSION_SECRET.length} characters`
      : 'not set',
  }
);

// MODE
check(
  'MODE',
  process.env.MODE === 'single-tenant',
  'Mode should be single-tenant',
  {
    expected: 'single-tenant',
    actual: process.env.MODE ?? 'not set',
  }
);

// DATA_DIR
const dataDir = process.env.DATA_DIR;
check('DATA_DIR', !!dataDir, 'Data directory should be set', {
  expected: '/tmp/streamline-data or similar',
  actual: dataDir ?? 'not set',
});

// =============================================================================
// Setup Flag Check
// =============================================================================

if (dataDir) {
  const setupFlagPath = path.join(dataDir, '.setup-complete');
  const setupFlagExists = fs.existsSync(setupFlagPath);

  check(
    'Setup Flag',
    setupFlagExists,
    'Setup complete flag should exist (created BEFORE build in CI)',
    {
      expected: `${setupFlagPath} exists`,
      actual: setupFlagExists ? 'exists' : 'missing',
    }
  );

  if (setupFlagExists) {
    try {
      const content = fs.readFileSync(setupFlagPath, 'utf-8');
      const parsed = JSON.parse(content);
      check(
        'Setup Flag Content',
        parsed.completed === true,
        'Setup flag should indicate completion',
        {
          expected: '{"completed":true,...}',
          actual: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        }
      );
    } catch {
      check('Setup Flag Content', false, 'Setup flag should be valid JSON', {
        expected: 'Valid JSON',
        actual: 'Invalid or unreadable',
      });
    }
  }
}

// =============================================================================
// Database Connection Check
// =============================================================================

async function checkDatabase(): Promise<void> {
  if (!dbUrl) {
    check('Database Connection', false, 'Cannot check - DATABASE_URL not set');
    return;
  }

  try {
    // Dynamic import to handle case where pg isn't available
    const { default: pg } = await import('pg');
    const client = new pg.Client({ connectionString: dbUrl });

    await client.connect();

    // Check if database is fresh (no users = CI-like state)
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    const count = parseInt(userCount.rows[0]?.count ?? '0', 10);

    check(
      'Database State',
      count <= 10, // Allow some seeded users
      'Database should be fresh or minimally seeded (like CI)',
      {
        expected: '0-10 users (fresh CI database)',
        actual: `${count} users`,
        warnOnly: count > 10,
      }
    );

    await client.end();
    check('Database Connection', true, 'Successfully connected to database');
  } catch (error) {
    check(
      'Database Connection',
      false,
      `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// =============================================================================
// Build Check
// =============================================================================

function checkBuild(): void {
  const standaloneExists = fs.existsSync('.next/standalone/server.js');
  const staticExists = fs.existsSync('.next/standalone/.next/static');
  const publicExists = fs.existsSync('.next/standalone/public');

  check(
    'Standalone Build',
    standaloneExists,
    'Standalone server should exist (npm run build)',
    {
      expected: '.next/standalone/server.js exists',
      actual: standaloneExists ? 'exists' : 'missing',
      warnOnly: true, // Warn only since dev server is valid for local testing
    }
  );

  if (standaloneExists) {
    check(
      'Static Assets',
      staticExists,
      'Static assets should be copied to standalone folder',
      {
        expected: '.next/standalone/.next/static exists',
        actual: staticExists ? 'exists' : 'missing',
      }
    );

    check(
      'Public Assets',
      publicExists,
      'Public assets should be copied to standalone folder',
      {
        expected: '.next/standalone/public exists',
        actual: publicExists ? 'exists' : 'missing',
      }
    );
  }
}

// =============================================================================
// Run Checks and Print Results
// =============================================================================

async function main(): Promise<void> {
  checkBuild();
  await checkDatabase();

  console.log('\n📋 Validation Results:\n');

  let hasFailures = false;
  let hasWarnings = false;

  for (const result of results) {
    const icon =
      result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';

    console.log(`${icon} ${result.name}`);
    console.log(`   ${result.message}`);

    if (result.expected && result.status !== 'pass') {
      console.log(`   Expected: ${result.expected}`);
      console.log(`   Actual:   ${result.actual}`);
    }
    console.log();

    if (result.status === 'fail') hasFailures = true;
    if (result.status === 'warn') hasWarnings = true;
  }

  console.log('━'.repeat(60));

  const passCount = results.filter((r) => r.status === 'pass').length;
  const warnCount = results.filter((r) => r.status === 'warn').length;
  const failCount = results.filter((r) => r.status === 'fail').length;

  console.log(
    `\n📊 Summary: ${passCount} passed, ${warnCount} warnings, ${failCount} failed\n`
  );

  if (hasFailures) {
    console.log('❌ Environment does NOT match CI configuration.');
    console.log('   Tests may behave differently than in GitHub Actions.\n');
    console.log('💡 To replicate CI environment locally:');
    console.log('   npm run test:e2e:ci-mode\n');
    console.log('   Or see .env.ci.example for manual setup instructions.\n');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('⚠️  Environment mostly matches CI, with some differences.');
    console.log(
      '   Tests should generally work but may have minor differences.\n'
    );
    process.exit(0);
  } else {
    console.log('✅ Environment matches CI configuration.');
    console.log('   Tests should behave identically to GitHub Actions.\n');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Validation script error:', error);
  process.exit(1);
});
