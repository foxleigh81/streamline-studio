# Streamline Studio

A self-hostable web application for YouTubers to plan and manage video content. Built with Next.js, TypeScript, and PostgreSQL.

## Features

- **Video Planning**: Organize videos from idea to publication with status tracking
- **Document Management**: Scripts, descriptions, notes, and thumbnail ideas per video
- **Category System**: Flexible tagging with custom colours
- **Version History**: Full revision history with optimistic locking (Phase 3)
- **Multi-tenancy**: Single-tenant (self-hosted) or multi-tenant (SaaS) modes
- **Self-Hostable**: Single `docker-compose up` to deploy

## Tech Stack

| Layer      | Technology                            |
| ---------- | ------------------------------------- |
| Framework  | Next.js 15 (App Router)               |
| Language   | TypeScript (strict mode)              |
| Styling    | CSS Modules + SCSS                    |
| Database   | PostgreSQL + Drizzle ORM              |
| API        | tRPC                                  |
| Auth       | Custom (Lucia v3 patterns) + Argon2id |
| Testing    | Vitest + Playwright + Storybook       |
| Deployment | Docker + docker-compose               |

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ (or Docker)
- pnpm, npm, or yarn

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/streamline-studio.git
cd streamline-studio

# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env.local

# Generate required secrets
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env.local

# Start PostgreSQL (via Docker)
docker-compose up -d db

# Push database schema
npm run db:push

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the application.

### Docker Deployment

For complete Docker deployment instructions, see **[DOCKER.md](DOCKER.md)**.

Quick start:

```bash
# Copy environment file
cp .env.example .env

# Generate secrets
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)" >> .env
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env

# Edit .env and update DATABASE_URL with the generated password
nano .env

# Start the full stack
docker-compose up -d

# View logs
docker-compose logs -f app

# Access the setup wizard at http://localhost:3000
```

The setup wizard will guide you through creating your admin account and workspace.

## Project Structure

```
streamline-studio/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── (auth)/          # Authentication pages (login, register)
│   │   └── api/             # API routes (tRPC, health)
│   ├── components/          # Pure UI components (no context access)
│   │   └── ui/              # Base UI components (Button, Input)
│   ├── partials/            # Stateful components (context access allowed)
│   ├── lib/                 # Shared utilities
│   │   ├── auth/            # Authentication utilities
│   │   ├── trpc/            # tRPC client
│   │   └── workspace/       # Workspace context
│   ├── server/              # Server-side code
│   │   ├── db/              # Database schema and connection
│   │   ├── repositories/    # Data access layer
│   │   └── trpc/            # tRPC routers and middleware
│   └── themes/              # CSS theme system
│       └── default/         # Default theme (YouTube Studio colours)
├── docs/
│   ├── adrs/                # Architecture Decision Records
│   └── planning/            # Implementation phases
├── drizzle/                 # Database migrations
├── e2e/                     # Playwright E2E tests
└── scripts/                 # Utility scripts (seed, etc.)
```

## Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run db:generate      # Generate migration from schema changes
npm run db:migrate       # Run pending migrations
npm run db:push          # Push schema directly (dev only)
npm run db:studio        # Open Drizzle Studio
npm run db:seed          # Seed development data

# Testing
npm run test             # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:e2e         # Run Playwright E2E tests
npm run test:coverage    # Run tests with coverage

# Code Quality
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript type checking
npm run format           # Format code with Prettier

# Storybook
npm run storybook        # Start Storybook dev server
npm run build-storybook  # Build Storybook static site
```

## Environment Variables

| Variable            | Required | Default         | Description                                 |
| ------------------- | -------- | --------------- | ------------------------------------------- |
| `DATABASE_URL`      | Yes      | -               | PostgreSQL connection string                |
| `POSTGRES_PASSWORD` | Yes\*    | -               | PostgreSQL password (\*for Docker setup)    |
| `SESSION_SECRET`    | Yes      | -               | 32+ character secret for session encryption |
| `MODE`              | No       | `single-tenant` | `single-tenant` or `multi-tenant`           |
| `TRUSTED_PROXY`     | No       | `false`         | Set `true` when behind reverse proxy        |
| `NODE_ENV`          | No       | `development`   | `development` or `production`               |

**Note:** The password in `DATABASE_URL` must match `POSTGRES_PASSWORD` when using Docker.

### Generating Secrets

```bash
# Generate POSTGRES_PASSWORD
openssl rand -base64 24

