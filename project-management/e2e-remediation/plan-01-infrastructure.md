# Plan 01: Infrastructure Fix - Standalone Server Startup

## Priority: P0 (CRITICAL - BLOCKING ALL TESTS)

## Status: Ready for Implementation

## Problem Statement

The Playwright web server is not starting correctly in CI, causing **ALL E2E tests to fail**. The root cause is a mismatch between the Next.js configuration and the Playwright server startup command.

### Current Behavior

- CI builds Next.js with `output: 'standalone'` (see `next.config.ts:13`)
- Playwright tries to start server with `npm run start` (see `playwright.config.ts:79`)
- `package.json:8` defines start script as `next start`
- Next.js outputs warning: "next start" does not work with "output: standalone" configuration
- Server fails to start correctly
- All E2E tests fail because application is not running

### Root Cause

Next.js standalone mode creates a custom server file at `.next/standalone/server.js` that must be run directly with Node.js. The `next start` command is incompatible with standalone mode.

### Evidence

From CI logs:

```
[WebServer] ⚠ "next start" does not work with "output: standalone" configuration.
Use "node .next/standalone/server.js" instead.
```

## Solution Design

### Approach 1: Update package.json (RECOMMENDED)

Update the `start` script in `package.json` to use the standalone server directly.

**Pros**:

- Single source of truth for production start command
- Works for both Docker and CI
- Aligned with Next.js documentation
- Simplest solution

**Cons**:

- Changes the `npm run start` behavior globally
- May affect local development workflows (mitigated by separate `dev` script)

### Approach 2: Update playwright.config.ts only

Change only the Playwright config to use `node .next/standalone/server.js` directly.

**Pros**:

- Minimal change scope
- Doesn't affect other start commands

**Cons**:

- Duplicates server startup logic
- `npm run start` still broken for standalone builds
- Not aligned with Next.js best practices

### Selected Approach: Approach 1 (Update package.json)

This aligns with Next.js documentation and Docker best practices.

## Implementation Plan

### Files to Modify

1. **`/package.json`** (Required)
   - Update line 8: `"start": "next start"` → `"start": "node .next/standalone/server.js"`

### Changes Required

#### 1. Update package.json

**Current**:

```json
{
  "scripts": {
    "start": "next start"
  }
}
```

**New**:

```json
{
  "scripts": {
    "start": "node .next/standalone/server.js"
  }
}
```

**Rationale**: This aligns with Next.js standalone mode documentation and matches the Docker deployment strategy.

### Verification Steps

#### Local Verification (Before Commit)

```bash
# 1. Clean build
rm -rf .next
npm run build

# 2. Verify standalone output exists
ls -la .next/standalone/server.js
# Should show: -rw-r--r--  1 user  staff  XXXXX server.js

# 3. Test start command works
npm run start
# Server should start on port 3000
# Open http://localhost:3000 in browser
# Ctrl+C to stop

# 4. Test with Playwright
npm run test:smoke
# Should pass basic smoke tests
```

#### CI Verification (After Commit)

```bash
# Push to branch and verify GitHub Actions:
# 1. Build job completes
# 2. E2E job starts web server successfully
# 3. Tests begin running (may still fail due to other issues)
```

### CI-Specific Considerations

#### Environment Variables (Already Configured)

The CI workflow already passes required environment variables:

- `DATABASE_URL` - PostgreSQL connection
- `MODE` - single-tenant
- `SESSION_SECRET` - Test secret
- `DATA_DIR` - /tmp/streamline-data
- `NODE_ENV` - production

#### Standalone Build Requirements

1. **Build artifacts**: `.next/standalone/` folder with `server.js`
2. **Static files**: `.next/static/` folder (copied automatically)
3. **Public assets**: `public/` folder (copied automatically)

#### Port Configuration

- Default: 3000 (matches `playwright.config.ts:35` baseURL)
- Can override with `PORT` environment variable if needed

#### Hostname Configuration

