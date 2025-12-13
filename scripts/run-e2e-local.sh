#!/bin/bash

# Local E2E Test Runner
# This script sets up the test environment and runs Playwright tests locally
#
# Usage:
#   ./scripts/run-e2e-local.sh          # Run all E2E tests
#   ./scripts/run-e2e-local.sh --smoke  # Run smoke tests only
#   ./scripts/run-e2e-local.sh --ui     # Run in UI mode
#   ./scripts/run-e2e-local.sh --debug  # Run in debug mode

set -e  # Exit on error

echo "🔧 Setting up local E2E test environment..."

# 1. Check if test database exists
echo "📊 Checking test database..."
if ! docker exec streamline-db psql -U streamline -lqt | cut -d \| -f 1 | grep -qw streamline_test; then
    echo "❌ Test database 'streamline_test' not found!"
    echo "Please create it first with:"
    echo "  docker exec streamline-db createdb -U streamline streamline_test"
    exit 1
fi

# 2. Load test environment
if [ -f .env.test.local ]; then
    echo "✅ Loading test environment from .env.test.local"
    export $(grep -v '^#' .env.test.local | xargs)
else
    echo "❌ .env.test.local not found!"
    echo "Please create it with test database credentials"
    exit 1
fi

# 3. Run migrations on test database
echo "🔄 Running migrations on test database..."
npm run db:migrate

# 4. Stop any process on port 3000 to ensure clean test environment
echo "🔍 Checking port 3000..."
PORT_3000_PID=$(lsof -ti:3000 || echo "")
if [ ! -z "$PORT_3000_PID" ]; then
    echo "⚠️  Port 3000 is in use by process $PORT_3000_PID"
    echo ""
    echo "This script needs to start a fresh dev server on port 3000 for testing."
    echo "Options:"
    echo "  1. Kill the process and continue (recommended)"
    echo "  2. Exit and manually stop the process"
    echo ""
    read -p "Kill process $PORT_3000_PID and continue? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Stopping process $PORT_3000_PID..."
        kill $PORT_3000_PID
        sleep 2
        echo "✅ Port 3000 is now free"
    else
        echo "Exiting. Please stop the process on port 3000 and re-run this script."
        exit 1
    fi
fi

# 5. Configure Playwright to start a fresh server
export PLAYWRIGHT_NO_REUSE=1

# 6. Run Playwright tests with test environment
echo "🎭 Running Playwright tests..."
echo "   Database: $DATABASE_URL"
echo "   Mode: $MODE"
echo "   Starting fresh dev server (not reusing existing server)"
echo ""

if [ "$1" == "--smoke" ]; then
    npm run test:smoke
elif [ "$1" == "--ui" ]; then
    npm run test:e2e:ui
elif [ "$1" == "--debug" ]; then
    npm run test:e2e:debug
else
    npm run test:e2e
fi

echo "✅ Tests complete!"
