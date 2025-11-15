# Ad Infinitum Backend

This is the unified backend implementation for the Ad Infinitum hackathon project, combining:
- **Track A: Backend Core** - Data models, services, and RESTful API
- **Track C: Ad Creation Engine** - AI-powered ad variant generation

## Track A: Backend Core

Track A provides the foundational data layer and API for the entire Ad Infinitum platform.

### Data Models

Track A defines the following core models (see `src/models/`):

- **ProductConcept**: Product ideas to test
- **AdExperiment**: Ad testing campaigns
- **AdVariant**: Individual ad creatives
- **AdMetricsSnapshot**: Performance data
- **Lead**: Captured user interest
- **UserProfile**: Enriched lead data
- **LandingPage**: Product landing pages
- **BuildContract**: Handoff to builders

### Services

- **ProductService**: CRUD for product concepts
- **AdExperimentManager**: Manage experiments and variants
- **MetricsCollectorService**: Collect and analyze metrics
- **LeadIngestionService**: Capture and enrich leads

### API Endpoints

Track A exposes RESTful endpoints for all resources:
- `/api/products/*` - Product management
- `/api/experiments/*` - Experiment management
- `/api/leads/*` - Lead capture

See [API_DOCS.md](./API_DOCS.md) for complete API reference.

---

## Track C: Ad Creation Engine

The Ad Creation Engine takes a `ProductConcept` and generates complete, ready-to-deploy ad variants including:
- **Headline** - Attention-grabbing, mobile-optimized (max 40 chars)
- **Body Copy** - Compelling benefits and social proof (125-150 chars)
- **CTA** - Clear call-to-action ("Sign Up", "Learn More", etc.)
- **Hero Image** - AI-generated product visual optimized for Meta ads

Each variant tests a **different value proposition** or emotional angle to maximize learning from ad experiments.

## Architecture

```
POST /internal/generate-ad-variants
        ↓
ProductConcept → OpenRouter (Claude 3.5) → 3-6 Copy Variations
                                                    ↓
                                            Extract Value Props
                                                    ↓
                                            fal.ai (FLUX.1) → Hero Images
                                                    ↓
                                            Assemble AdVariants
                                                    ↓
                                            Return Complete Variants
```

## Project Structure

```
backend-raindrop/
├── src/
│   ├── api/
│   │   └── index.ts              # Main API (Track A + C endpoints)
│   ├── models/                   # Track A data models
│   │   ├── product.ts
│   │   ├── experiment.ts
│   │   ├── ad-variant.ts
│   │   ├── metrics.ts
│   │   ├── lead.ts
│   │   ├── user-profile.ts
│   │   ├── landing-page.ts
│   │   ├── build-contract.ts
│   │   ├── types.ts              # Track C types
│   │   └── index.ts
│   ├── services/                 # Track A + C services
│   │   ├── product-service.ts    # Track A
│   │   ├── experiment-service.ts # Track A
│   │   ├── metrics-service.ts    # Track A
│   │   ├── lead-service.ts       # Track A
│   │   ├── openrouter.ts         # Track C
│   │   ├── fal.ts                # Track C
│   │   └── ad-variant-generator.ts  # Track C
│   └── utils/
│       └── id-generator.ts
├── package.json
├── tsconfig.json
├── raindrop.manifest             # Raindrop configuration
├── .env.example
├── README.md                     # This file
└── API_DOCS.md                   # Complete API reference
```

## Setup

### 1. Install Dependencies

```bash
cd backend-raindrop
npm install
```

### 2. Configure Environment Variables

Create or update your `.env` file in the project root:

```bash
# OpenRouter API key (get from https://openrouter.ai)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# fal.ai API key (get from https://fal.ai)
FAL_API_KEY=your_fal_api_key_here

# Meta Ads credentials (if using Track D integration)
META_AD_ACCOUNT_ID=act_xxxxx
META_PAGE_ID=xxxxx
```

### 3. Run Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:8787` (or the port configured by Raindrop).

## API Endpoints

### 1. Generate Ad Variants

**Endpoint:** `POST /internal/generate-ad-variants`

Generate complete ad variants (copy + images) for a product concept.

**Request:**
```json
{
  "product_concept": {
    "id": "pc_1731686400000_a3f9",
    "title": "AI Desk Companion",
    "tagline": "Your smart productivity partner",
    "description": "An AI-powered desk device that helps you stay focused, organized, and productive throughout your workday.",
    "hypothesis": "Remote workers struggle with distraction and task management. This product provides ambient AI assistance without being intrusive.",
    "target_audience": "Remote workers and digital nomads, ages 25-45, who value productivity and wellness",
    "status": "draft",
    "created_by": "human",
    "created_at": "2025-11-15T12:00:00Z",
    "updated_at": "2025-11-15T12:00:00Z"
  },
  "experiment_id": "exp_1731686400000_b2c1",  // optional
  "num_variants": 3  // optional, default: 3
}
```

