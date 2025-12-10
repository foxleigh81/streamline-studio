# Docker Deployment Guide

This guide covers deploying Streamline Studio using Docker and Docker Compose.

## Quick Start

### Prerequisites

- Docker 24.0+ and Docker Compose 2.0+
- At least 2GB RAM and 10GB disk space
- Supported architectures: `amd64`, `arm64`

### 1. Clone and Configure

```bash
# Clone the repository
git clone https://github.com/your-org/streamline-studio.git
cd streamline-studio

# Copy environment file
cp .env.example .env

# Generate secrets
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)" >> .env
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env

# Edit .env and replace YOUR_PASSWORD in DATABASE_URL with the generated POSTGRES_PASSWORD
nano .env
```

### 2. Start Services

```bash
# Build and start all services
docker-compose up -d

# Check logs
docker-compose logs -f

# Check health
curl http://localhost:3000/api/health
```

### 3. Complete Setup

1. Open your browser to `http://localhost:3000`
2. You'll be redirected to the setup wizard
3. Create your admin account and workspace
4. Start using Streamline Studio!

The setup wizard can only be run once and will be locked after completion.

---

## Architecture

### Services

#### Application (`app`)

- **Image**: Built from `./Dockerfile`
- **Port**: 3000
- **Runtime**: Node.js 20 (Alpine Linux)
- **User**: Non-root (`nextjs:nodejs`, UID 1001)
- **Health Check**: HTTP GET to `/api/health` every 30s

#### Database (`db`)

- **Image**: `postgres:16-alpine`
- **Port**: 5432 (exposed for local development)
- **Volume**: `streamline-pgdata` (persistent)
- **Health Check**: `pg_isready` every 5s

### Volumes

- `streamline-pgdata`: PostgreSQL data (survives container restarts)
- `streamline-appdata`: Application data (setup flag, etc.)

### Network

Services communicate via Docker's default bridge network. The database is accessible to the application as `db:5432`.

---

## Configuration

### Environment Variables

All configuration is done via environment variables in `.env`. See `.env.example` for full documentation.

#### Required Variables

| Variable            | Description                           | Example                                               |
| ------------------- | ------------------------------------- | ----------------------------------------------------- |
| `POSTGRES_PASSWORD` | PostgreSQL password                   | Generate with `openssl rand -base64 24`               |
| `DATABASE_URL`      | Full PostgreSQL connection string     | `postgresql://streamline:PASSWORD@db:5432/streamline` |
| `SESSION_SECRET`    | Session encryption key (min 32 chars) | Generate with `openssl rand -base64 32`               |

#### Optional Variables

| Variable        | Default         | Description                                          |
| --------------- | --------------- | ---------------------------------------------------- |
| `MODE`          | `single-tenant` | Application mode (`single-tenant` or `multi-tenant`) |
| `TRUSTED_PROXY` | `false`         | Set to `true` when behind a reverse proxy            |
| `DATA_DIR`      | `/data`         | Directory for persistent application data            |

### Security Best Practices

1. **Never use default credentials** - Always generate random passwords
2. **Use a reverse proxy** - Put Caddy, nginx, or Traefik in front with HTTPS
3. **Enable firewall** - Only expose ports 80/443 to the internet
4. **Regular updates** - Pull latest images and rebuild regularly
5. **Backup data** - Back up the `streamline-pgdata` volume

---

## Production Deployment

### With Reverse Proxy (Recommended)

Example with Caddy:

```yaml
# docker-compose.prod.yml
services:
  app:
    # ... existing app config ...
    environment:
      - TRUSTED_PROXY=true
    expose:
      - '3000'
    # Remove ports: - "3000:3000"

  caddy:
    image: caddy:2-alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - app

volumes:
  caddy_data:
  caddy_config:
```

```Caddyfile
# Caddyfile
streamline.example.com {
    reverse_proxy app:3000
}
```

### With HTTPS

