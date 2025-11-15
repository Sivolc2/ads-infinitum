# Monorepo Integration Guide

This document explains how `backend-raindrop` integrates with the Ad Infinitum monorepo.

## Architecture

```
ads-infinitum/
├── repo_src/
│   ├── backend/          # Python FastAPI backend
│   └── frontend/         # React frontend
├── backend-raindrop/     # Raindrop backend (Track A/C/E) ⭐
├── package.json          # Root workspace config
├── turbo.json            # Turbo build pipeline
└── pnpm-workspace.yaml   # pnpm workspace config
```

## Workspace Setup

The backend-raindrop is configured as a pnpm workspace:

**Root `package.json`:**
```json
{
  "workspaces": [
    "repo_src/*",
    "backend-raindrop"
  ]
}
```

## Available Commands

### From Repository Root

```bash
# Start all services (including backend-raindrop)
pnpm dev

# Start only backend-raindrop
pnpm dev:raindrop

# Build all workspaces
pnpm build

# Lint all workspaces
pnpm lint

# Type check all workspaces
pnpm typecheck
```

### From backend-raindrop Directory

```bash
cd backend-raindrop

# Development server (with hot reload)
npm run dev

# Build for production
npm run build

# Deploy to Raindrop cloud
npm run deploy

# Verify setup
./setup-verify.sh
```

## Integration with Turbo

The backend-raindrop integrates with Turbo's build pipeline:

**`turbo.json` configuration:**
```json
{
  "pipeline": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  }
}
```

This means:
- `pnpm dev` runs all services in parallel (persistent mode)
- `pnpm build` builds in dependency order
- Backend-raindrop builds are cached for efficiency

## Service Communication

### Frontend → Backend

The frontend can communicate with backend-raindrop:

```typescript
// From frontend code
const API_BASE = process.env.VITE_BACKEND_URL || 'http://localhost:8787';

// Fetch products
const response = await fetch(`${API_BASE}/api/products`);
const { data } = await response.json();
```

### Python Backend → Raindrop Backend

The Python backend can call backend-raindrop APIs:

```python
import httpx

RAINDROP_API = "http://localhost:8787"

async def create_product(product_data):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{RAINDROP_API}/api/products",
            json=product_data
        )
        return response.json()
```

## Environment Variables

### Root `.env`
Add these to your root `.env` file:

```bash
# Backend-raindrop URL (for frontend)
VITE_BACKEND_URL=http://localhost:8787

# (other existing env vars)
```

### Backend-raindrop `.env`
The `backend-raindrop/.env` file is separate:

```bash
# See backend-raindrop/.env.example for all options
LLM_PROVIDER=raindrop
IMAGE_PROVIDER=freepik
FREEPIK_API_KEY=your_key_here
```

## Development Workflow

### 1. Initial Setup

```bash
# From root
pnpm install

# Set up backend-raindrop
cd backend-raindrop
cp .env.example .env
# Edit .env with your API keys
cd ..
```

### 2. Start Development

```bash
# Option A: Start everything
pnpm dev

# Option B: Start services individually
pnpm dev:frontend        # React frontend only
pnpm dev:backend         # Python backend only
pnpm dev:raindrop        # Raindrop backend only
```

### 3. Access Services

- **Frontend**: http://localhost:3000
- **Python Backend**: http://localhost:8000
- **Raindrop Backend**: http://localhost:8787

## Port Configuration

| Service | Default Port | Env Variable | Config File |
|---------|-------------|--------------|-------------|
| Frontend | 3000 | `PORT` | `repo_src/frontend/vite.config.ts` |
| Python Backend | 8000 | `PORT` | `repo_src/backend/main.py` |
| Raindrop Backend | 8787 | `PORT` | `backend-raindrop/.env` |

## Turbo Caching

Turbo caches build outputs for faster rebuilds:

```bash
# View cache status
pnpm turbo run build --dry-run

# Clear cache
pnpm turbo run build --force

# Disable cache for a specific run
pnpm turbo run build --no-cache
```

## Production Deployment

### Deploy All Services

```bash
# Build all workspaces
pnpm build

# Deploy individually
cd backend-raindrop && npm run deploy  # Raindrop cloud
cd repo_src/backend && # Deploy Python backend
cd repo_src/frontend && # Deploy frontend
```

### Deploy Only Raindrop Backend

```bash
cd backend-raindrop
npm run deploy
```

This deploys to: `https://<your-app>.raindrop.dev`

## Troubleshooting

### Port Conflicts

If ports are already in use:

```bash
# Check what's using the port
lsof -i :8787

# Kill the process
kill -9 <PID>

# Or use the reset script
pnpm reset
```

### Workspace Linking Issues

If modules aren't resolving:

```bash
# From root
pnpm install --force

# Rebuild all workspaces
pnpm build
```

### Environment Variables Not Loading

Ensure you have `.env` files in:
- Root directory: `ads-infinitum/.env`
- Backend directory: `backend-raindrop/.env`

```bash
# Check env files
ls -la .env backend-raindrop/.env

# Verify variables are loaded
cd backend-raindrop && npm run dev
# Check the startup logs for configuration
```

## Testing Integration

### Test Inter-Service Communication

```bash
# Start all services
pnpm dev

# In another terminal, test the flow:

# 1. Create a product via Raindrop API
curl -X POST http://localhost:8787/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Product",
    "tagline": "Integration test",
    "description": "Testing monorepo integration",
    "hypothesis": "It will work",
    "target_audience": "Developers",
    "status": "draft",
    "created_by": "human"
  }'

# 2. List products
curl http://localhost:8787/api/products

# 3. Check health
curl http://localhost:8787/health
```

### Test from Frontend

If you have a frontend component:

```typescript
// Test API integration
const testIntegration = async () => {
  const response = await fetch('http://localhost:8787/health');
  const data = await response.json();
  console.log('Raindrop backend:', data);
};
```

## CI/CD Integration

For GitHub Actions or similar:

```yaml
name: Build and Test

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build all workspaces
        run: pnpm build

      - name: Run tests
        run: pnpm test

      - name: Type check
        run: pnpm typecheck
```

## Package Scripts Reference

### Root Package Scripts

```json
{
  "dev": "turbo run dev",
  "dev:raindrop": "cd backend-raindrop && npm run dev",
  "build": "turbo run build",
  "lint": "turbo run lint",
  "typecheck": "turbo run typecheck",
  "test": "turbo run test"
}
```

### Backend-Raindrop Package Scripts

```json
{
  "dev": "tsx dev-server.ts",
  "dev:raindrop": "raindrop dev",
  "build": "raindrop build",
  "deploy": "raindrop deploy"
}
```

## Best Practices

1. **Always install from root**: Use `pnpm install` from root, not `npm install` in individual workspaces
2. **Use workspace protocols**: When referencing workspace packages, use `workspace:*` in package.json
3. **Environment isolation**: Keep separate `.env` files for each service
4. **Port management**: Use different ports for each service (3000, 8000, 8787)
5. **Turbo caching**: Let Turbo handle caching, don't manually manage `dist/` folders

## Further Reading

- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Turbo Documentation](https://turbo.build/repo/docs)
- [Raindrop Framework](https://raindrop.dev/docs)
- Project README files in each workspace

---

**Questions?** Check the individual README files in each workspace directory.