**Response:**
```json
{
  "success": true,
  "variants": [
    {
      "id": "ad_1731686400000_c3d2",
      "experiment_id": "exp_1731686400000_b2c1",
      "product_id": "pc_1731686400000_a3f9",
      "platform": "meta",
      "headline": "Stop drowning in tabs 🌊",
      "body": "AI Desk Companion silently organizes your work while you focus. 10k+ remote workers already crushing their to-do lists. Join them.",
      "image_url": "https://fal.media/files/...",
      "cta": "Join Waitlist",
      "status": "draft",
      "created_by": "agent",
      "created_at": "2025-11-15T12:05:00Z",
      "updated_at": "2025-11-15T12:05:00Z",
      "generation_metadata": {
        "value_proposition": "productivity & focus",
        "image_width": 1200,
        "image_height": 900,
        "generated_at": "2025-11-15T12:05:00Z"
      }
    }
    // ... more variants
  ],
  "generated_at": "2025-11-15T12:05:00Z"
}
```

### 2. Estimate Generation Cost

**Endpoint:** `GET /internal/estimate-cost?num_variants=3`

Estimate the cost of generating ad variants (useful for budget planning).

**Response:**
```json
{
  "num_variants": 3,
  "cost_breakdown": {
    "openrouter_cost_usd": 0.0105,
    "fal_cost_usd": 0.075,
    "total_cost_usd": 0.0855
  },
  "notes": [
    "OpenRouter cost: Claude 3.5 Sonnet for copy generation",
    "fal.ai cost: FLUX.1 dev for image generation",
    "Costs are estimates and may vary based on actual token usage"
  ]
}
```

### 3. Test Product Concept

**Endpoint:** `POST /internal/test-product-concept`

Get a sample product concept for testing.

**Response:**
```json
{
  "success": true,
  "product_concept": { /* ProductConcept object */ },
  "message": "Use this product_concept in your /internal/generate-ad-variants request"
}
```

### 4. Configuration Check

**Endpoint:** `GET /internal/config`

Check service configuration and available endpoints.

### 5. Health Check

**Endpoint:** `GET /health`

Basic health check endpoint.

## Integration with Other Tracks

### Track A: Experiment Manager
Track A can call `/internal/generate-ad-variants` to get fresh ad variants for experiments:

```typescript
const response = await fetch('http://localhost:8787/internal/generate-ad-variants', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product_concept: concept,
    experiment_id: 'exp_12345',
    num_variants: 5
  })
});

const { variants } = await response.json();
// Register variants with experiment manager
```

### Track D: Meta Ads API
Track D can take the generated `AdVariant` objects and push them to Meta:

```typescript
for (const variant of variants) {
  await createMetaAd({
    account_id: META_AD_ACCOUNT_ID,
    headline: variant.headline,
    body: variant.body,
    image_url: variant.image_url,
    cta: variant.cta,
    // ... other Meta-specific config
  });
}
```

## Development

### Running Tests

```bash
npm test
```

### Type Checking

```bash
npm run typecheck
```

### Building for Production

```bash
npm run build
```

### Deploying to Raindrop

```bash
npm run deploy
```

## Cost Optimization Tips

1. **Batch Generation**: Generate multiple variants at once to amortize OpenRouter costs
2. **Cache Images**: Consider caching generated images to avoid regeneration
3. **Tune num_variants**: Start with 3 variants per concept, increase for winners
4. **Model Selection**: Switch to faster/cheaper models for iteration (e.g., GPT-4o-mini)

## Troubleshooting

### "OPENROUTER_API_KEY must be configured"
- Make sure your `.env` file has `OPENROUTER_API_KEY` set
- Get your key from https://openrouter.ai/keys

### "fal.ai generation timed out"
- fal.ai can take 30-60 seconds for image generation
- Increase the timeout or check fal.ai status at https://status.fal.ai

### "Invalid response format from OpenRouter"
- OpenRouter occasionally returns malformed JSON
- Add retry logic or check your prompt formatting

## Performance Benchmarks

Typical generation times (3 variants):
- **OpenRouter Copy Generation**: 5-10 seconds
- **fal.ai Image Generation**: 30-90 seconds (parallel)
- **Total End-to-End**: ~60-120 seconds

## Contributing

This is Track C of the Ad Infinitum hackathon project. See the main project README for overall architecture and contribution guidelines.

## License

MIT License - see main project LICENSE file

## References

- [v1-design.md](../docs/guides/v1-design.md) - Full system design
- [OpenRouter Docs](https://openrouter.ai/docs)
- [fal.ai Docs](https://fal.ai/docs)
- [Raindrop Framework](https://docs.raindrop.ai)
