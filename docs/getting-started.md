# Getting Started with Streamline Studio

This guide will help you set up Streamline Studio for development or self-hosted deployment.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Docker Deployment](#docker-deployment)
- [First-Run Setup](#first-run-setup)
- [Configuration](#configuration)
- [Reverse Proxy Setup](#reverse-proxy-setup)
- [Backup and Restore](#backup-and-restore)
- [Upgrading](#upgrading)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### For Development

- **Node.js** 20.x or later
- **PostgreSQL** 16.x or later (or Docker)
- **npm**, **pnpm**, or **yarn**
- **Git**

### For Docker Deployment

- **Docker** 24.x or later
- **Docker Compose** v2.x or later

### Hardware Requirements

| Resource | Minimum | Recommended |
| -------- | ------- | ----------- |
| RAM      | 2 GB    | 4 GB        |
| Disk     | 10 GB   | 20 GB       |
| CPU      | 1 core  | 2 cores     |

---

## Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/streamline-studio.git
cd streamline-studio
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your settings:

```bash
# Database connection
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/streamline

# Required: Generate with: openssl rand -base64 32
SESSION_SECRET=your-session-secret-here

# Optional: 'single-tenant' (default) or 'multi-tenant'
MODE=single-tenant

# Optional: Set to 'true' when behind a reverse proxy
TRUSTED_PROXY=false
```

### 4. Start PostgreSQL

**Option A: Using Docker (Recommended)**

```bash
docker-compose up -d db
```

**Option B: Local PostgreSQL**

```bash
# Create database
createdb streamline
```

### 5. Set Up Database Schema

```bash
# Push schema to database (development)
npm run db:push

# Or run migrations (production-style)
npm run db:migrate
```

### 6. (Optional) Seed Development Data

```bash
npm run db:seed
```

This creates:

- A test workspace
- A test user (check the seed script for credentials)
- Sample videos, categories, and documents

### 7. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 8. Start Storybook (Optional)

```bash
npm run storybook
```

Visit [http://localhost:6006](http://localhost:6006) to view the component library.

---

## Docker Deployment

### Quick Start (5 Minutes)

1. **Create a project directory:**

```bash
mkdir streamline-studio && cd streamline-studio
```

2. **Download docker-compose.yml:**

```bash
curl -O https://raw.githubusercontent.com/your-org/streamline-studio/main/docker-compose.yml
```

3. **Create environment file:**

```bash
cat > .env << 'EOF'
# REQUIRED: Generate with: openssl rand -base64 32
SESSION_SECRET=

# REQUIRED: Generate with: openssl rand -base64 24
POSTGRES_PASSWORD=

# Optional: Set to 'true' when behind reverse proxy
TRUSTED_PROXY=false
EOF
```

4. **Generate secrets:**

```bash
# Generate and set SESSION_SECRET
SESSION_SECRET=$(openssl rand -base64 32)
sed -i '' "s/^SESSION_SECRET=$/SESSION_SECRET=$SESSION_SECRET/" .env

# Generate and set POSTGRES_PASSWORD
POSTGRES_PASSWORD=$(openssl rand -base64 24)
sed -i '' "s/^POSTGRES_PASSWORD=$/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env
```

5. **Start the stack:**

```bash
docker-compose up -d
```

6. **Check status:**

```bash
docker-compose ps
docker-compose logs -f app
```

Visit [http://localhost:3000](http://localhost:3000) to complete the setup wizard.

### Docker Compose Configuration

The default `docker-compose.yml` includes:

```yaml
services:
  app:
    image: streamline-studio:latest
    ports:
      - '3000:3000'
    environment:
      - DATABASE_URL=postgresql://streamline:${POSTGRES_PASSWORD}@db:5432/streamline
      - SESSION_SECRET=${SESSION_SECRET}
      - MODE=single-tenant
      - TRUSTED_PROXY=${TRUSTED_PROXY:-false}
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=streamline
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=streamline
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U streamline -d streamline']
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  pgdata:
  appdata:
```

### Building from Source

If you want to build the Docker image locally:

```bash
# Clone repository
git clone https://github.com/your-org/streamline-studio.git
cd streamline-studio

# Build image
docker build -t streamline-studio:local .

# Update docker-compose.yml to use local image
# image: streamline-studio:local
```

---

## First-Run Setup

When you first access Streamline Studio, you'll be guided through a setup wizard.

### Single-Tenant Mode (Default)

1. Navigate to [http://localhost:3000](http://localhost:3000)
2. You'll be redirected to `/register`
3. Create your admin account:
   - Email address
   - Password (minimum 8 characters)
   - Display name
4. A default workspace is automatically created
5. You're now logged in and ready to use the app

### Multi-Tenant Mode

In multi-tenant mode, users must create or be invited to workspaces:

1. Set `MODE=multi-tenant` in your environment
2. Users can register and create their own workspaces
3. Workspace owners can invite other users

---

## Configuration

### Environment Variables Reference

#### Required Variables

| Variable            | Required | Default | Description                               |
| ------------------- | -------- | ------- | ----------------------------------------- |
| `DATABASE_URL`      | Yes      | -       | PostgreSQL connection string              |
| `SESSION_SECRET`    | Yes      | -       | Secret for session encryption (32+ chars) |
| `POSTGRES_PASSWORD` | Yes\*    | -       | PostgreSQL password (\*Docker only)       |

#### Optional Variables

| Variable        | Default         | Description                      |
| --------------- | --------------- | -------------------------------- |
| `MODE`          | `single-tenant` | Deployment mode                  |
| `TRUSTED_PROXY` | `false`         | Enable when behind reverse proxy |
| `PORT`          | `3000`          | HTTP port                        |
| `DATA_DIR`      | `/data`         | Directory for setup flag file    |

#### SMTP Variables (Required for multi-tenant invitations)

| Variable        | Description             |
| --------------- | ----------------------- |
| `SMTP_HOST`     | SMTP server hostname    |
| `SMTP_PORT`     | SMTP port (usually 587) |
| `SMTP_USER`     | SMTP username           |
| `SMTP_PASSWORD` | SMTP password           |
| `SMTP_FROM`     | From email address      |

### Security Configuration

#### SESSION_SECRET

Must be at least 32 characters of random data:

```bash
openssl rand -base64 32
```

**Never commit this to version control.**

#### TRUSTED_PROXY

Set to `true` when running behind a reverse proxy (nginx, Caddy, Traefik).

This enables:

- Reading client IP from `X-Forwarded-For` header
- Reading host from `X-Forwarded-Host` header
- Proper HTTPS detection from `X-Forwarded-Proto`

**Only enable if you trust your reverse proxy.**

---

## Reverse Proxy Setup

### Nginx

```nginx
server {
    listen 80;
    server_name streamline.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name streamline.example.com;

    ssl_certificate /etc/letsencrypt/live/streamline.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/streamline.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Caddy

```caddyfile
streamline.example.com {
    reverse_proxy localhost:3000
}
```

Caddy automatically handles HTTPS with Let's Encrypt.

### Traefik

```yaml
# docker-compose.yml addition
services:
  app:
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.streamline.rule=Host(`streamline.example.com`)'
      - 'traefik.http.routers.streamline.entrypoints=websecure'
      - 'traefik.http.routers.streamline.tls.certresolver=letsencrypt'
      - 'traefik.http.services.streamline.loadbalancer.server.port=3000'
```

**Remember to set `TRUSTED_PROXY=true` when using any reverse proxy.**

---

## Backup and Restore

### Database Backup

```bash
# Create backup
docker exec streamline-db pg_dump -U streamline streamline > backup_$(date +%Y%m%d).sql

# Or with compression
docker exec streamline-db pg_dump -U streamline streamline | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Database Restore

```bash
# Stop the app (optional but recommended)
docker-compose stop app

# Restore from backup
docker exec -i streamline-db psql -U streamline streamline < backup.sql

# Or from compressed backup
gunzip -c backup.sql.gz | docker exec -i streamline-db psql -U streamline streamline

# Restart the app
docker-compose start app
```

### Full Backup (Including Volumes)

```bash
# Stop containers
docker-compose down

# Backup PostgreSQL data volume
docker run --rm -v streamline-studio_pgdata:/data -v $(pwd):/backup alpine \
  tar czf /backup/pgdata_backup.tar.gz -C /data .

# Start containers
docker-compose up -d
```

### Automated Backups

Create a cron job for daily backups:

```bash
# Add to crontab (crontab -e)
0 2 * * * cd /path/to/streamline-studio && docker exec streamline-db pg_dump -U streamline streamline | gzip > backups/backup_$(date +\%Y\%m\%d).sql.gz
```

---

## Upgrading

### Docker Deployment

```bash
# Pull latest image
docker-compose pull

# Restart with new image (migrations run automatically)
docker-compose up -d

# Check logs for migration status
docker-compose logs app
```

### Development

```bash
# Pull latest code
git pull origin main

# Install any new dependencies
npm install

# Run migrations
npm run db:migrate

# Restart development server
npm run dev
```

### Checking Version

```bash
# Via API
curl http://localhost:3000/api/health

# Or check package.json
cat package.json | grep version
```

---

## Troubleshooting

### Common Issues

#### "Database connection failed"

**Symptoms:** App crashes on startup with database errors.

**Solutions:**

1. Check PostgreSQL is running: `docker-compose ps db`
2. Verify `DATABASE_URL` is correct
3. Check database logs: `docker-compose logs db`
4. Ensure database exists: `docker exec streamline-db psql -U streamline -c '\l'`

#### "CSRF token mismatch" / 403 Forbidden

**Symptoms:** Forms don't submit, API calls fail with 403.

**Solutions:**

1. If behind reverse proxy, set `TRUSTED_PROXY=true`
2. Ensure reverse proxy forwards `X-Forwarded-*` headers
3. Check Origin header matches Host header

#### "Rate limit exceeded"

**Symptoms:** "Too many attempts" error on login.

**Solutions:**

1. Wait 1 minute for login rate limit to reset
2. If legitimate traffic, consider Redis-based rate limiting
3. Check if IP detection is working correctly

#### "Session expired" immediately after login

**Symptoms:** Login succeeds but immediately redirects to login.

**Solutions:**

1. Check `SESSION_SECRET` hasn't changed
2. Verify cookies are being set (check browser dev tools)
3. If behind proxy, ensure `Secure` cookie works with HTTPS

#### Container keeps restarting

**Symptoms:** `docker-compose ps` shows "Restarting".

**Solutions:**

1. Check logs: `docker-compose logs app`
2. Verify all required environment variables are set
3. Ensure database is healthy before app starts

### Health Check

Test if the application is running:

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{ "status": "ok" }
```

### Debug Mode

For detailed logging, set:

```bash
DEBUG=streamline:* npm run dev
```

### Getting Help

1. Check the [troubleshooting guide](#troubleshooting)
2. Search [existing issues](https://github.com/your-org/streamline-studio/issues)
3. Review [Architecture Decision Records](adrs/)
4. Open a new issue with:
   - Streamline Studio version
   - Node.js / Docker version
   - Relevant logs
   - Steps to reproduce

---

## Next Steps

Now that you're set up:

1. **Create your first video** - Click "New Video" to start planning
2. **Set up categories** - Organize your content with tags
3. **Explore the editor** - Write scripts with markdown support
4. **Configure backups** - Set up automated database backups

For development:

1. Read the [Architecture Decision Records](adrs/)
2. Review the [Implementation Plan](planning/app-planning-phases.md)
3. Explore components in Storybook (`npm run storybook`)
4. Run tests (`npm run test`)
