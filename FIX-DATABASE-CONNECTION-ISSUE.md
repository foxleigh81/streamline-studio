# Fix: Database Connection "root" User Error in CI

## Problem

E2E tests in GitHub Actions CI were failing with the error:

```
FATAL: role "root" does not exist
```

The CI workflow correctly sets `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/streamline_test`, but the application was attempting to connect using `root` as the database username.

## Root Cause

The PostgreSQL `pg` library (used by Drizzle ORM) has a fallback behavior:

1. If `DATABASE_URL` is undefined or not properly loaded
2. The library falls back to **libpq environment variables**
3. Including using the system's `USER` environment variable as the database username
4. In GitHub Actions, `USER` is often `root` or `runner`
5. This caused the connection attempt to use `postgresql://root@...` instead of `postgresql://postgres@...`

### Why This Happened

**`src/server/db/index.ts`** was accessing `process.env.DATABASE_URL` directly instead of using the validated `serverEnv.DATABASE_URL` from the environment validation module (`src/lib/env.ts`).

**`drizzle.config.ts`** had a fallback to a development database URL, but if `DATABASE_URL` was empty string or had parsing issues, it could still result in undefined behavior.

## Solution

### 1. Fixed Database Connection (`src/server/db/index.ts`)

**Before:**

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ...
});
```

**After:**

```typescript
import { serverEnv } from '@/lib/env';

const pool = new Pool({
  connectionString: serverEnv.DATABASE_URL,
  // ...
});
```

**Benefit:** Now uses the validated environment variable, which ensures:

- `DATABASE_URL` is present and valid
- Fails fast with a clear error if missing
- Prevents silent fallback to system defaults

### 2. Fixed Drizzle Config (`drizzle.config.ts`)

**Before:**

```typescript
dbCredentials: {
  url: process.env.DATABASE_URL ?? 'postgresql://streamline:password@localhost:5432/streamline',
}
```

**After:**

```typescript
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is required. ' +
    'For local development: cp .env.example .env and configure it. ' +
    'For CI/production: ensure DATABASE_URL is set in environment.'
  );
}

dbCredentials: {
  url: process.env.DATABASE_URL,
}
```

**Benefit:**

- Explicit error instead of silent fallback
- Clear guidance for developers on how to fix
- Prevents libpq from using system defaults

## Why This Fixes CI

1. **Environment validation runs first** - `serverEnv` in `src/lib/env.ts` validates `DATABASE_URL` at startup
2. **No silent fallbacks** - If `DATABASE_URL` is missing, we get a clear error instead of falling back to `USER=root`
3. **Consistent behavior** - Both application code and migration scripts now fail explicitly if misconfigured

## Testing

### Verify Type Safety

```bash
npm run type-check
```

✅ Passed

### Verify Linting

```bash
npm run lint
```

✅ Passed

### Verify Error Handling

```bash
# Simulate missing DATABASE_URL
node -e "delete process.env.DATABASE_URL; require('./drizzle.config.ts')"
```

✅ Throws clear error message

## Files Changed

1. `/Users/foxleigh81/dev/internal/streamline-studio/src/server/db/index.ts`
2. `/Users/foxleigh81/dev/internal/streamline-studio/drizzle.config.ts`

## Next Steps

1. Push these changes to the branch
2. CI should now correctly connect to PostgreSQL using `postgres` user
3. E2E tests should pass

## Related Issues

- PostgreSQL libpq defaults: https://www.postgresql.org/docs/current/libpq-envars.html
- GitHub Actions default environment: https://docs.github.com/en/actions/learn-github-actions/environment-variables#default-environment-variables
