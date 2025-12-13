# Contributing to Streamline Studio

Thank you for your interest in contributing to Streamline Studio! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Commit Messages](#commit-messages)
- [Pull Requests](#pull-requests)
- [Architecture Decisions](#architecture-decisions)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and professional in all interactions.

## Getting Started

### Prerequisites

- **Node.js**: 20.x or later
- **PostgreSQL**: 16.x or later
- **Redis**: 7.x or later (optional, for production-like rate limiting)
- **pnpm/npm/yarn**: Latest version
- **Docker** (optional, for containerized PostgreSQL/Redis)

### Initial Setup

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/your-username/streamline-studio.git
   cd streamline-studio
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Generate required secrets:

   ```bash
   # Generate SESSION_SECRET (32+ characters)
   openssl rand -hex 32

   # Or use Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Update `.env.local` with:

   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/streamline_dev
   SESSION_SECRET=<your-generated-secret>
   NODE_ENV=development

   # Optional: Redis for rate limiting
   # REDIS_URL=redis://localhost:6379
   ```

4. **Start PostgreSQL** (if using Docker)

   ```bash
   docker run -d \
     --name streamline-postgres \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=streamline_dev \
     -p 5432:5432 \
     postgres:16
   ```

5. **Run database migrations**

   ```bash
   npm run db:push
   ```

6. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### First-Time Setup Wizard

On first run, you'll see the setup wizard:

1. Create an admin account
2. Create your first workspace
3. Start planning videos!

## Development Workflow

### Day-to-Day Development

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write code following our [code standards](#code-standards)
   - Add tests for new functionality
   - Update documentation as needed

3. **Run tests locally**

   ```bash
   # Type checking
   npm run type-check

   # Linting
   npm run lint

   # Unit tests
   npm test

   # E2E tests (optional)
   npm run test:e2e
   ```

4. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a pull request on GitHub.

### Available Scripts

| Command                 | Description                           |
| ----------------------- | ------------------------------------- |
| `npm run dev`           | Start development server (port 3000)  |
| `npm run build`         | Build for production                  |
| `npm start`             | Start production server               |
| `npm run lint`          | Run ESLint                            |
| `npm run lint:fix`      | Fix auto-fixable linting issues       |
| `npm run type-check`    | Run TypeScript type checking          |
| `npm test`              | Run unit tests in watch mode          |
| `npm run test:coverage` | Run tests with coverage report        |
| `npm run test:e2e`      | Run Playwright E2E tests              |
| `npm run db:push`       | Push schema changes to database       |
| `npm run db:studio`     | Open Drizzle Studio (database GUI)    |
| `npm run storybook`     | Start Storybook component development |

## Project Structure

```
streamline-studio/
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── (app)/            # Authenticated app routes
│   │   └── (auth)/           # Authentication pages
│   ├── components/           # React components
│   │   ├── ui/               # Reusable UI components
│   │   ├── layout/           # Layout components (AppShell, etc.)
│   │   ├── video/            # Video-specific components
│   │   ├── document/         # Document-specific components
│   │   └── category/         # Category-specific components
│   ├── lib/                  # Shared utilities
│   │   ├── auth/             # Authentication utilities
│   │   ├── workspace/        # Workspace context and providers
│   │   ├── accessibility/    # A11y utilities (focus-trap, aria)
│   │   ├── logger.ts         # Structured logging (Pino)
│   │   └── constants/        # Shared constants
│   ├── server/               # Server-side code
│   │   ├── db/               # Database schema and connection
│   │   ├── trpc/             # tRPC routers and middleware
│   │   └── repositories/     # Data access layer
│   └── test/                 # Test utilities and setup
├── docs/
│   └── adrs/                 # Architecture Decision Records
├── e2e/                      # Playwright E2E tests
├── public/                   # Static assets
└── scripts/                  # Build and utility scripts
```

### Key Architectural Patterns

#### Multi-Tenancy (WorkspaceRepository Pattern)

All data access is workspace-scoped through `WorkspaceRepository`:

```typescript
// ALWAYS use WorkspaceRepository for data access
const repository = new WorkspaceRepository(workspaceId, db);
const videos = await repository.listVideos();

// NEVER query directly without workspace scoping
// const videos = await db.select().from(videos); // ❌ Violates isolation
```

See [ADR-008: Multi-Tenancy Strategy](./docs/adrs/008-multi-tenancy-strategy.md)

#### Structured Logging

Use Pino logger instead of console statements:

```typescript
import { logger } from '@/lib/logger';

// ❌ Don't use console
console.log('User logged in');

// ✅ Use structured logging
logger.info('User logged in', {
  userId,
  timestamp: new Date().toISOString(),
});
```

See Phase 4 completion summary for details.

## Code Standards

### TypeScript

- **Strict mode enabled**: All strict TypeScript checks are enforced
- **No `any` types**: Use proper typing or `unknown` if truly dynamic
- **Explicit return types**: For exported functions
- **exactOptionalPropertyTypes**: Distinguish `undefined` from missing properties

### Linting and Formatting

- **ESLint**: Automatically runs on commit via husky
- **Prettier**: Auto-formats on save (configure your editor)
- **Import order**: Use absolute imports with `@/` alias

```typescript
// ✅ Good - absolute import
import { Button } from '@/components/ui/button';

// ❌ Avoid - relative imports
import { Button } from '../../components/ui/button';
```

### Naming Conventions

- **Files**: kebab-case (e.g., `video-card.tsx`)
- **Components**: PascalCase (e.g., `VideoCard`)
- **Functions**: camelCase (e.g., `getUserById`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`)
- **Interfaces/Types**: PascalCase (e.g., `UserProfile`)

### Component Structure

```typescript
/**
 * Component description
 *
 * @example
 * <VideoCard title="My Video" status="published" />
 */
export interface VideoCardProps {
  title: string;
  status: VideoStatus;
  // ...
}

export function VideoCard({ title, status }: VideoCardProps) {
  // Implementation
}

// Always add displayName for debugging
VideoCard.displayName = 'VideoCard';
```

### CSS/SCSS Modules

```scss
// video-card.module.scss
.container {
  // Use CSS custom properties for theming
  background: var(--color-surface);
  color: var(--color-foreground);

  // Use spacing tokens
  padding: var(--spacing-4);

  // Use radius tokens
  border-radius: var(--radius-md);
}
```

### Icon Usage (lucide-react)

Since Phase 7, we use lucide-react for all icons:

```typescript
import { Video, Tag, Users } from 'lucide-react';

// Navigation icons: 20px (1.25rem)
<Video className="w-5 h-5" />

// Empty state icons: 48px
<Video size={48} strokeWidth={1.5} />

// Always include aria-hidden on decorative icons
<Video aria-hidden="true" />
```

## Testing

### Test Coverage Requirements

- **Current threshold**: 60%
- **Target**: 80% (ADR-005)
- **Coverage is enforced** in CI

### Writing Tests

#### Unit Tests (Vitest)

```typescript
// button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);

    await userEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
```

#### E2E Tests (Playwright)

```typescript
// login.spec.ts
import { test, expect } from '@playwright/test';

test('user can log in successfully', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/w/my-workspace/videos');
});
```

### Running Tests

```bash
# Unit tests (watch mode)
npm test

# Unit tests (single run with coverage)
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E tests (headed mode for debugging)
npm run test:e2e:headed
```

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates

### Examples

```bash
feat(video): add YouTube sync integration

Implements video synchronization with YouTube API. Users can now
connect their channel and import existing videos.

Closes #123

---

fix(auth): prevent session token exposure in response

Session tokens were being returned in API responses. This fix ensures
tokens are only set as HTTP-only cookies.

Ref: SECURITY.md

---

docs(contributing): add testing guidelines

Adds comprehensive testing documentation including coverage requirements
and examples for unit and E2E tests.
```

## Pull Requests

### Before Submitting

- [ ] Tests pass locally (`npm test`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Coverage meets threshold (60%+)
- [ ] Documentation updated (if needed)
- [ ] CHANGELOG.md updated (for user-facing changes)

### PR Description Template

```markdown
## Description

Brief description of what this PR does.

## Related Issues

Closes #123

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

How has this been tested?

- [ ] Unit tests
- [ ] E2E tests
- [ ] Manual testing

## Screenshots (if applicable)

Add screenshots for UI changes.

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No new warnings
```

### Code Review Process

1. **Automated checks**: CI must pass (tests, linting, type checking)
2. **Peer review**: At least one approval required
3. **Security review**: For authentication, authorization, or data access changes
4. **Performance check**: For database queries or heavy operations

## Architecture Decisions

All significant architectural decisions are documented in [Architecture Decision Records (ADRs)](./docs/adrs/).

### Key ADRs to Review

- [ADR-001: Next.js Framework](./docs/adrs/001-nextjs-framework.md)
- [ADR-005: Testing Strategy](./docs/adrs/005-testing-strategy.md)
- [ADR-007: API and Authentication](./docs/adrs/007-api-and-auth.md)
- [ADR-008: Multi-Tenancy Strategy](./docs/adrs/008-multi-tenancy-strategy.md)
- [ADR-014: Security Architecture](./docs/adrs/014-security-architecture.md)

### Creating New ADRs

When making significant architectural decisions:

1. Copy `docs/adrs/template.md`
2. Number it sequentially (next available number)
3. Document the decision with context, options, and rationale
4. Submit with your PR

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Open a GitHub Issue
- **Security**: See [SECURITY.md](./SECURITY.md)
- **Chat**: [Add link to Discord/Slack if available]

## Recognition

Contributors will be recognized in:

- `CONTRIBUTORS.md` file
- Release notes for significant contributions
- GitHub contributor list

Thank you for contributing to Streamline Studio! 🎬

---

**Happy coding!**
