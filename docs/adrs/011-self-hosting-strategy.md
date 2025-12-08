# ADR-011: Self-Hosting Strategy

**Status**: Accepted
**Date**: 2025-12-08
**Deciders**: Strategic Project Planner, Lead Developer, QA Architect

## Context

The application must be easily self-hostable for individual YouTubers and small teams. Requirements:

1. Single `docker-compose up` command to start everything
2. Minimal configuration required for basic setup
3. Data persistence across container restarts
4. Clear upgrade and backup procedures
5. Works on common hardware (amd64, arm64)

## Decision

### Container Strategy

- Multi-stage Dockerfile for optimised production image
- Next.js standalone output mode for minimal image size
- Auto-run migrations on container start
- Health check endpoint for orchestration

### Docker Compose Stack

- Web application container (Next.js)
- PostgreSQL container
- Named volume for database persistence
- Optional Redis (commented out, for future phases)

### First-Run Experience

- Setup wizard on first visit (no users in database)
- Creates admin user and default workspace
- Persistent completion flag prevents re-running wizard
- Helpful error messages for common issues

## Consequences

### Positive

- **Simple deployment**: Single command to start
- **Portable**: Works on any Docker-capable host
- **Reproducible**: Same setup for dev and production
- **Upgradeable**: Pull new image, restart, migrations run automatically

### Negative

- **Requires Docker knowledge**: Not suitable for shared hosting
- **Single-node only**: No built-in clustering
- **Manual backup**: User responsible for pg_dump

## Alternatives Considered

### Bare Metal Installation

**Pros:**

- No Docker requirement
- Direct system integration

**Cons:**

- Complex dependency management
- OS-specific instructions
- Harder to reproduce/upgrade

### Kubernetes Manifests

**Pros:**

- Production-grade orchestration
- Auto-scaling, self-healing

**Cons:**

- Overkill for target audience
- High barrier to entry
- Out of scope for MVP

### Platform-Specific (Vercel/Railway/etc.)

**Pros:**

- Zero-config deployment
- Managed infrastructure

**Cons:**

- Vendor lock-in
- Doesn't satisfy self-hosting requirement
- May have cost implications

## Discussion

### Strategic Project Planner

"Our target user is a YouTuber who:

- Has a server, VPS, or NAS at home
- Knows enough to run `docker-compose up`
- May not know how to configure nginx or PostgreSQL manually

The goal is: 10 minutes from download to first video created."

### Lead Developer

"Here's the proposed Dockerfile structure:

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app

# Security: Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Security: Install dumb-init for proper signal handling
RUN apk --no-cache add dumb-init && \
    rm -rf /var/cache/apk/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy standalone output with correct ownership
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Migration scripts
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Create data directory for setup flag
RUN mkdir -p /data && chown nextjs:nodejs /data

# Security: Run as non-root user
USER nextjs

EXPOSE 3000

# Security: Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "scripts/start.js"]
```

**Security Notes (see ADR-014):**

- Non-root user (uid 1001) prevents container escape attacks
- `dumb-init` ensures proper signal handling (graceful shutdown)
- `/data` directory for setup completion flag (persists across database wipes)

The `scripts/start.js` runs migrations then starts the server."

### QA Architect

"I have concerns about the first-run experience:

1. **Database not ready**: If Postgres is slow to start, the app will crash trying to connect.

2. **Setup wizard security**: If someone wipes the database but the container restarts, can an attacker create a new admin account?

3. **Migration failures**: What happens if a migration fails mid-way during upgrade?"

### Lead Developer (Response)

"1. **Database not ready**: The startup script will retry connection with exponential backoff:

```javascript
async function waitForDatabase(maxAttempts = 10) {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      await db.execute(sql`SELECT 1`);
      return;
    } catch (e) {
      console.log(`Database not ready (attempt ${i}/${maxAttempts})`);
      await sleep(1000 * i); // 1s, 2s, 3s...
    }
  }
  throw new Error('Database connection failed');
}
```

2. **Setup wizard security**: We'll use a persistent flag outside the database. Options:
   - Environment variable `SETUP_COMPLETED=true` (set after wizard)
   - File in volume `/data/.setup-complete`

   I prefer the file approach - it's in the same volume as database data. If you wipe the volume, you expect to start fresh. If you only wipe the database, the app warns you.

3. **Migration failures**: Drizzle Kit tracks migration status in a `__drizzle_migrations` table. If a migration fails, it's marked incomplete. On next start:
   - Check for incomplete migrations
   - If found, show error: 'Migration failed. Please restore from backup or contact support.'
   - Don't start the app in broken state"

### QA Architect (Docker Compose)

"What about the docker-compose.yml structure?"

### Lead Developer (Response)

```yaml
version: '3.8'

