# Plan 04: tRPC Endpoint Tests - Fix Response Format

## Priority: P2 (MEDIUM - AFFECTS ~3 TESTS)

## Status: Ready for Implementation

## Problem Statement

The tRPC health endpoint test expects a specific response format that doesn't match the actual tRPC v11 response structure. This causes health check tests to fail despite the endpoint working correctly.

### Current Issues

1. Test expects `body.result?.data?.status`
2. Also checks `body.result?.data?.json?.status` as fallback
3. Actual tRPC v11 format may differ
4. Health endpoint returns 200 OK but test fails on assertion

### Evidence from Test File

From `/e2e/smoke/critical-paths.spec.ts` (lines 36-47):

```typescript
test('tRPC health endpoint is reachable', async ({ request }) => {
  const response = await request.get('/api/trpc/health');

  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  // tRPC v11 returns data directly in result.data for queries
  // Handle both possible response formats
  const status = body.result?.data?.status ?? body.result?.data?.json?.status;
  expect(status).toBe('ok');
});
```

### Root Cause

tRPC v11 response format depends on:

- Query vs. mutation
- Success vs. error
- Batching configuration
- Transformer (SuperJSON) usage

The test doesn't account for all possible response formats.

## Solution Design

### Approach 1: Fix Response Format Expectation (RECOMMENDED)

Inspect the actual response and update test to match tRPC v11 format.

**Pros**:

- Aligns test with reality
- Tests actual API behavior
- Simple fix

**Cons**:

- Need to verify actual response format first

### Approach 2: Update tRPC Router

Change the health endpoint response format.

**Pros**:

- Could simplify response structure

**Cons**:

- Changes working code
- May break other consumers
- Not necessary if test is wrong

### Selected Approach: Approach 1

Fix the test to match actual tRPC v11 response format.

## Investigation Required

Before implementing, we need to understand the actual response format:

### Step 1: Inspect Actual Response

```bash
# Start server
npm run dev

# In another terminal, test the endpoint
curl -v http://localhost:3000/api/trpc/health

# OR use Playwright to inspect
npm run test:e2e:debug -- e2e/smoke/critical-paths.spec.ts -g "tRPC health"
# Add console.log(JSON.stringify(body, null, 2)) to see response
```

### Expected tRPC v11 Response Formats

#### Possible Format 1: Query Success (SuperJSON)

```json
{
  "result": {
    "data": {
      "json": {
        "status": "ok"
      }
    }
  }
}
```

#### Possible Format 2: Query Success (No Transformer)

```json
{
  "result": {
    "data": {
      "status": "ok"
    }
  }
}
```

#### Possible Format 3: Direct Response

```json
{
  "status": "ok"
}
```

## Implementation Plan

### Files to Modify

1. **`/e2e/smoke/critical-paths.spec.ts`** (Required)
   - Update tRPC health endpoint test (lines 36-47)
   - Add proper response format handling
   - Add debug logging if needed

### Changes Required

#### Option A: If Response is SuperJSON Format

**Current (lines 36-47)**:

```typescript
test('tRPC health endpoint is reachable', async ({ request }) => {
  const response = await request.get('/api/trpc/health');

  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  // tRPC v11 returns data directly in result.data for queries
  // Handle both possible response formats
  const status = body.result?.data?.status ?? body.result?.data?.json?.status;
  expect(status).toBe('ok');
});
```

**Updated**:

```typescript
test('tRPC health endpoint is reachable', async ({ request }) => {
  const response = await request.get('/api/trpc/health');

  expect(response.ok()).toBeTruthy();

  const body = await response.json();

  // tRPC v11 with SuperJSON transformer wraps data in json property
  // Format: { result: { data: { json: { status: "ok" } } } }
  const status = body.result?.data?.json?.status;

  expect(status).toBe('ok');
});
```

#### Option B: If Response is Plain Format

**Updated**:

```typescript
test('tRPC health endpoint is reachable', async ({ request }) => {
  const response = await request.get('/api/trpc/health');

  expect(response.ok()).toBeTruthy();

  const body = await response.json();

  // tRPC v11 query format: { result: { data: <return-value> } }
  const status = body.result?.data?.status;

  expect(status).toBe('ok');
});
```

#### Option C: Robust Format Handling (RECOMMENDED)

**Updated**:

```typescript
test('tRPC health endpoint is reachable', async ({ request }) => {
  const response = await request.get('/api/trpc/health');

  expect(response.ok()).toBeTruthy();

  const body = await response.json();

  // tRPC v11 response format varies based on transformer
  // SuperJSON: result.data.json.status
  // Plain: result.data.status
  // Fallback: direct status
  const status =
    body.result?.data?.json?.status ?? // SuperJSON format
    body.result?.data?.status ?? // Plain format
    body.status; // Direct format

  // Add debug logging if status is undefined
  if (!status) {
    console.error(
      'Unexpected tRPC response format:',
      JSON.stringify(body, null, 2)
    );
  }

  expect(status).toBe('ok');
});
```

### Investigation Script

Before making changes, run this investigation:

**Create temp test file**: `/e2e/investigate-trpc.spec.ts`

```typescript
import { test } from '@playwright/test';

test('investigate tRPC response format', async ({ request }) => {
  const response = await request.get('/api/trpc/health');

  console.log('Status:', response.status());
  console.log('OK:', response.ok());

  const body = await response.json();
  console.log('Full response:', JSON.stringify(body, null, 2));

  console.log('Checking paths:');
  console.log('  body.status:', body.status);
  console.log('  body.result:', body.result);
  console.log('  body.result?.data:', body.result?.data);
  console.log('  body.result?.data?.status:', body.result?.data?.status);
  console.log('  body.result?.data?.json:', body.result?.data?.json);
  console.log(
    '  body.result?.data?.json?.status:',
    body.result?.data?.json?.status
  );
});
```