# Generate SESSION_SECRET
openssl rand -base64 32
```

## Architecture

### Authentication

- **Password Hashing**: Argon2id with OWASP-recommended parameters
- **Sessions**: 256-bit tokens, SHA-256 hashed in database
- **Cookies**: HTTP-only, Secure (production), SameSite=Lax
- **CSRF Protection**: Origin header verification
- **Rate Limiting**: 5 login attempts/minute, 3 registrations/hour

### Workspace Isolation

All data is scoped to workspaces via the `WorkspaceRepository` pattern:

```typescript
// All queries automatically include workspace_id filtering
const repo = new WorkspaceRepository(db, workspaceId);
const videos = await repo.getVideos({ status: 'scripting' });
```

Direct database queries outside repositories are blocked by ESLint rules.

### Multi-tenancy Modes

| Mode            | Description                                                |
| --------------- | ---------------------------------------------------------- |
| `single-tenant` | Self-hosted, auto-creates workspace on first registration  |
| `multi-tenant`  | SaaS mode, requires workspace creation during registration |

## Documentation

- [Docker Deployment Guide](DOCKER.md) - Complete self-hosting instructions
- [Getting Started Guide](docs/getting-started.md)
- [Architecture Decision Records](docs/adrs/)
- [Implementation Plan](docs/planning/app-planning-phases.md)

### Key ADRs

| ADR                                                | Title                       |
| -------------------------------------------------- | --------------------------- |
| [ADR-001](docs/adrs/001-nextjs-framework.md)       | Next.js Framework Selection |
| [ADR-002](docs/adrs/002-styling-solution.md)       | CSS Modules Styling         |
| [ADR-006](docs/adrs/006-orm-selection.md)          | Drizzle ORM                 |
| [ADR-007](docs/adrs/007-api-and-auth.md)           | API and Authentication      |
| [ADR-008](docs/adrs/008-multi-tenancy-strategy.md) | Multi-tenancy Strategy      |
| [ADR-011](docs/adrs/011-self-hosting-strategy.md)  | Self-Hosting Strategy       |
| [ADR-014](docs/adrs/014-security-architecture.md)  | Security Architecture       |

## Development

### Code Style

- TypeScript strict mode with `noUncheckedIndexedAccess`
- ESLint with strict rules
- Prettier for formatting
- Husky pre-commit hooks

### Component Guidelines

- **Components** (`/src/components`): Pure UI, data via props only
- **Partials** (`/src/partials`): Can access contexts, handle data fetching

### Testing Strategy

- **Unit Tests**: Vitest for utilities and logic
- **Component Tests**: Storybook with interaction tests
- **E2E Tests**: Playwright for critical user flows

## Deployment

### Docker (Recommended)

See [Docker Deployment Guide](DOCKER.md) for complete instructions including:

- Production deployment with reverse proxy
- Security best practices
- Backup and restore procedures
- Troubleshooting common issues

### Manual

```bash
# Build
npm run build

# Run migrations
npm run db:migrate

# Start
NODE_ENV=production npm run start
```

## Backup & Restore

```bash
# Backup
docker exec streamline-db pg_dump -U streamline streamline > backup.sql

# Restore
docker exec -i streamline-db psql -U streamline streamline < backup.sql
```

## Contributing

1. Read the [Architecture Decision Records](docs/adrs/)
2. Follow the component guidelines
3. Write tests for new features
4. Ensure `npm run lint` and `npm run type-check` pass

## License

[MIT](LICENSE)

## Acknowledgements

Built with:

- [Next.js](https://nextjs.org/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [tRPC](https://trpc.io/)
- [Storybook](https://storybook.js.org/)
