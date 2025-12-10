#!/bin/sh
# =============================================================================
# Streamline Studio Docker Entrypoint
# =============================================================================
# Handles startup tasks before launching the application:
# 1. Wait for database to be ready
# 2. Run database migrations
# 3. Start the application
#
# ADR-011: Self-Hosting Packaging
# @see /docs/adrs/011-self-hosting-strategy.md
# =============================================================================

set -e

echo "[Entrypoint] Starting Streamline Studio..."

# -----------------------------------------------------------------------------
# Wait for PostgreSQL to be ready
# -----------------------------------------------------------------------------
echo "[Entrypoint] Waiting for database to be ready..."

MAX_RETRIES=30
RETRY_COUNT=0

until pg_isready -h $(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p') -U $(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p') > /dev/null 2>&1; do
  RETRY_COUNT=$((RETRY_COUNT + 1))

  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "[Entrypoint] ERROR: Database is not ready after $MAX_RETRIES attempts"
    echo "[Entrypoint] Please check your DATABASE_URL and ensure PostgreSQL is running"
    exit 1
  fi

  echo "[Entrypoint] Database not ready yet... (attempt $RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

echo "[Entrypoint] Database is ready!"

# -----------------------------------------------------------------------------
# Run database migrations
# -----------------------------------------------------------------------------
echo "[Entrypoint] Running database migrations..."

# Run migrations using the migrate script from drizzle
# We need to use the node binary from standalone build
if ! node scripts/migrate.js; then
  echo "[Entrypoint] ERROR: Database migrations failed"
  echo "[Entrypoint] This could indicate:"
  echo "  - Invalid DATABASE_URL"
  echo "  - Database permissions issue"
  echo "  - Migration file corruption"
  exit 1
fi

echo "[Entrypoint] Migrations completed successfully!"

# -----------------------------------------------------------------------------
# Start the application
# -----------------------------------------------------------------------------
echo "[Entrypoint] Starting Next.js server..."

exec node server.js