Run with:

```bash
npm run test:e2e -- e2e/investigate-trpc.spec.ts
```

Then delete the temp file after determining the correct format.

### Verification Steps

#### Step 1: Investigation

```bash
# Run investigation test
npm run test:e2e -- e2e/investigate-trpc.spec.ts

# Review console output to determine correct format
# Delete investigation file
rm e2e/investigate-trpc.spec.ts
```

#### Step 2: Local Verification

```bash
# Run health check tests
npm run test:e2e -- e2e/smoke/critical-paths.spec.ts -g "health"

# Expected: Both health endpoint tests pass
# - "health endpoint returns ok" (REST API)
# - "tRPC health endpoint is reachable" (tRPC)
```

#### Step 3: Full Smoke Tests

```bash
# Run all smoke tests
npm run test:smoke

# Expected: All smoke tests pass
```

#### Step 4: CI Verification

```bash
# Push changes and verify in GitHub Actions
# Check that E2E smoke tests pass
```

### CI-Specific Considerations

#### tRPC Configuration

The app uses tRPC v11 with:

- SuperJSON transformer (for Date/Map/Set serialization)
- HTTP batch link
- Query and mutation procedures

#### Health Endpoint Implementation

Check `/src/server/trpc/routers/health.ts` (or similar):

```typescript
// Likely format:
export const healthRouter = createTRPCRouter({
  check: publicProcedure.query(() => {
    return { status: 'ok' };
  }),
});
```

#### Response Format Depends On

1. **Transformer**: SuperJSON wraps in `json` property
2. **Batching**: May affect response structure
3. **Procedure Type**: Query vs. mutation
4. **HTTP vs. WebSocket**: Different formats

### Expected Outcome

After this fix:

1. tRPC health check test passes
2. Test uses correct response format
3. No false positives/negatives
4. Test is resilient to minor format changes

## Testing Strategy

### Test Cases

1. **Basic Health Check**

   ```bash
   npm run test:e2e -- e2e/smoke/critical-paths.spec.ts -g "health endpoint returns ok"
   # Expected: REST API health check passes
   ```

2. **tRPC Health Check**

   ```bash
   npm run test:e2e -- e2e/smoke/critical-paths.spec.ts -g "tRPC health endpoint"
   # Expected: tRPC health check passes
   ```

3. **All Application Health Tests**
   ```bash
   npm run test:e2e -- e2e/smoke/critical-paths.spec.ts -g "Application Health"
   # Expected: All 3 health tests pass
   ```

### Manual Verification

```bash
# Start dev server
npm run dev

# Test REST endpoint
curl http://localhost:3000/api/health
# Expected: {"status":"ok"}

# Test tRPC endpoint
curl http://localhost:3000/api/trpc/health
# Expected: {"result":{"data":{...}}}
```

## Dependencies

### Blocked By

- Plan 01 (Infrastructure) - Server must start
- Plan 02 (Test Configuration) - Config must be correct

### Blocks

- None (can run in parallel with Plans 03, 05, 06)

## Success Criteria

- [ ] Actual tRPC response format identified
- [ ] Test updated to match actual format
- [ ] tRPC health check test passes
- [ ] No console errors in test output
- [ ] Test resilient to format variations
- [ ] CI smoke tests pass

## Risk Assessment

### Risk Level: LOW

Changes only test assertions, not API behavior.

### Mitigation

1. Investigate actual response format first
2. Test locally before pushing
3. Verify both success and error paths work
4. Keep fallback handling for robustness

### Impact Analysis

- **Positive**: Test accurately validates tRPC endpoint
- **Negative**: None expected
- **Neutral**: Test-only change

## Rollback Plan

If new format causes issues, revert to original:

```typescript
test('tRPC health endpoint is reachable', async ({ request }) => {
  const response = await request.get('/api/trpc/health');

  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  const status = body.result?.data?.status ?? body.result?.data?.json?.status;
  expect(status).toBe('ok');
});
```

## Additional Considerations

### tRPC Router Structure

If health router doesn't exist, may need to check:

```typescript
// Could be in main router
export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => ({ status: 'ok' })),
});
```

Or separate health router mounted at `/api/trpc/health`.

### Alternative: Use tRPC Client

Instead of raw HTTP requests, could use tRPC client:

```typescript
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@/server/trpc/root';

test('tRPC health endpoint works', async ({ page }) => {
  const client = createTRPCProxyClient<AppRouter>({
    links: [httpBatchLink({ url: 'http://localhost:3000/api/trpc' })],
  });

  const result = await client.health.check.query();
  expect(result.status).toBe('ok');
});
```

**Pros**: Type-safe, handles format automatically
**Cons**: More complex setup, requires AppRouter type

For now, stick with HTTP request approach but note this alternative.

## References

### Documentation

- [tRPC v11 Documentation](https://trpc.io/docs)
- [tRPC Response Format](https://trpc.io/docs/server/data-transformers)
- [SuperJSON Transformer](https://github.com/blitz-js/superjson)
- [Playwright Request API](https://playwright.dev/docs/api/class-apirequestcontext)

### Project Files

- `/src/server/trpc/root.ts` - Main tRPC router
- `/src/server/trpc/routers/` - Individual routers
- `/src/lib/trpc/client.ts` - Client configuration
- `/e2e/smoke/critical-paths.spec.ts` - This test file

### tRPC v11 Changes

- [Migration Guide](https://trpc.io/docs/migrate-from-v10-to-v11)
- Response format may differ from v10

---

**Last Updated**: 2025-12-12
**Status**: Ready for implementation (after investigation)
**Priority**: P2 - MEDIUM
**Estimated Time**: 15 minutes (including investigation)
**Owner**: Senior Developer
