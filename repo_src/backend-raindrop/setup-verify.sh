#!/bin/bash
# Setup verification script for backend-raindrop

echo "🔍 Verifying Ad Infinitum Backend Setup..."
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node --version)
echo "   Node.js: $NODE_VERSION"
if [[ ! "$NODE_VERSION" =~ ^v1[8-9]\. ]] && [[ ! "$NODE_VERSION" =~ ^v[2-9][0-9]\. ]]; then
    echo "   ⚠️  Warning: Node.js 18+ recommended"
fi
echo ""

# Check npm
echo "📦 Checking npm..."
NPM_VERSION=$(npm --version)
echo "   npm: $NPM_VERSION"
echo ""

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo "✅ Dependencies installed (node_modules found)"
else
    echo "❌ Dependencies not installed"
    echo "   Run: npm install"
    exit 1
fi
echo ""

# Check if .env exists
if [ -f ".env" ]; then
    echo "✅ .env file exists"

    # Check for required API keys
    echo ""
    echo "🔑 API Keys Configuration:"

    if grep -q "FREEPIK_API_KEY=.\+" .env; then
        echo "   ✅ FREEPIK_API_KEY configured"
    else
        echo "   ⚠️  FREEPIK_API_KEY not configured"
    fi

    if grep -q "OPENROUTER_API_KEY=.\+" .env; then
        echo "   ✅ OPENROUTER_API_KEY configured"
    else
        echo "   ℹ️  OPENROUTER_API_KEY not configured (only needed if LLM_PROVIDER=openrouter)"
    fi

    if grep -q "FAL_KEY=.\+" .env; then
        echo "   ℹ️  FAL_KEY configured"
    else
        echo "   ℹ️  FAL_KEY not configured (only needed if IMAGE_PROVIDER=fal)"
    fi
else
    echo "❌ .env file not found"
    echo "   Run: cp .env.example .env"
    echo "   Then edit .env with your API keys"
    exit 1
fi
echo ""

# Check TypeScript compilation
echo "🔨 Checking TypeScript..."
if npm run build > /dev/null 2>&1; then
    echo "   ✅ TypeScript compilation successful"
else
    echo "   ⚠️  TypeScript compilation issues (non-critical for dev)"
fi
echo ""

# Summary
echo "================================"
echo "✅ Setup verification complete!"
echo "================================"
echo ""
echo "🚀 To start the development server:"
echo "   npm run dev"
echo ""
echo "📖 Quick test commands:"
echo "   curl http://localhost:8787/health"
echo "   curl http://localhost:8787/internal/config"
echo ""
echo "📚 Documentation:"
echo "   - QUICK_START.md - Getting started guide"
echo "   - README.md - Full documentation"
echo "   - API_DOCS.md - API reference"
echo ""
