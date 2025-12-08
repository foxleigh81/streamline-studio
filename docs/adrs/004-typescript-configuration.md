# ADR-004: TypeScript Configuration

**Status**: Accepted
**Date**: 2025-12-08
**Deciders**: Strategic Project Planner, Lead Developer, QA Architect

## Context

Streamline Studio is a full-stack TypeScript application using:

- **Next.js 14+** with App Router
- **Drizzle ORM** for database operations
- **tRPC** for type-safe API layer
- **Lucia Auth** for authentication
- **React 18** with Server Components

TypeScript configuration directly impacts:

1. **Type safety**: Catching bugs at compile time vs runtime
2. **Developer experience**: Editor support, autocomplete, refactoring
3. **Interoperability**: Compatibility between libraries
4. **Build performance**: Compilation speed
5. **Runtime behaviour**: Generated JavaScript output

The configuration must balance strictness (catching bugs) with pragmatism (not fighting the type system constantly).

## Decision

### Enable Strict Mode

Use **TypeScript strict mode** with all strict flags enabled.

### Key Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Path Aliases

Use `@/` prefix for absolute imports from `src/` directory.

### Additional Strictness

Enable `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` for extra safety beyond the `strict` flag.

## Consequences

### Positive

- **Compile-time safety**: Catches null/undefined errors, type mismatches before runtime
- **Self-documenting code**: Types serve as documentation
- **Refactoring confidence**: IDE-assisted refactoring is reliable
- **tRPC synergy**: End-to-end type safety from database to UI
- **Drizzle synergy**: Type-safe queries with inferred types
- **Team consistency**: Same rules for all developers

### Negative

- **Initial friction**: More type annotations required
- **Third-party types**: Some libraries have incomplete types
- **Learning curve**: Stricter rules require TypeScript proficiency
- **Verbose in places**: Some patterns require more type gymnastics
- **Build time**: Strict checking adds compilation time

## Alternatives Considered

### Strict Mode Off (Default TypeScript)

**Pros:**

- Faster onboarding
- Less type annotations needed
- More forgiving with third-party libraries

**Cons:**

- Misses entire categories of bugs (null checks, implicit any)
- No value from TypeScript's main selling point
- Technical debt accumulates
- Inconsistent code quality

### Partial Strictness (Cherry-Pick Flags)

**Pros:**

- Customise to specific needs
- Gradual adoption path

**Cons:**

- Confusing which rules apply
- Missing interactions between flags
- Need to revisit configuration over time
- Partial safety is false confidence

### Very Strict (Additional Lint Rules)

**Pros:**

- Maximum type safety
- Catches more edge cases

**Cons:**

- Diminishing returns
- Fighting the type system
- Slower development
- Some rules are controversial

## Discussion

### Strategic Project Planner

"TypeScript configuration seems straightforward - enable strict mode and move on. But I want to explore the nuances, especially around:

1. **noUncheckedIndexedAccess**: Array/object indexing returns `T | undefined`
2. **exactOptionalPropertyTypes**: `{ foo?: string }` means `string | undefined`, not `string | undefined | null`
3. **Path aliases**: `@/components` vs `../../components`

These have real impact on daily development."

### Lead Developer

"Let me break down the key strict flags and why each matters for Streamline Studio:

**1. strict: true** (umbrella flag)
Enables:

- `noImplicitAny`: No implicit `any` types
- `strictNullChecks`: `null` and `undefined` are distinct types
- `strictFunctionTypes`: Contravariant function parameter checks
- `strictBindCallApply`: Type-check `bind`, `call`, `apply`
- `strictPropertyInitialization`: Class properties must be initialized
- `alwaysStrict`: Emit 'use strict' in JavaScript
- `useUnknownInCatchVariables`: `catch (e)` is `unknown`, not `any`

For our stack, `strictNullChecks` is critical. With Drizzle:

```typescript
// Without strictNullChecks
const user = await db.query.users.findFirst({ where: eq(users.id, id) });
user.email; // No error, but user could be undefined!

// With strictNullChecks
const user = await db.query.users.findFirst({ where: eq(users.id, id) });
user.email; // Error: 'user' is possibly 'undefined'

// Correct
if (user) {
  user.email; // Safe
}
```

**2. noUncheckedIndexedAccess: true**
This is beyond the `strict` flag but valuable:

```typescript
const videos = ['a', 'b', 'c'];

// Without noUncheckedIndexedAccess
videos[0]; // type: string
videos[5]; // type: string (but actually undefined!)

// With noUncheckedIndexedAccess
videos[0]; // type: string | undefined
videos[5]; // type: string | undefined

// Correct usage
const first = videos[0];
if (first) {
  console.log(first.toUpperCase()); // Safe
}
```