Using Caddy (automatic HTTPS via Let's Encrypt):

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Or manually with nginx + Certbot (see nginx documentation).

### Behind a Firewall

If running behind a corporate firewall or VPN:

1. Set `TRUSTED_PROXY=false` in `.env`
2. Expose port 3000 only to your internal network
3. Consider removing the database port exposure (comment out `ports:` in docker-compose.yml)

---

## Maintenance

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f db

# Last 100 lines
docker-compose logs --tail=100
```

### Database Backups

```bash
# Create backup
docker-compose exec db pg_dump -U streamline streamline > backup-$(date +%Y%m%d-%H%M%S).sql

# Restore backup
docker-compose exec -T db psql -U streamline streamline < backup-20240101-120000.sql
```

### Upgrading

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check logs for migration success
docker-compose logs -f app
```

Database migrations run automatically on container start.

### Resetting the Application

**Warning**: This will delete all data!

```bash
# Stop services
docker-compose down

# Remove volumes
docker volume rm streamline-pgdata streamline-appdata

# Start fresh
docker-compose up -d
```

---

## Troubleshooting

### Container Fails to Start

**Check logs:**

```bash
docker-compose logs app
```

**Common issues:**

- Missing environment variables (check `.env` file)
- Database not ready (wait for health check, or increase `start-period` in Dockerfile)
- Port 3000 already in use (stop other services or change port)

### Database Connection Failed

**Symptoms:**

- Health check returns 500
- App logs show "database unavailable"

**Solutions:**

1. Check if database is running: `docker-compose ps`
2. Verify `DATABASE_URL` matches `POSTGRES_PASSWORD`
3. Wait for database to be ready: `docker-compose logs db`
4. Test connection: `docker-compose exec db psql -U streamline -d streamline -c "SELECT 1;"`

### Setup Wizard Locked

If you need to re-run the setup wizard:

**Warning**: This only unlocks the wizard, it does NOT reset the database!

```bash
# Remove setup flag
docker-compose exec app rm /data/.setup-complete

# Restart app
docker-compose restart app
```

To completely reset (deletes all data):

```bash
docker-compose down -v
docker-compose up -d
```

### Permission Denied Errors

The application runs as a non-root user (UID 1001). If you see permission errors:

```bash
# Fix data directory permissions
docker-compose exec --user root app chown -R nextjs:nodejs /data
```

### Image Too Large

The image should be under 200MB. If it's larger:

1. Check `.dockerignore` is properly excluding dev files
2. Ensure multi-stage build is working
3. Verify Alpine base image is being used

```bash
# Check image size
docker images streamline-studio
```

---

## Development with Docker

### Hot Reload Development

For development with hot reload, use the dev compose file:

```yaml
# docker-compose.dev.yml
services:
  app:
    build:
      context: .
      target: deps
    command: npm run dev
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
```

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Building for Multiple Architectures

```bash
# Setup buildx
docker buildx create --use

# Build for multiple platforms
docker buildx build --platform linux/amd64,linux/arm64 -t streamline-studio:latest .
```

---

## Security Architecture

### Image Security

-  Multi-stage build (minimal attack surface)
-  Alpine Linux base (small, security-focused)
-  Non-root user (UID 1001)
-  Read-only root filesystem
-  No new privileges flag
-  `dumb-init` as PID 1 (proper signal handling)

### Network Security

- Database not exposed to internet (only via Docker network)
- CSRF protection on all state-changing requests
- Origin header verification
- Session-based authentication (Lucia Auth)

### Data Security

- Passwords hashed with Argon2
- Session secrets encrypted
- Setup wizard locked after first use
- File-based setup flag (persists across DB resets)

---

## Performance Tuning

### Database Connection Pool

Adjust in `src/server/db/index.ts`:

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Increase for high traffic
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Memory Limits

Add to `docker-compose.yml`:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

### Health Check Tuning

Adjust in `Dockerfile`:

```dockerfile
HEALTHCHECK --interval=60s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

---

## Support

- **Documentation**: `/docs` directory
- **Issues**: GitHub Issues
- **Security**: See `SECURITY.md`

---

## License

See `LICENSE` file for details.