services:
  app:
    image: streamline-studio:latest
    build: .
    ports:
      - '3000:3000'
    environment:
      # CRITICAL: Never use default credentials
      - DATABASE_URL=postgresql://streamline:${POSTGRES_PASSWORD}@db:5432/streamline
      - SESSION_SECRET=${SESSION_SECRET:?SESSION_SECRET must be set}
      - MODE=single-tenant
      - DATA_DIR=/data
      - TRUSTED_PROXY=${TRUSTED_PROXY:-false}
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - appdata:/data
    restart: unless-stopped
    # Security: Limit capabilities
    security_opt:
      - no-new-privileges:true
    # Security: Read-only root filesystem where possible
    read_only: true
    tmpfs:
      - /tmp

  db:
    image: postgres:16-alpine
    environment:
      # CRITICAL: Never use default credentials
      - POSTGRES_USER=streamline
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}
      - POSTGRES_DB=streamline
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U streamline -d streamline']
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    # Security: Don't expose database port to host by default
    # Uncomment for debugging only:
    # ports:
    #   - '5432:5432'

volumes:
  pgdata:
  appdata:
```

**Security Notes (see ADR-014):**

- No default credentials - `POSTGRES_PASSWORD` must be set
- `no-new-privileges` prevents privilege escalation
- `read_only` filesystem with tmpfs for writes
- Database port not exposed to host by default
- `appdata` volume for setup completion flag

Key points:

- Named volumes for persistence (`pgdata` for database, `appdata` for setup flag)
- Healthcheck on Postgres
- `depends_on` with condition ensures app waits for healthy database
- `unless-stopped` restart policy for resilience"

### Strategic Project Planner (Documentation)

"We need clear documentation for:

1. **Quick start**: The 5-minute path to running instance
2. **Environment variables**: All options with descriptions
3. **Backup**: How to `pg_dump` and restore
4. **Upgrade**: Pull new image, restart, done
5. **Reverse proxy**: Examples for nginx, Traefik, Caddy
6. **Troubleshooting**: Common issues and solutions"

### QA Architect (Testing)

"The documentation needs to be tested by someone unfamiliar with the codebase. I'll arrange for a fresh-eyes walkthrough before Phase 4 completion.

Also, we need to test:

1. Clean start from scratch
2. Data persistence across restart
3. Upgrade from previous version
4. Backup and restore cycle
5. Multi-architecture builds (amd64, arm64)"

### Lead Developer (On Multi-Arch)

"The main concern for arm64 is Argon2, which has native bindings. Options:

1. **@node-rs/argon2**: Rust-based, pre-built for common platforms including arm64
2. **argon2**: Node native addon, needs compilation

I'll use @node-rs/argon2 as primary. If it fails on an unsupported platform, we have documented bcrypt fallback."

## Implementation Notes

### Environment Variables

| Variable            | Required | Default         | Description                                                 |
| ------------------- | -------- | --------------- | ----------------------------------------------------------- |
| `DATABASE_URL`      | Yes      | -               | PostgreSQL connection string                                |
| `SESSION_SECRET`    | Yes      | -               | 32+ character secret for session encryption                 |
| `POSTGRES_PASSWORD` | Yes      | -               | Database password (generate with `openssl rand -base64 24`) |
| `MODE`              | No       | `single-tenant` | `single-tenant` or `multi-tenant`                           |
| `TRUSTED_PROXY`     | No       | `false`         | Set `true` when behind reverse proxy (see ADR-014)          |
| `DATA_DIR`          | No       | `/data`         | Directory for setup completion flag                         |
| `PORT`              | No       | `3000`          | HTTP port                                                   |

### .env.example

```bash
# REQUIRED: Generate with: openssl rand -base64 32
SESSION_SECRET=

# REQUIRED: Generate with: openssl rand -base64 24
POSTGRES_PASSWORD=

# Optional: Set to 'multi-tenant' for SaaS deployment
MODE=single-tenant

# Optional: Set to 'true' when behind reverse proxy (nginx, Caddy, etc.)
TRUSTED_PROXY=false
```

**Security Note**: Never commit `.env` files. The docker-compose.yml will fail to start if required secrets are not set.

### Health Check Endpoint

```typescript
// /api/health
export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return Response.json({ status: 'ok' });
  } catch (e) {
    return Response.json(
      { status: 'error', message: 'Database unavailable' },
      { status: 500 }
    );
  }
}
```

### Backup Procedure (Documentation)

```bash
# Create backup
docker exec streamline-db pg_dump -U postgres streamline > backup.sql

# Restore backup
docker exec -i streamline-db psql -U postgres streamline < backup.sql
```

### Upgrade Procedure (Documentation)

```bash
# Pull new image
docker-compose pull

# Restart (migrations run automatically)
docker-compose up -d

# Check logs for migration status
docker-compose logs app
```