This catches out-of-bounds array access and object property access with dynamic keys.

**3. exactOptionalPropertyTypes: true**
Distinguishes between 'not present' and 'present but undefined':

```typescript
interface UpdateVideo {
  title?: string;
  description?: string;
}

// Without exactOptionalPropertyTypes
const update: UpdateVideo = { title: undefined }; // OK

// With exactOptionalPropertyTypes
const update: UpdateVideo = { title: undefined }; // Error!
const update: UpdateVideo = {}; // OK (title not present)
const update: UpdateVideo = { title: 'New Title' }; // OK
```

This matters for PATCH operations where we distinguish 'don't update this field' from 'set this field to null'."

### QA Architect

"What about `noImplicitReturns`? I've seen codebases where functions sometimes return undefined by falling through."

### Lead Developer (Response)

"Good catch. `noImplicitReturns` prevents:

```typescript
function getStatusLabel(status: string): string {
  if (status === 'idea') return 'Idea';
  if (status === 'scripting') return 'Scripting';
  // Missing return for other cases!
}

// With noImplicitReturns: Error - not all code paths return a value

// Correct
function getStatusLabel(status: string): string {
  if (status === 'idea') return 'Idea';
  if (status === 'scripting') return 'Scripting';
  return 'Unknown';
}
```

Similarly, `noFallthroughCasesInSwitch` prevents:

````typescript
switch (status) {
  case 'idea':
    doIdeaThing();
  // Oops, forgot break! Falls through to scripting
  case 'scripting':
    doScriptingThing();
    break;
}

// With noFallthroughCasesInSwitch: Error
```"

### Strategic Project Planner

"What about path aliases? I've seen projects with `@/`, `~/`, `@components/`, etc."

### Lead Developer (Response)

"Path aliases improve import ergonomics:

```typescript
// Without alias (relative imports)
import { Button } from '../../../../components/ui/button';
import { VideoCard } from '../../../features/video-card';

// With @/ alias (absolute imports)
import { Button } from '@/components/ui/button';
import { VideoCard } from '@/components/features/video-card';
````

I recommend a single `@/` alias pointing to `src/`:

```json
// tsconfig.json
{
  \"compilerOptions\": {
    \"baseUrl\": \".\",
    \"paths\": {
      \"@/*\": [\"./src/*\"]
    }
  }
}
```

Why single alias:

- Simple mental model
- Works with Next.js out of the box
- Consistent across the codebase
- IDE support is universal

Next.js automatically reads tsconfig.json paths, so no additional configuration needed."

### QA Architect

"What about Drizzle and tRPC? Any specific TypeScript considerations?"

### Lead Developer (Response)

"Both work excellently with strict TypeScript:

**Drizzle:**
Schema types are inferred automatically:

```typescript
// db/schema.ts
export const videos = pgTable('videos', {
  id: uuid('id').primaryKey(),
  title: text('title').notNull(),
  status: text('status').notNull().default('idea'),
  dueDate: timestamp('due_date'),
});

// Type is inferred
type Video = typeof videos.$inferSelect;
// { id: string; title: string; status: string; dueDate: Date | null }

type NewVideo = typeof videos.$inferInsert;
// { id?: string; title: string; status?: string; dueDate?: Date | null }
```

**tRPC:**
End-to-end type inference:

```typescript
// server/trpc/routers/video.ts
export const videoRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.videos.findMany({
        where: input.status ? eq(videos.status, input.status) : undefined,
      });
    }),
});

// client - types are inferred from server
const { data } = trpc.video.list.useQuery({ status: 'scripting' });
// data type: Video[] | undefined
```

The strict configuration ensures we handle the `undefined` case in the client."

### Strategic Project Planner

"What about the target and module settings?"

### Lead Developer (Response)

"Next.js manages these, but let me explain:

```json
{
  \"compilerOptions\": {
    \"target\": \"ES2017\",
    \"lib\": [\"dom\", \"dom.iterable\", \"esnext\"],
    \"module\": \"esnext\",
    \"moduleResolution\": \"bundler\",
    \"jsx\": \"preserve\"
  }
}
```

- **target**: ES2017 is safe for all modern browsers. Next.js transpiles further as needed.
- **module**: ESNext for modern module syntax
- **moduleResolution**: 'bundler' is the new recommended setting for bundled apps (Next.js 14+)
- **jsx**: 'preserve' because Next.js handles JSX transformation

