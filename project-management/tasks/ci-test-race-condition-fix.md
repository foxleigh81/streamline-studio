# CI Test Failures Fix - Database Race Conditions

## Status: FIXED - Ready for CI Verification

## Problem Analysis

The CI test stage was failing with 18 test failures across 5 test files:

1. `src/lib/auth/__tests__/session.test.ts` - 4 failures
2. `src/server/repositories/__tests__/category-operations.test.ts` - 4 failures
3. `src/server/repositories/__tests__/document-operations.test.ts` - 7 failures
4. `src/server/repositories/__tests__/video-operations.test.ts` - 2 failures
5. `src/server/trpc/routers/__tests__/auth.test.ts` - 1 failure

### Error Pattern

All failures showed the same pattern - foreign key constraint violations:

```
error: insert or update on table "sessions" violates foreign key constraint "sessions_user_id_users_id_fk"
error: insert or update on table "categories" violates foreign key constraint "categories_workspace_id_workspaces_id_fk"
error: insert or update on table "videos" violates foreign key constraint "videos_workspace_id_workspaces_id_fk"
```

### Root Cause

**Database race condition from parallel test execution:**

1. Vitest was configured with `singleThread: false` (default)
2. Multiple test files ran in parallel across different worker threads
3. All test files share a single PostgreSQL test database (`streamline_test`)
4. Each test file calls `resetTestDatabase()` in `beforeEach` which executes:
   ```sql
   TRUNCATE TABLE ... CASCADE
   ```
5. **Race condition scenario:**
   - Thread A: Creates workspace in beforeEach
   - Thread B: Calls resetTestDatabase() → TRUNCATES all tables
   - Thread A: Tries to create category with workspace_id → FK constraint violation (workspace no longer exists)

### Why This Wasn't Caught Locally

- Local test runs often have the database unavailable, so tests skip gracefully
- The race condition only manifests when multiple test files run simultaneously with a live database
- CI environment always has the database running and runs all tests in parallel

## Solution Implemented

### File Changed: `vitest.config.ts`

```typescript
poolOptions: {
  threads: {
    singleThread: true,  // Changed from: false
    isolate: true,
  },
},
```

### What This Does

- Forces Vitest to run all tests sequentially in a single worker thread
- Prevents race conditions by ensuring only one test file accesses the database at a time
- Each test file can safely call `resetTestDatabase()` without interfering with others

### Tradeoffs

**Pros:**

- Simple one-line configuration change
- Guarantees test reliability and deterministic behavior
- No test refactoring required

**Cons:**

- Slower test execution (tests run sequentially instead of in parallel)
- For current test suite (~350 tests), this is acceptable
- May need optimization if test suite grows significantly

## Alternative Solutions Considered

### 1. Separate Test Database Per Worker

- Use `DATABASE_URL_${WORKER_ID}` pattern
- Create multiple test databases
- **Rejected:** Complex setup, requires database provisioning changes

### 2. Transaction Rollbacks Instead of TRUNCATE

- Wrap each test in a transaction, rollback after
- **Rejected:** Requires significant test refactoring, incompatible with some tests

### 3. Pool Match Globs for Specific Files

- Run only database tests sequentially, keep others parallel
- **Rejected:** Vitest 2.x poolMatchGlobs doesn't support per-file pool options

## Verification Plan

The fix will be verified in CI when pushed:

1. Push this branch to GitHub
2. Wait for CI test stage to run
3. Verify all 18 previously failing tests now pass
4. Check test execution time to ensure it's acceptable

## Expected Results

- All 18 FK constraint violation errors should be resolved
- Test suite should pass with 0 failures
- Test execution time will increase (acceptable tradeoff)

## Future Optimization

If test execution time becomes a bottleneck as the test suite grows:

1. **Option A:** Implement transaction-based test isolation
   - Each test runs in a transaction
   - Rollback instead of TRUNCATE
   - Allows parallel execution safely

2. **Option B:** Separate test databases per worker
   - Use connection pooling with worker-specific DBs
   - More complex but maintains parallel execution

3. **Option C:** Split integration vs unit tests
   - Run only integration tests sequentially
   - Keep unit tests parallel
   - Requires test categorization

## Documentation

This fix addresses the testing strategy outlined in:

- `/docs/adrs/005-testing-strategy.md` - Testing approach
- Test helper at `/src/test/helpers/database.ts` - resetTestDatabase() function

The fix maintains the existing test isolation strategy while preventing race conditions.
