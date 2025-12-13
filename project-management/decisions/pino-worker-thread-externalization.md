# Decision: Pino Worker Thread Externalization

## Status: IMPLEMENTED

**Date**: 2025-12-11
**Decision Type**: Technical Configuration
**Impact Level**: Critical - Fixes E2E test failures in CI

## Problem Statement

E2E tests were failing in CI with a MODULE_NOT_FOUND error:

```
[Error: Cannot find module '/home/runner/work/streamline-studio/streamline-studio/.next/server/vendor-chunks/lib/worker.js'] {
  code: 'MODULE_NOT_FOUND',
  requireStack: []
}
```

### Root Cause Analysis

The issue was caused by **pino's dependency on thread-stream**, which uses Node.js worker threads:

```
pino@10.1.0 → thread-stream@3.1.0 → worker_threads
```

When Next.js builds in `standalone` mode (configured in `next.config.ts`), it attempts to bundle dependencies including worker thread code. However, the worker.js files from pino's thread-stream dependency were not being properly resolved at runtime, causing the MODULE_NOT_FOUND error.

### Why This Wasn't Caught Earlier

1. The previous fix only moved `pino-pretty` to development-only, but **pino itself** still uses worker threads
2. Local dev server runs without the standalone build optimization
3. The issue only manifests when running the production build (which CI does)

### Investigation Steps

1. Confirmed pino dependency chain includes thread-stream
2. Verified worker.js files exist in build but incorrect path resolution
3. Identified that pino needs to be externalized from Next.js bundling
4. Tested fix locally with production build

## Decision

Add pino and related packages to `serverExternalPackages` in `next.config.ts` to prevent Next.js from bundling them. This allows the packages to be loaded at runtime from node_modules with correct paths.

## Implementation

### File Changed: `next.config.ts`

```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,

  // Transpile specific packages if needed
  transpilePackages: [],

  // Externalize packages that use worker threads to prevent bundling issues
  // pino uses thread-stream which requires worker threads at runtime
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],

  // ... rest of config
};
```

## Rationale

### Why This Approach?

**Option 1: Externalize pino (CHOSEN)**

- Pros:
  - Minimal code changes (one config line)
  - Maintains structured logging (ADR-compliant)
  - Proven solution for worker thread packages
  - No impact on application functionality
- Cons:
  - Slightly increases standalone deployment size
  - Packages must be available in node_modules at runtime

**Option 2: Replace pino with simpler logger**

- Pros:
  - Guaranteed compatibility
  - Potentially smaller bundle
- Cons:
  - Requires extensive code changes
  - Violates existing ADRs
  - Loses pino's performance benefits
  - Need to update documentation

**Option 3: Conditional logger by environment**

- Pros:
  - Flexibility
- Cons:
  - Increased complexity
  - Inconsistent logging across environments
  - Harder to debug production issues

## Verification

### Local Testing

1. Built Next.js application in standalone mode
2. Verified pino packages in `.next/standalone/node_modules/`
3. Confirmed worker.js files accessible at correct paths
4. Ran E2E tests locally - no MODULE_NOT_FOUND errors

### CI Testing

Expected outcomes when pushed to CI:

1. E2E tests start successfully without worker.js errors
2. Application server starts without module resolution errors
3. Logging continues to work as expected

## Impact Assessment

### Positive Impact

- Fixes critical E2E test pipeline failures
- Maintains existing logging architecture
- No application code changes required
- Compatible with Docker standalone deployments

### Deployment Considerations

- Standalone build now includes pino in node_modules (not bundled)
- Docker images must ensure `npm ci --production` includes pino dependencies
- Total deployment size increase: ~2MB (pino + thread-stream + dependencies)

## Related Documentation

- `/docs/adrs/001-nextjs-framework.md` - Next.js standalone build decision
- `/CONTRIBUTING.md` - Logging standards (pino required)
- `/src/lib/logger.ts` - Pino logger implementation
- `project-management/tasks/edge-runtime-fix-complete.md` - Previous pino-pretty fix

## Future Considerations

### Monitoring

- Watch for any other packages that use worker threads
- Monitor bundle size impact in production
- Track logging performance in standalone builds

### Potential Alternatives (If Issues Arise)

1. **pino/file transport**: Use file-based transport instead of thread-stream
2. **Conditional transport**: Disable pretty printing entirely in production
3. **Logger replacement**: Only as last resort if performance issues emerge

## Success Criteria

- [x] Next.js build completes successfully
- [x] E2E tests run without MODULE_NOT_FOUND errors
- [x] Logging functionality preserved
- [ ] CI pipeline passes (pending push)
- [ ] Production deployment verified (pending)

## Lessons Learned

1. Worker thread dependencies require special handling in Next.js standalone builds
2. Server packages using native Node.js features may need externalization
3. Always test production builds, not just development mode
4. Check full dependency tree, not just direct dependencies
