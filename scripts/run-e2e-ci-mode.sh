#!/bin/bash
# =============================================================================
# Run E2E Tests in CI Mode
# =============================================================================
# This script replicates the exact CI environment locally for debugging
# test failures that only occur in GitHub Actions.
#
# Usage:
#   npm run test:e2e:ci-mode
#   ./scripts/run-e2e-ci-mode.sh
#
# Prerequisites:
#   - Docker (for PostgreSQL)
#   - Node.js 20+
#
# What this script does:
#   1. Starts a fresh PostgreSQL container (matching CI)
#   2. Creates the DATA_DIR and setup flag (BEFORE build, like CI)
#   3. Runs database migrations and seeds
#   4. Builds the production standalone server
#   5. Copies static assets to standalone folder
#   6. Runs E2E tests with CI environment variables
#   7. Cleans up the PostgreSQL container
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration (matches CI exactly)
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/streamline_test"
export PGUSER="postgres"
export PGPASSWORD="postgres"
export PGHOST="127.0.0.1"
export PGPORT="5433"
export MODE="single-tenant"
export SESSION_SECRET="test-secret-for-ci-only-do-not-use-in-production"
export DATA_DIR="/tmp/streamline-ci-test-data"
export E2E_TEST_MODE="true"
export NODE_ENV="production"

CONTAINER_NAME="streamline-ci-test-postgres"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔬 Running E2E Tests in CI Mode${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# =============================================================================
# Cleanup function
# =============================================================================
cleanup() {
  echo ""
  echo -e "${YELLOW}🧹 Cleaning up...${NC}"

  # Stop and remove PostgreSQL container
  if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
    echo "   Stopping PostgreSQL container..."
    docker stop $CONTAINER_NAME >/dev/null 2>&1 || true
  fi

  if docker ps -aq -f name=$CONTAINER_NAME | grep -q .; then
    echo "   Removing PostgreSQL container..."
    docker rm $CONTAINER_NAME >/dev/null 2>&1 || true
  fi

  # Clean up DATA_DIR
  if [ -d "$DATA_DIR" ]; then
    echo "   Removing DATA_DIR..."
    rm -rf "$DATA_DIR"
  fi

  echo -e "${GREEN}   Cleanup complete.${NC}"
}

# Set up trap to clean up on exit
trap cleanup EXIT

# =============================================================================
# Step 1: Start PostgreSQL container
# =============================================================================
echo -e "${BLUE}📦 Step 1: Starting PostgreSQL container...${NC}"

# Remove existing container if it exists
if docker ps -aq -f name=$CONTAINER_NAME | grep -q .; then
  echo "   Removing existing container..."
  docker rm -f $CONTAINER_NAME >/dev/null 2>&1
fi

# Start fresh PostgreSQL container (using port 5433 to avoid conflicts)
docker run -d \
  --name $CONTAINER_NAME \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=streamline_test \
  -p 5433:5432 \
  postgres:16 >/dev/null

# Wait for PostgreSQL to be ready
echo "   Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
  if docker exec $CONTAINER_NAME pg_isready -U postgres >/dev/null 2>&1; then
    echo -e "   ${GREEN}PostgreSQL is ready.${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "   ${RED}PostgreSQL failed to start!${NC}"
    exit 1
  fi
  sleep 1
done

# =============================================================================
# Step 2: Create DATA_DIR and setup flag (BEFORE build, like CI)
# =============================================================================
echo ""
echo -e "${BLUE}📁 Step 2: Creating DATA_DIR and setup flag...${NC}"

mkdir -p "$DATA_DIR"
echo '{"completed":true,"timestamp":"2024-01-01T00:00:00.000Z","version":"1.0"}' > "$DATA_DIR/.setup-complete"
echo -e "   ${GREEN}Setup flag created at $DATA_DIR/.setup-complete${NC}"

# =============================================================================
# Step 3: Run database migrations and seed
# =============================================================================
echo ""
echo -e "${BLUE}🗃️  Step 3: Running database migrations...${NC}"

npm run db:migrate

echo ""
echo -e "${BLUE}🌱 Step 4: Seeding database...${NC}"

npm run db:seed

# =============================================================================
# Step 5: Build production standalone server
# =============================================================================
echo ""
echo -e "${BLUE}🔨 Step 5: Building production standalone server...${NC}"
echo "   (This may take a minute...)"

npm run build

# =============================================================================
# Step 6: Copy static assets to standalone folder
# =============================================================================
echo ""
echo -e "${BLUE}📋 Step 6: Copying static assets...${NC}"

cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

echo -e "   ${GREEN}Static assets copied.${NC}"

# =============================================================================
# Step 7: Run E2E tests
# =============================================================================
echo ""
echo -e "${BLUE}🧪 Step 7: Running E2E tests...${NC}"
echo ""
echo "Environment:"
echo "   DATABASE_URL: postgresql://postgres:***@localhost:5433/streamline_test"
echo "   E2E_TEST_MODE: $E2E_TEST_MODE"
echo "   MODE: $MODE"
echo "   DATA_DIR: $DATA_DIR"
echo "   NODE_ENV: $NODE_ENV"
echo ""

# Run Playwright tests with CI configuration
npx playwright test --project=chromium --retries=1

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ E2E tests completed in CI mode!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
