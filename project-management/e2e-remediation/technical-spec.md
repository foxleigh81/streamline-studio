# E2E Test Configuration Remediation - Technical Specification

**Created**: 2025-12-12
**Status**: Draft
**Priority**: High

## Executive Summary

E2E tests are failing in CI due to a configuration mismatch between Playwright's web server command and Next.js's `output: standalone` mode. The tests are also using selectors that don't match the actual component text in some cases.

## Problem Analysis

### Core Issue: Standalone Mode Mismatch

**Current Configuration:**

- `next.config.ts` has `output: 'standalone'` enabled (line 13)
- `playwright.config.ts` runs `npm run start` in CI (line 79)
- `package.json` has `"start": "next start"` (line 8)

**The Problem:**
Next.js warns:

```
⚠ "next start" does not work with "output: standalone" configuration.
Use "node .next/standalone/server.js" instead.
```

When `output: standalone` is enabled, Next.js creates an optimized standalone build at `.next/standalone/server.js` that should be used instead of `next start`.

### Secondary Issue: Selector Mismatches

**Forms Analysis:**

#### Login Page (`/src/app/(auth)/login/page.tsx`)

- Heading: "Sign In" (line 69)
- Email label: "Email" (line 79)
- Password label: "Password" (line 90)
- Submit button: "Sign In" (line 107)
- Register link text: "Create one" (line 112)

#### Register Page (`/src/app/(auth)/register/page.tsx`)

- Heading: "Create Account" (line 84)
- Name label: "Name (optional)" (line 94)
- Email label: "Email" (line 104)
- Password label: "Password" (line 115)
- Confirm Password label: "Confirm Password" (line 127)
- Submit button: "Create Account" (line 143)
- Login link text: "Sign in" (line 148)

**Test Selectors:**

All test selectors use case-insensitive regex matching (e.g., `/sign in/i`, `/email/i`), which should work correctly. The tests are well-written and should match the actual component text.

**Verdict**: No selector mismatches found. The tests are correctly using flexible selectors.

## Recommended Solutions

### Option 1: Modify `npm run start` Script (RECOMMENDED)

**Pros:**

- Minimal changes to existing configuration
- Works for both local dev and CI
- Properly uses standalone mode
- No changes to Playwright config needed

**Cons:**

- None identified

**Implementation:**

1. Update `package.json`:

```json
{
  "scripts": {
    "start": "node .next/standalone/server.js"
  }
}
```

### Option 2: Add New CI-Specific Script

**Pros:**

- Preserves existing `start` script
- Explicit separation of concerns

**Cons:**

- Requires changes to both `package.json` and `playwright.config.ts`
- More configuration to maintain

**Implementation:**

1. Add to `package.json`:

```json
{
  "scripts": {
    "start:ci": "node .next/standalone/server.js"
  }
}
```

2. Update `playwright.config.ts`:

```typescript
webServer: {
  command: process.env.CI ? 'npm run start:ci' : 'npm run dev',
  // ... rest of config
}
```

### Option 3: Remove `output: standalone` Mode

**Pros:**

- No changes to scripts needed
- Standard Next.js configuration

**Cons:**

- Loses optimization benefits for Docker deployment
- Contradicts ADR-001 which specifies standalone mode for Docker
- Not recommended per project architecture

**Verdict**: NOT RECOMMENDED - conflicts with ADR-001

## Recommended Implementation: Option 1

### File Changes Required

#### 1. `/package.json`

**Change Line 8:**

```json
// BEFORE
"start": "next start",

// AFTER
"start": "node .next/standalone/server.js",
```

**Complete context (lines 6-10):**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "node .next/standalone/server.js",
    "lint": "next lint"
  }
}
```

### No Other Changes Required

The following files DO NOT need changes:

- `playwright.config.ts` - already correctly configured
- `next.config.ts` - already correctly configured
- `.github/workflows/ci.yml` - already correctly configured
- All E2E test files - selectors are correct

## Environment Variables

The standalone server requires the same environment variables as `next start`:

**Required:**

- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key

**Optional:**

- `MODE` - `single-tenant` or `multi-tenant` (default: `single-tenant`)
- `DATA_DIR` - Data directory path (default: `./data`)
- `NODE_ENV` - `production` or `development`
- `PORT` - Server port (default: `3000`)

**CI Configuration:**
These are already correctly set in `.github/workflows/ci.yml` (lines 172-176) and passed via `playwright.config.ts` (lines 88-99).

## Testing Strategy

### Local Testing (Before CI)

1. **Build the application:**

```bash
npm run build
```

This creates `.next/standalone/server.js`.

2. **Test the standalone server:**

```bash
# Set required environment variables
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/streamline_test"
export SESSION_SECRET="test-secret-for-local-testing-only"
export MODE="single-tenant"
export DATA_DIR="/tmp/streamline-data"
export NODE_ENV="production"

