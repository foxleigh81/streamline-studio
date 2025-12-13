# Task Briefing: 1.4 - Fix TypeScript Compilation Errors

**Task ID:** CRIT-004
**Assigned To:** Code Quality Enforcer
**Priority:** Critical
**Status:** Assigned - Awaiting Start
**Estimated Effort:** 2-3 days

---

## Mission

Resolve all 40+ TypeScript compilation errors to restore type safety, enable CI/CD pipeline success, and comply with the strict TypeScript configuration defined in `tsconfig.json`.

## Context

**Current Problem:**

Running `npx tsc --noEmit` produces 40+ errors. The codebase has `exactOptionalPropertyTypes: true` and other strict mode flags enabled, but numerous violations exist throughout the code.

**Impact:**

- Type safety compromised
- CI/CD pipeline may fail
- Developer experience degraded (invalid autocomplete, missing checks)
- Risk of runtime errors from type mismatches

**Root Cause:** Gradual accumulation of type violations, likely from rapid feature development without strict compilation checks enabled in watch mode.

## Acceptance Criteria

You must deliver ALL of the following:

- [ ] `npx tsc --noEmit` produces **zero errors**
- [ ] All `exactOptionalPropertyTypes` violations resolved
- [ ] Test infrastructure type errors fixed
- [ ] No new `any` types introduced (maintain type coverage)
- [ ] No suppression comments added (`@ts-ignore`, `@ts-expect-error`) unless absolutely necessary with documentation
- [ ] Existing functionality preserved (no behavioral changes)

## Files to Modify

The code quality report identifies these files with specific issues:

### Category Pages (State Setter Issues)

- `/Users/foxleigh81/dev/internal/streamline-studio/src/app/(app)/w/[slug]/categories/categories-page-client.tsx`
  - Lines: 80, 120, 158, 235
  - Issue: `useState<'#6B7280'>` literal type prevents string assignment

### Auth Workspace (Interface Mismatch)

- `/Users/foxleigh81/dev/internal/streamline-studio/src/lib/auth/workspace.ts`
  - Line: 51
  - Issue: `UserValidationResult` interface uses `username` but database schema has `name`

### Accessibility Contrast (Null Handling)

- `/Users/foxleigh81/dev/internal/streamline-studio/src/lib/accessibility/contrast.ts`
  - Lines: 15-17, 33
  - Issue: Regex match results not checked for null

### Video Router (Optional Property Violations)

- `/Users/foxleigh81/dev/internal/streamline-studio/src/server/trpc/routers/video.ts`
  - Lines: 115, 170, 229
  - Issue: `exactOptionalPropertyTypes` violations with `undefined`

### Test Infrastructure (Missing Transformer)

- `/Users/foxleigh81/dev/internal/streamline-studio/src/lib/trpc/__tests__/client.test.tsx`
  - Lines: 60, 73, 87+
  - Issue: `httpBatchLink` calls missing `transformer: superjson`

### Videos Page (Type Error)

- `/Users/foxleigh81/dev/internal/streamline-studio/src/app/(app)/w/[slug]/videos/page.tsx`
  - Line: 121
  - Issue: Accessing `categoryIds` property that doesn't exist on video type

## Implementation Requirements

### 1. State Setter Type Fixes

**Current (Problematic):**

```typescript
// Line 80 in categories-page-client.tsx
const [newCategoryColor, setNewCategoryColor] = useState<'#6B7280'>('#6B7280');
// Error: Type 'string' is not assignable to type SetStateAction<"#6B7280">
```

**Fix:**

```typescript
const [newCategoryColor, setNewCategoryColor] = useState<string>('#6B7280');
// Or if you want a constant:
const DEFAULT_CATEGORY_COLOR = '#6B7280';
const [newCategoryColor, setNewCategoryColor] = useState<string>(
  DEFAULT_CATEGORY_COLOR
);
```

**Apply this pattern to all four instances** in categories-page-client.tsx.

### 2. Interface Property Fix

**Current (Problematic):**

```typescript
// src/lib/auth/workspace.ts:51
interface UserValidationResult {
  username: string; // Database schema uses 'name', not 'username'
}
```

**Fix:**

```typescript
interface UserValidationResult {
  name: string; // Match database schema
}
```

**Important:** Check all usages of this interface to ensure they're updated.

### 3. Regex Null Checks

**Current (Problematic):**

```typescript
// src/lib/accessibility/contrast.ts
const rgb = hexToRgb(color);
const [r, g, b] = rgb.match(/\d+/g); // Possibly null
```

**Fix:**

```typescript
const match = rgb.match(/\d+/g);
if (!match || match.length < 3) {
  throw new Error(`Invalid RGB format: ${rgb}`);
}
const [r, g, b] = match;
```

### 4. Optional Property Handling

**Current (Problematic):**

```typescript
// Passing undefined to optional properties with exactOptionalPropertyTypes
someFunction({
  requiredProp: value,
  optionalProp: undefined, // ❌ With exactOptionalPropertyTypes: true
});
```

