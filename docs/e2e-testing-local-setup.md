# E2E Testing - Local Setup Guide

## Overview

This guide explains how to run Playwright E2E tests locally after resolving critical environment configuration issues discovered in December 2025.

## Root Cause Analysis

The E2E test failures were caused by multiple environment configuration issues:

### 1. Wrong Application on Port 3000

**Problem**: Playwright was configured to test `http://localhost:3000`, but a different Next.js application (Southern Water RSW) was running on that port.

**Impact**: Tests were connecting to the wrong application entirely, causing all navigation and form tests to fail.

### 2. Missing DATA_DIR Configuration

**Problem**: The application checks for setup completion by reading `.data/.setup-complete`, but the default `DATA_DIR` is `/data` (for Docker deployments). Without setting `DATA_DIR=.data`, the app redirected all requests to `/setup`.

**Impact**: All authentication and navigation tests failed because the app thought it wasn't set up.

### 3. Missing Test Environment File

**Problem**: No `.env.test.local` file existed to configure test database and environment variables.

**Impact**: Tests either used wrong database or failed to connect entirely.

## Solution

### Files Created/Modified

1. **`.env.test.local`** (NEW) - Test environment configuration
2. **`scripts/run-e2e-local.sh`** (NEW) - Local E2E test runner script
3. **`playwright.config.ts`** (MODIFIED) - Added environment variable pass-through and flexibility

### Configuration Changes

#### 1. Test Environment File (`.env.test.local`)

```bash
# Test Environment Configuration
# Used by Playwright E2E tests
# DO NOT commit this file

# Database connection for tests
DATABASE_URL=postgresql://streamline:supersecurepassword5679@localhost:5432/streamline_test

# Session secret for tests
SESSION_SECRET=test-secret-for-local-e2e-tests-only-32chars

# Application mode
MODE=single-tenant

# Proxy settings
TRUSTED_PROXY=false

# CRITICAL: Data directory must point to .data folder for setup completion flag
# Default is /data (for Docker), but local dev uses .data
DATA_DIR=.data
```

#### 2. Playwright Config Updates

- Added `DATA_DIR` to environment variable pass-through
- Added `PLAYWRIGHT_NO_REUSE` flag to prevent reusing wrong server
- Made `PORT` conditional to avoid empty string errors

## Running E2E Tests Locally

### Prerequisites

1. Docker PostgreSQL container running (`streamline-db`)
2. Test database exists: `streamline_test`
3. Migrations applied to test database
4. Setup completion flag exists: `.data/.setup-complete`

### Option 1: Use the Helper Script (Recommended)

The script handles all setup automatically:

```bash
# Run all smoke tests (Chromium only locally)
./scripts/run-e2e-local.sh --smoke

# Run all E2E tests (all browsers)
./scripts/run-e2e-local.sh

# Run in UI mode (interactive)
./scripts/run-e2e-local.sh --ui

# Run in debug mode
./scripts/run-e2e-local.sh --debug
```

The script will:

1. Check test database exists
2. Load `.env.test.local` environment
3. Run migrations on test database
4. Detect and offer to kill processes on port 3000
5. Run Playwright tests with correct configuration

### Option 2: Manual Execution

If you need more control:

```bash
# 1. Ensure test database exists
docker exec streamline-db psql -U streamline -lqt | grep streamline_test

# 2. Run migrations
DATABASE_URL=postgresql://streamline:supersecurepassword5679@localhost:5432/streamline_test npm run db:migrate

# 3. Stop any process on port 3000
lsof -ti:3000 | xargs kill

# 4. Run tests with environment variables
DATABASE_URL="postgresql://streamline:supersecurepassword5679@localhost:5432/streamline_test" \
SESSION_SECRET="test-secret-for-local-e2e-tests-only-32chars" \
MODE="single-tenant" \
DATA_DIR=".data" \
PLAYWRIGHT_NO_REUSE=1 \
npx playwright test e2e/smoke --project=chromium
```

## Test Results

### Before Fix

- Health endpoints: FAILING (wrong application)
- Navigation tests: TIMING OUT (30+ seconds)
- Form tests: FAILING (redirected to /setup)
- Overall: 0/19 passing

### After Fix

- Health endpoints: PASSING
- Navigation tests: PASSING
- Form tests: PASSING
- Accessibility tests: PASSING
- **Overall: 19/19 passing (Chromium)**

## CI vs Local Differences

### CI Environment (GitHub Actions)

- Uses PostgreSQL service container with user `postgres`
- Database: `streamline_test`
- Runs production build (`npm run build && npm run start`)
- Only runs Chromium browser (performance optimization)
- DATA_DIR not needed (uses in-memory setup flag)

### Local Environment

- Uses Docker container `streamline-db` with user `streamline`
- Database: `streamline_test`
- Runs development server (`npm run dev`)
- Runs all browsers by default (Chromium, Firefox, WebKit, Mobile)
- **Requires DATA_DIR=.data** (critical difference)

## Troubleshooting

### Tests redirect to /setup page

**Cause**: Missing or incorrect `DATA_DIR` configuration.

**Fix**:

```bash
# Ensure DATA_DIR is set when running tests
export DATA_DIR=.data

# Or use the helper script which sets this automatically
./scripts/run-e2e-local.sh --smoke
```

### Port 3000 already in use

**Cause**: Another application is running on port 3000.

**Fix**:

```bash
# Find and kill the process
lsof -ti:3000 | xargs kill

# Or use the helper script which handles this interactively
./scripts/run-e2e-local.sh --smoke
```

### Database connection errors

**Cause**: Wrong DATABASE_URL or database doesn't exist.

**Fix**:

```bash
# Check database exists
docker exec streamline-db psql -U streamline -lqt | grep streamline_test

# Create if missing
docker exec streamline-db createdb -U streamline streamline_test

# Run migrations
DATABASE_URL=postgresql://streamline:supersecurepassword5679@localhost:5432/streamline_test npm run db:migrate
```

### Firefox/WebKit browser not found

**Cause**: Playwright browsers not installed (normal for local dev).

**Fix**: Either install all browsers or run Chromium only (matches CI):

```bash
# Install all browsers (slow, 2GB+)
npx playwright install

# OR run only Chromium (fast, matches CI)
npx playwright test e2e/smoke --project=chromium
```

## Best Practices

1. **Always use the helper script** (`./scripts/run-e2e-local.sh`) for consistent setup
2. **Run only Chromium locally** to match CI environment and avoid browser installation overhead
3. **Stop other Next.js servers** before running tests to avoid port conflicts
4. **Keep `.env.test.local` out of git** - it's in `.gitignore` for security
5. **Run smoke tests first** (`--smoke` flag) to validate environment quickly

## Related Documentation

- `/docs/adrs/005-testing-strategy.md` - Testing architecture decisions
- `/playwright.config.ts` - Playwright configuration
- `/.github/workflows/ci.yml` - CI test execution
- `/e2e/README.md` - E2E test structure and guidelines
