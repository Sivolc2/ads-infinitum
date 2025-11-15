# Quick Start Guide - Track A Backend

Get the Ad Infinitum backend running in 5 minutes.

## Prerequisites

- Node.js >= 18
- npm or pnpm
- Raindrop CLI (`npm install -g @liquidmetal-ai/raindrop-cli`)
- Raindrop account (`raindrop login`)

## Installation Steps

### 1. Install Dependencies

```bash
cd backend-raindrop
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
- Get OpenRouter API key: https://openrouter.ai/keys
- Get fal.ai API key: https://fal.ai/dashboard
- Get Meta Access Token: https://developers.facebook.com/tools/explorer

### 3. Run Development Server

```bash
npm run dev
```

Your backend will be available at `http://localhost:8787`

### 4. Test the API

```bash
# Health check
curl http://localhost:8787/health

# Create a product
curl -X POST http://localhost:8787/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Product",
    "tagline": "Testing Track A",
    "description": "A test product concept",
    "hypothesis": "This will work",
    "target_audience": "Developers",
    "status": "draft",
    "created_by": "human"
  }'

# List products
curl http://localhost:8787/api/products
```

## Available Endpoints

Track A endpoints:
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `GET /api/experiments?product_id=...` - List experiments
- `POST /api/experiments` - Create experiment
- `POST /api/leads` - Ingest lead

Track C endpoints:
- `POST /internal/generate-ad-variants` - Generate ad variants
- `GET /internal/estimate-cost` - Estimate generation cost

See [API_DOCS.md](./API_DOCS.md) for complete reference.

## Deploy to Production

```bash
npm run deploy
```

Your API will be live at: `https://<your-app>.raindrop.dev`

## Troubleshooting

**"Module not found"**
- Run `npm install` again
- Check that you're in the `backend-raindrop` directory

**"Raindrop not found"**
- Install the CLI: `npm install -g @liquidmetal-ai/raindrop-cli`
- Login: `raindrop login`

**"API key not configured"**
- Make sure `.env` exists and has the required keys
- Restart the dev server after changing `.env`

## Next Steps

1. Read [README.md](./README.md) for full documentation
2. Check [API_DOCS.md](./API_DOCS.md) for API reference
3. Integrate with Track C for ad generation
4. Connect to Track D for Meta Ads
5. Wire up Track E orchestrator

## Support

- Raindrop Docs: https://raindrop.dev/docs
- Project Issues: (your GitHub repo)