**Fix Option A (Omit property):**

```typescript
const config = {
  requiredProp: value,
  ...(optionalValue !== undefined && { optionalProp: optionalValue }),
};
```

**Fix Option B (Conditional object):**

```typescript
const config: ConfigType = {
  requiredProp: value,
};
if (optionalValue !== undefined) {
  config.optionalProp = optionalValue;
}
```

### 5. Test Infrastructure Transformer

**Current (Problematic):**

```typescript
// src/lib/trpc/__tests__/client.test.tsx
const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
      // Missing transformer
    }),
  ],
});
```

**Fix:**

```typescript
const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
      transformer: superjson, // Add this
    }),
  ],
});
```

### 6. Videos Page Type Error

**Investigation needed:**

```typescript
// Line 121 - accessing categoryIds that doesn't exist
// Need to check the tRPC query return type and fix accordingly
```

**Approach:**

1. Check the `video.list` tRPC endpoint return type
2. Verify if `categoryIds` should be included in the query
3. Either add missing property or remove invalid access

## Testing Requirements

After each file fix:

1. **Run TypeScript compiler:**

   ```bash
   npx tsc --noEmit
   ```

2. **Verify error count decreases:**
   - Track errors remaining after each fix
   - Goal: Zero errors

3. **Run existing tests:**

   ```bash
   npm test
   ```

4. **Check for regressions:**
   - Ensure existing functionality still works
   - No new runtime errors introduced

## Strategy: Incremental Approach

**Do NOT attempt to fix all 40+ errors at once.** Follow this sequence:

1. **Phase A: Easy wins (30 mins)**
   - Fix useState literal types in categories-page-client.tsx (4 instances)
   - Expected: ~4-8 errors resolved

2. **Phase B: Interface fixes (1 hour)**
   - Fix UserValidationResult interface
   - Update all usages
   - Expected: ~5-10 errors resolved

3. **Phase C: Null safety (1 hour)**
   - Add null checks to regex matches
   - Expected: ~3-5 errors resolved

4. **Phase D: Test infrastructure (1 hour)**
   - Add transformer to all test httpBatchLink calls
   - Expected: ~10-15 errors resolved

5. **Phase E: Optional properties (2-3 hours)**
   - Fix exactOptionalPropertyTypes violations in video.ts
   - Expected: ~5-10 errors resolved

6. **Phase F: Investigation (2-4 hours)**
   - Fix videos page categoryIds issue
   - Handle any remaining errors
   - Expected: All remaining errors resolved

## Edge Cases and Considerations

### Don't Sacrifice Type Safety

- **Avoid `any` types** - defeats the purpose
- **Avoid `as` assertions** unless truly necessary (document why)
- **Avoid disabling checks** - fix the root cause

### Preserve Existing Behavior

- These are TYPE fixes, not logic changes
- If a fix changes behavior, escalate immediately
- Add tests if fixing reveals missing test coverage

### Handle Generated Code

- If errors come from generated code (Prisma, tRPC), may need to:
  - Regenerate types (`npm run db:generate`)
  - Update generator configuration
  - Wrap with proper types

## Dependencies

- **Depends On:** None (fully independent task)
- **Blocks:** CI/CD pipeline success
- **May Interact With:** Task 1.1 (if error boundary files have type issues)

## Reference Materials

- TypeScript config: `/Users/foxleigh81/dev/internal/streamline-studio/tsconfig.json`
- Code Quality Report: `/Users/foxleigh81/dev/internal/streamline-studio/code-review/code-quality-report.md`
- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/
- exactOptionalPropertyTypes: https://www.typescriptlang.org/tsconfig#exactOptionalPropertyTypes

## Escalation Protocol

**Escalate to Project Orchestrator immediately if:**

- A fix would change application behavior
- Unclear whether to add missing property or remove invalid access
- Type errors reveal deeper architectural issues
- Fixes introduce breaking changes
- Stuck on a particular error for >30 minutes
- Error count increases instead of decreases

**Do NOT introduce `any` types or suppression comments without approval.**

## Definition of Done

Task is complete when:

1. `npx tsc --noEmit` produces **zero errors**
2. `npm test` passes without new failures
3. No new `any` types introduced
4. No suppression comments added (or documented if absolutely necessary)
5. All files compile successfully
6. Manual spot-check confirms no behavioral changes
7. Commit message documents error categories fixed
8. Task status updated in phase-1-status.md
9. Completion summary with error reduction metrics provided to Project Orchestrator

## Progress Tracking Template

Use this format when reporting progress:

```markdown
## TypeScript Fix Progress

**Total Errors at Start:** [Run initial tsc to get baseline]

### Phase A: useState Literal Types

- Errors before: X
- Errors after: Y
- Errors resolved: Z

### Phase B: Interface Fixes

- Errors before: X
- Errors after: Y
- Errors resolved: Z

[Continue for each phase...]

**Total Errors Remaining:** 0 ✅
```

---

**Assigned:** December 10, 2025
**Expected Completion:** Within 2-3 days of start
**Status:** Ready to begin
