# CLAUDE.md - AI Assistant Context for Streamline Studio

> **IMPORTANT**: For any request which requires code editing or updating plans or documents, immediately delegate to the `project-orchestrator` agent using the Task tool. The orchestrator coordinates all work across specialized agents and maintains project tracking.

## Project Overview

**Streamline Studio** is a self-hosted video script management platform built with Next.js 15, designed for content creators to draft, organize, and manage video scripts with Markdown support.

## Pre-Release Status

> **IMPORTANT**: This project is in pre-release (version < 1.0.0). Until `package.json` version reaches 1.0.0:
>
> - **No backwards compatibility required** - breaking changes are acceptable
> - **No migration paths needed** - can make clean breaks
> - **No redirect middleware** - old routes can simply be removed
> - Focus on getting the architecture right, not preserving old patterns

## Critical: Agent Workflow

### Always Use the Project Orchestrator

For any task beyond simple questions:

```
Use Task tool with subagent_type="project-orchestrator"
```

The orchestrator will:

1. Break down complex tasks into manageable steps
2. Assign work to specialized agents (senior-nextjs-developer, nextjs-security-architect, code-quality-enforcer, tron-user-advocate, qa-architect)
3. Coordinate reviews and approvals
4. Track progress in `/project-management/`
5. Only escalate to the user when genuine decisions are needed

### Available Specialized Agents

| Agent                       | Use For                                            |
| --------------------------- | -------------------------------------------------- |
| `project-orchestrator`      | All coordination, task breakdown, multi-step work  |
| `senior-nextjs-developer`   | Complex implementations, architecture, refactoring |
| `nextjs-security-architect` | Security reviews, auth flows, vulnerability fixes  |
| `code-quality-enforcer`     | Code review, standards enforcement, quality checks |
| `qa-architect`              | Testing strategy, coverage, quality assessment     |
| `tron-user-advocate`        | UX review, accessibility, user experience          |
| `strategic-project-planner` | Planning, roadmapping, feature breakdown           |
| `lead-developer-reviewer`   | Complex bugs, architectural issues, escalations    |

## Project Documentation

### Must-Read Files

| File                       | Purpose                                        |
| -------------------------- | ---------------------------------------------- |
| `/README.md`               | Project overview, quick start, tech stack      |
| `/CONTRIBUTING.md`         | Development workflow, code standards, testing  |
| `/SECURITY.md`             | Security architecture, vulnerability reporting |
| `/DOCKER.md`               | Production deployment guide                    |
| `/docs/getting-started.md` | Development setup                              |

### Architecture Decision Records (ADRs)

Located in `/docs/adrs/` - **Read these before making architectural changes**:

- **ADR-001**: Next.js Framework Selection
- **ADR-002**: CSS Modules Styling (no Tailwind)
- **ADR-003**: Storybook Integration
- **ADR-004**: TypeScript Strict Mode (mandatory)
- **ADR-005**: Testing Strategy (target: 80% coverage)
- **ADR-006**: Drizzle ORM Selection
- **ADR-007**: API and Authentication (tRPC + Lucia)
- **ADR-008**: Multi-Tenancy (WorkspaceRepository pattern) - **CRITICAL**
- **ADR-009**: Versioning and Audit Logging
- **ADR-014**: Security Architecture

### Code Review Reports

Located in `/code-review/` - Reference for understanding codebase health:

- `overall-recommendations.md` - Consolidated findings
- `lead-developer-report.md` - Code health assessment
- `security-architect-report.md` - Security posture
- `qa-architect-report.md` - Quality & testing

### Project Management

Located in `/project-management/`:

- `README.md` - Current project status
- `FINAL-PROJECT-SUMMARY.md` - Complete remediation report
- `tasks/` - Phase completion summaries
- `decisions/` - Strategic decisions with rationale

## Code Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/             # Authenticated routes (workspaces)
│   ├── (auth)/            # Auth pages (login, register, invite)
│   ├── setup/             # Initial setup wizard
│   └── api/               # API routes (tRPC, health)
├── components/            # React components
│   ├── ui/               # Base UI (Button, Input, etc.)
│   ├── document/         # Document/editor components
│   ├── video/            # Video-related components
│   ├── error-boundary/   # Error boundaries
│   └── providers/        # Context providers
├── lib/                   # Shared utilities
│   ├── auth/             # Authentication utilities
│   ├── workspace/        # Workspace context
│   ├── trpc/             # tRPC client
│   ├── constants/        # Shared constants
│   ├── schemas/          # Zod validation schemas
│   └── logger.ts         # Pino structured logging
├── server/               # Server-side code
│   ├── db/              # Database schema & connection
│   ├── trpc/            # tRPC routers & middleware
│   └── repositories/    # WorkspaceRepository (data access)
├── test/                 # Test utilities
└── themes/               # CSS theme system
```

## Critical Patterns & Rules

### 1. Multi-Tenancy: WorkspaceRepository Pattern (ADR-008)

**NEVER** query the database directly for workspace-scoped data. Always use `WorkspaceRepository`:

```typescript
// WRONG - Direct Drizzle query
const videos = await db.select().from(videos).where(eq(videos.workspaceId, id));