- CI: Should listen on all interfaces (0.0.0.0)
- Can set via `HOSTNAME` environment variable

### Expected Outcome

After this fix:

- Playwright web server starts successfully in CI
- Server logs show: "Ready on http://0.0.0.0:3000"
- Tests can connect to the application
- Form submissions work (no more 500 errors)

Tests may still fail due to other issues (selectors, assertions), but the server will be running correctly.

## Testing Strategy

### Unit-Level Testing

Not applicable - this is an infrastructure change.

### Integration Testing

```bash
# Test 1: Start server manually
npm run build
npm run start
# Expected: Server starts on port 3000

# Test 2: Playwright smoke tests
npm run test:smoke
# Expected: Health endpoint tests pass

# Test 3: Single auth test
npm run test:e2e -- e2e/auth/login.spec.ts -g "renders login form"
# Expected: Test connects to server, page loads
```

### E2E Testing in CI

- Full E2E test suite will run in CI
- Expect server to start successfully
- Tests may still fail, but NOT due to server startup

## Rollback Plan

### If Server Won't Start

```json
// Revert package.json to:
{
  "scripts": {
    "start": "next start"
  }
}
```

### If CI Breaks

1. Check `.next/standalone/server.js` exists in build output
2. Verify `npm run build` completed successfully
3. Check CI logs for server startup errors
4. Confirm environment variables are passed correctly

### Emergency Fallback

If standalone mode is fundamentally broken, can temporarily disable:

```ts
// next.config.ts
const nextConfig: NextConfig = {
  // output: 'standalone', // COMMENTED OUT
  reactStrictMode: true,
  // ... rest of config
};
```

Then revert package.json to `"start": "next start"`.

**Note**: This defeats Docker optimization and should only be temporary.

## Dependencies

### Blocked By

- None (can start immediately)

### Blocks

- Plan 02 (Test Configuration)
- Plan 03 (WCAG Tests)
- Plan 04 (tRPC Tests)
- Plan 05 (Auth Tests)
- Plan 06 (Remaining Tests)

All other plans depend on the server starting correctly.

## Success Criteria

- [ ] `npm run build` creates `.next/standalone/server.js`
- [ ] `npm run start` starts the server successfully
- [ ] Server listens on port 3000
- [ ] Server responds to HTTP requests
- [ ] Playwright `webServer` starts without errors in CI
- [ ] Health endpoint returns 200 OK
- [ ] At least 1 E2E test can connect to the server

## Risk Assessment

### Risk Level: HIGH

This change affects how the production server starts in all environments.

### Mitigation

1. Test thoroughly in local environment first
2. Verify in CI before proceeding to other plans
3. Keep rollback plan ready
4. Monitor CI logs carefully

### Impact Analysis

- **Positive**: Fixes all server startup issues, enables E2E testing
- **Negative**: Changes production start behavior (but aligns with best practices)
- **Neutral**: No application code changes, only infrastructure

## References

### Documentation

- [Next.js Standalone Output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Playwright Web Server Config](https://playwright.dev/docs/test-webserver)

### GitHub Issues

- [vercel/next.js#49594](https://github.com/vercel/next.js/issues/49594) - Docs: output standalone and next start

### Best Practices

- [Optimizing Next.js Docker Images with Standalone Mode](https://dev.to/angojay/optimizing-nextjs-docker-images-with-standalone-mode-2nnh)
- [Standalone Next.js Deployment](https://focusreactive.com/standalone-next-js-when-serverless-is-not-an-option/)

### Related Files

- `/next.config.ts` - Standalone mode configuration
- `/playwright.config.ts` - Web server configuration
- `/.github/workflows/ci.yml` - CI workflow
- `/DOCKER.md` - Production deployment documentation

---

**Last Updated**: 2025-12-12
**Status**: Ready for implementation
**Priority**: P0 - CRITICAL
**Estimated Time**: 15 minutes
**Owner**: Senior Developer
