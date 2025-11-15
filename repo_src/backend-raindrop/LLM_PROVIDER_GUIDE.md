# LLM Provider Toggle Guide

## Overview

The Ad Infinitum backend supports **two LLM providers** for ad copy generation:

1. **Raindrop AI** (default, recommended) - Uses Raindrop's built-in `deepseek-r1` model
2. **OpenRouter** (fallback) - Uses external OpenRouter API with `claude-3.5-sonnet`

This guide explains how to configure and switch between providers.

---

## Quick Start

### Using Raindrop AI (Default)

**No configuration needed!** The backend uses Raindrop AI by default.

```bash
# Set in .env or raindrop.manifest
LLM_PROVIDER=raindrop  # Default, can be omitted
FAL_API_KEY=your_fal_key_here
```

**Advantages:**
- ✅ No external API keys needed
- ✅ Lower latency (runs on Raindrop infrastructure)
- ✅ Uses `deepseek-r1` model
- ✅ Preferred by Raindrop team
- ✅ No additional costs

### Using OpenRouter (Alternative)

To use OpenRouter instead:

```bash
# Set in .env or raindrop.manifest
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=your_openrouter_key_here
FAL_API_KEY=your_fal_key_here
```

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LLM_PROVIDER` | No | `raindrop` | `raindrop` or `openrouter` |
| `OPENROUTER_API_KEY` | Only if `openrouter` | - | OpenRouter API key |
| `FAL_API_KEY` | Yes | - | fal.ai API key for images |

---

## How It Works

The system automatically detects which provider to use based on `LLM_PROVIDER` environment variable:

```typescript
// Raindrop AI (default)
const aiResponse = await env.AI.run('deepseek-r1', {
  model: 'deepseek-r1',
  messages: [/* prompts */],
  response_format: { type: 'json_object' }
});

// OpenRouter (alternative)
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  body: JSON.stringify({
    model: 'anthropic/claude-3.5-sonnet',
    messages: [/* prompts */]
  })
});
```

---

## Testing

### Check Current Configuration

```bash
curl http://localhost:8787/internal/config
```

**Response:**
```json
{
  "llm_provider": "Raindrop AI (deepseek-r1)",
  "environment": {
    "llm_provider": "raindrop",
    "has_raindrop_ai": true,
    "llm_status": "✅ Raindrop AI available"
  },
  "notes": [
    "Set LLM_PROVIDER=raindrop to use Raindrop AI (default)",
    "Set LLM_PROVIDER=openrouter to use OpenRouter instead"
  ]
}
```

### Test Ad Generation

```bash
curl -X POST http://localhost:8787/internal/generate-ad-variants \
  -H "Content-Type: application/json" \
  -d '{
    "product_concept": {
      "id": "pc_test",
      "title": "AI Desk Companion",
      "description": "Smart productivity device",
      "target_audience": "Remote workers",
      "hypothesis": "Helps focus and organization",
      "status": "draft",
      "created_by": "human",
      "created_at": "2025-11-15T00:00:00Z",
      "updated_at": "2025-11-15T00:00:00Z"
    },
    "num_variants": 2
  }'
```

Watch logs:
```
📦 Generating ad variants using Raindrop AI (deepseek-r1)
📝 Step 1/3: Generating ad copy with Raindrop AI (deepseek-r1)...
```

---

## Files Modified

```
backend-raindrop/
├── src/
│   ├── api/index.ts                      # LLM provider detection
│   └── services/
│       ├── raindrop-llm.ts               # NEW: Raindrop AI service
│       ├── openrouter.ts                 # Existing OpenRouter
│       ├── ad-variant-generator.ts       # Supports both providers
│       └── index.ts                      # Exports
└── LLM_PROVIDER_GUIDE.md                 # This doc
```

---

## Storage: SmartBucket & SmartSQL

The backend uses **Raindrop's native storage**:

- **SmartBucket**: Used for object storage (products, experiments, ad variants)
- **SmartSQL**: Available for SQL queries (natural language or raw SQL)

All services already use SmartBucket via `env.AD_DATA`. No changes needed!

---

## Troubleshooting

### "Raindrop AI not available"

**Solution:** Switch to OpenRouter or check raindrop.manifest has AI binding:
```json
"bindings": { "AI": { "type": "ai" } }
```

### "OPENROUTER_API_KEY must be configured"

**Solution:** Set the API key:
```bash
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-your-key
```

---

## Comparison

| Feature | Raindrop AI | OpenRouter |
|---------|------------|------------|
| **Model** | deepseek-r1 | claude-3.5-sonnet |
| **Setup** | Zero config | API key required |
| **Cost** | Included | Pay-per-use |
| **Latency** | Lower | Higher |
| **Recommended** | ✅ Yes | Testing only |

---

**Default:** Raindrop AI (deepseek-r1)
**Status:** ✅ Ready for production