The Next.js defaults are sensible. We mostly add strict flags on top."

### QA Architect

"Any performance concerns with strict checking?"

### Lead Developer (Response)

"Type checking does add time, but it's manageable:

1. **Incremental builds**: TypeScript caches type info. Second build is fast.
2. **IDE type checking**: VS Code runs TypeScript server in background.
3. **CI optimization**: Can split type-check and build steps.

```json
{
  \"scripts\": {
    \"type-check\": \"tsc --noEmit\",
    \"build\": \"next build\"
  }
}
```

For a project our size (estimated 200-500 TypeScript files at maturity), build times should be under 30 seconds. The bug-catching value far exceeds the time cost."

### Strategic Project Planner (Conclusion)

"Decision: Enable strict mode with additional safety flags.

Rationale:

1. Strict mode catches bugs that would otherwise be runtime errors
2. Drizzle + tRPC provide excellent type inference - strict mode maximizes the value
3. Modern TypeScript DX (IDE support, refactoring) works best with strict mode
4. `noUncheckedIndexedAccess` catches array/object access bugs
5. `exactOptionalPropertyTypes` improves API design clarity

The main cost is initial learning curve for developers less familiar with strict TypeScript. This is an acceptable trade-off for long-term code quality."

## Implementation Notes

### tsconfig.json

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    // Type Checking
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true,

    // Modules
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,

    // Emit
    "noEmit": true,
    "declaration": false,
    "declarationMap": false,

    // JavaScript Support
    "allowJs": true,
    "checkJs": false,

    // Interop
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,

    // React / Next.js
    "jsx": "preserve",

    // Path Aliases
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },

    // Incremental
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo",

    // Plugins
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", ".next", "out", "dist", "storybook-static"]
}
```

### Explanation of Key Settings

| Setting                            | Value     | Rationale                                               |
| ---------------------------------- | --------- | ------------------------------------------------------- |
| `strict`                           | `true`    | Enables all strict type-checking options                |
| `noUncheckedIndexedAccess`         | `true`    | Array/object indexing returns `T \| undefined`          |
| `exactOptionalPropertyTypes`       | `true`    | Distinguishes missing vs undefined properties           |
| `noImplicitReturns`                | `true`    | All code paths must return a value                      |
| `noFallthroughCasesInSwitch`       | `true`    | Requires break/return in switch cases                   |
| `noImplicitOverride`               | `true`    | Requires `override` keyword for overridden methods      |
| `forceConsistentCasingInFileNames` | `true`    | Prevents case-sensitivity issues across OS              |
| `moduleResolution`                 | `bundler` | Modern resolution for bundled applications              |
| `skipLibCheck`                     | `true`    | Skip type checking of declaration files (faster builds) |
| `isolatedModules`                  | `true`    | Required for Next.js/Babel compatibility                |
| `incremental`                      | `true`    | Cache type info for faster rebuilds                     |

### Type Utilities

Create a `src/types/` directory for shared types:

```typescript
// src/types/utils.ts

/**
 * Make specified keys required
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make all properties optional except specified keys
 */
export type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> &
  Pick<T, K>;

/**
 * Extract the resolved type from a Promise
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Non-nullable version of a type
 */
export type NonNullable<T> = T extends null | undefined ? never : T;
```

### Common Type Patterns

```typescript
// Drizzle inferred types
import { videos } from '@/db/schema';

export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;
export type VideoUpdate = Partial<NewVideo>;

// tRPC router input/output types
import { AppRouter } from '@/server/trpc/router';
import { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

type RouterInput = inferRouterInputs<AppRouter>;
type RouterOutput = inferRouterOutputs<AppRouter>;

export type VideoListInput = RouterInput['video']['list'];
export type VideoListOutput = RouterOutput['video']['list'];
```

### ESLint TypeScript Rules

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    // Enforce consistent type imports
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports' },
    ],
    // Prevent unused variables (except prefixed with _)
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    // Prevent explicit any
    '@typescript-eslint/no-explicit-any': 'error',
    // Require explicit return types on exported functions
    '@typescript-eslint/explicit-module-boundary-types': 'off', // Inferred types are fine
  },
};
```

### VS Code Settings

```json
// .vscode/settings.json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "non-relative"
}
```

### Type Checking Scripts

```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "type-check:watch": "tsc --noEmit --watch",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix"
  }
}
```

### CI Type Checking

```yaml
# .github/workflows/ci.yml
jobs:
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run type-check
```