# Run the server
npm run start
```

3. **Verify server starts:**
   Open browser to `http://localhost:3000` - should see login page.

4. **Test E2E locally (simulating CI):**

```bash
# In one terminal: keep server running
npm run start

# In another terminal: run E2E tests
CI=true npm run test:e2e
```

5. **Full CI simulation:**

```bash
# Stop the server, then:
export CI=true
npm run test:e2e
# This will start the server via Playwright's webServer config
```

### CI Testing

After merging, the CI pipeline will:

1. Run `npm run build` (step 160-161 in ci.yml)
2. Playwright will run `npm run start` (via webServer.command)
3. The standalone server will start correctly
4. E2E tests will run against the production build

## Edge Cases and Gotchas

### 1. Standalone Build Must Exist

**Issue:** The `.next/standalone/` directory only exists after `npm run build`.

**Solution:** The CI workflow already runs `npm run build` before E2E tests (line 160-161).

**Local Testing:** Always run `npm run build` before `npm run start`.

### 2. Public and Static Files

**Issue:** The standalone server needs `public/` and `.next/static/` to be copied to the standalone directory.

**Current Status:** Next.js automatically handles this when `output: standalone` is set. The build process creates:

- `.next/standalone/` - server code
- `.next/static/` - static assets

**Docker Note:** For Docker deployments (covered in DOCKER.md), these must be copied manually:

```dockerfile
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
```

**CI Status:** Not an issue - tests run directly from the build output.

### 3. Environment Variables

**Issue:** Environment variables must be set when running the standalone server.

**Status:** Already handled:

- CI: Set in `.github/workflows/ci.yml` (lines 117-125, 172-176)
- Playwright: Passed via `webServer.env` (lines 88-99)

### 4. Dev Mode vs Production Mode

**Issue:** `npm run dev` uses Next.js dev server, `npm run start` uses production server.

**Status:** Already handled:

- Local: Playwright uses `npm run dev` (playwright.config.ts line 79)
- CI: Playwright uses `npm run start` (playwright.config.ts line 79)

### 5. Port Conflicts

**Issue:** If port 3000 is in use, the server won't start.

**Status:** Already handled:

- Playwright's `reuseExistingServer` is set to `!process.env.CI` (line 83)
- In CI, Playwright manages the server lifecycle
- Locally, it reuses existing server if running

## Migration Path

### Step 1: Pre-Merge Validation

1. Create feature branch
2. Make the change to `package.json`
3. Test locally:
   ```bash
   npm run build
   export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/streamline_test"
   export SESSION_SECRET="test-secret-only"
   export MODE="single-tenant"
   npm run start
   ```
4. Verify server starts without warnings
5. Run E2E tests: `npm run test:e2e`

### Step 2: CI Validation

1. Push to branch
2. Open PR
3. Wait for CI to run
4. Verify E2E tests pass

### Step 3: Post-Merge Monitoring

1. Merge to main
2. Monitor CI runs
3. Check for any environment-specific issues

## Rollback Plan

If issues arise:

1. **Immediate Rollback:**

   ```bash
   git revert <commit-hash>
   git push
   ```

2. **Alternative Fix:**
   Temporarily disable standalone mode:

   ```typescript
   // next.config.ts
   const nextConfig: NextConfig = {
     // output: 'standalone', // TEMPORARILY DISABLED
   ```

   Then revert the `package.json` change:

   ```json
   "start": "next start",
   ```

## Success Criteria

1. CI E2E tests pass without the standalone mode warning
2. No regressions in test coverage
3. Local development remains unaffected
4. Docker deployments continue to work (verified via DOCKER.md instructions)

## Timeline Estimate

- **Implementation**: 5 minutes (single line change)
- **Local Testing**: 15 minutes
- **PR Review**: 30 minutes
- **CI Validation**: 15 minutes
- **Total**: ~1 hour

## References

- [Next.js Standalone Output Documentation](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- ADR-001: Next.js Framework Selection (`/docs/adrs/001-nextjs-framework.md`)
- ADR-005: Testing Strategy (`/docs/adrs/005-testing-strategy.md`)
- Docker Deployment Guide (`/DOCKER.md`)
- CI Configuration (`.github/workflows/ci.yml`)

## Appendix: Full File Diffs

### package.json

```diff
{
  "name": "streamline-studio",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
-   "start": "next start",
+   "start": "node .next/standalone/server.js",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
```

## Decision

**Selected Approach**: Option 1 - Modify `npm run start` script

**Rationale**:

1. Minimal changes (single line)
2. Aligns with ADR-001 standalone mode requirement
3. No changes to Playwright or CI configuration needed
4. Properly uses Next.js standalone server
5. Works for both local and CI environments

**Next Steps**:

1. Implement the change
2. Test locally
3. Create PR
4. Monitor CI
5. Merge on success