// CORRECT - Use WorkspaceRepository
const repo = new WorkspaceRepository(db, workspaceId);
const videos = await repo.getVideos();
```

ESLint enforces this rule - direct Drizzle queries outside repositories will fail CI.

### 2. TypeScript Strict Mode (ADR-004)

- `strict: true` is mandatory
- `noUncheckedIndexedAccess: true` - always handle undefined
- No `any` types without explicit `eslint-disable` comment with justification

### 3. Styling: CSS Modules + SCSS (ADR-002)

- **NO Tailwind CSS** - use CSS Modules (`.module.scss`)
- Theme variables in `/src/themes/default/`
- Use existing SCSS variables, don't invent new ones. Before writing ANY SCSS check the theme files first to see what variables, mixins and functions are available.

### 4. Component Architecture

- **Components** (`/src/components/`): Pure, receive data via props
- **Partials** (in route folders): Can access context/global state
- **Error Boundaries**: Every major route has an `error.tsx`
- **Loading States**: Every major route has a `loading.tsx`

### 5. API Pattern: tRPC (ADR-007)

```typescript
// Router definition
export const videoRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const repo = new WorkspaceRepository(ctx.db, ctx.workspace.id);
    return repo.getVideos();
  }),
});
```

### 6. Authentication: Lucia Auth (ADR-007)

- Argon2id password hashing (OWASP parameters)
- HTTP-only, Secure, SameSite=Lax cookies
- Session validation via middleware
- Rate limiting on auth endpoints

### 7. Logging: Pino (No Console)

```typescript
// WRONG
console.log('User logged in');

// CORRECT
import { logger } from '@/lib/logger';
logger.info({ userId }, 'User logged in');
```

### 8. Accessibility (WCAG 2.1 AA)

- All interactive elements must be keyboard accessible
- Use semantic HTML and ARIA attributes
- Test with axe-core (Storybook addon, Playwright tests)
- Focus management for modals and dialogs

## Common Commands

```bash
# Development
npm run dev              # Start dev server (port 3000)
npm run storybook        # Component development (port 6006)

# Testing
npm test                 # Unit tests (watch mode)
npm run test:coverage    # Unit tests with coverage
npm run test:e2e         # Playwright E2E tests
npm run test:storybook   # Storybook interaction tests

# Code Quality
npm run lint             # ESLint check
npm run lint:fix         # Fix linting issues
npm run format:check     # Prettier check
npm run type-check       # TypeScript check

# Database
npm run db:generate      # Generate migration from schema changes
npm run db:migrate       # Run pending migrations
npm run db:push          # Push schema directly (dev only)
npm run db:studio        # Open Drizzle Studio GUI

# Build
npm run build            # Production build
npm run build-storybook  # Static Storybook build
```

## Environment Variables

**Required:**

- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - 32+ character encryption key

**Optional:**

- `MODE` - `single-tenant` (default) or `multi-tenant`
- `REDIS_URL` - For production rate limiting
- `TRUSTED_PROXY` - Set `true` behind reverse proxy

See `.env.example` for complete documentation.

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`):

1. **lint** - ESLint, Prettier, TypeScript check
2. **test** - Unit tests with coverage (PostgreSQL service)
3. **storybook** - Build + interaction tests
4. **e2e** - Playwright tests (PostgreSQL service)
5. **security** - npm audit, secret scanning
6. **build** - Next.js production build

All jobs must pass for PR merge.

## Testing Strategy (ADR-005)

| Type          | Tool       | Location               | Coverage Target |
| ------------- | ---------- | ---------------------- | --------------- |
| Unit          | Vitest     | `*.test.ts(x)`         | 80%             |
| Component     | Storybook  | `*.stories.tsx`        | All components  |
| E2E           | Playwright | `/e2e/`                | Critical paths  |
| Accessibility | axe-core   | Storybook + Playwright | WCAG 2.1 AA     |

## Security Considerations (ADR-014)

- **XSS Prevention**: DOMPurify for all user content
- **SQL Injection**: Parameterized queries via Drizzle
- **CSRF**: Origin header verification
- **Rate Limiting**: Redis-backed (in-memory fallback for dev)
- **Headers**: CSP, HSTS, X-Frame-Options configured in next.config.ts

## When Making Changes

1. **Check ADRs** - Ensure changes align with architectural decisions
2. **Use Orchestrator** - For anything beyond trivial fixes
3. **Follow Patterns** - WorkspaceRepository, tRPC routers, CSS Modules
4. **Add Tests** - Unit tests for logic, Storybook for components
5. **Update Docs** - If changing public APIs or behavior
6. **Run CI Locally** - `npm run lint && npm run type-check && npm test`

## Quick Reference: File Locations

| What                | Where                                              |
| ------------------- | -------------------------------------------------- |
| Database schema     | `/src/server/db/schema.ts`                         |
| tRPC routers        | `/src/server/trpc/routers/`                        |
| WorkspaceRepository | `/src/server/repositories/workspace-repository.ts` |
| Auth utilities      | `/src/lib/auth/`                                   |
| Shared constants    | `/src/lib/constants/`                              |
| Theme variables     | `/src/themes/default/`                             |
| Test helpers        | `/src/test/helpers/`                               |
| E2E tests           | `/e2e/`                                            |
| Storybook config    | `/.storybook/`                                     |
| CI workflow         | `/.github/workflows/ci.yml`                        |
