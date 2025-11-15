#!/bin/bash
# Wrapper script to run the core pipeline test
# This ensures we're in the right directory and have the right paths

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

echo "🚀 Ad Infinitum Core Pipeline Test"
echo "Repository root: $REPO_ROOT"
echo ""

# Check if .env exists
if [ ! -f "$REPO_ROOT/.env" ]; then
    echo "❌ Error: .env file not found at $REPO_ROOT/.env"
    echo "   Please create one based on the template"
    exit 1
fi

# Check if node_modules exists in backend
if [ ! -d "$REPO_ROOT/repo_src/backend-raindrop/node_modules" ]; then
    echo "⚠️  Warning: Dependencies not installed"
    echo "   Installing dependencies..."
    cd "$REPO_ROOT/repo_src/backend-raindrop"
    npm install
    cd "$REPO_ROOT"
fi

# Run the test script using tsx from the backend's node_modules
cd "$REPO_ROOT"
exec "$REPO_ROOT/repo_src/backend-raindrop/node_modules/.bin/tsx" \
    "$SCRIPT_DIR/test-core-pipeline.ts" "$@"
