# Track D — Meta Ads Integration (Execution Layer)

Complete implementation of Meta Marketing API integration for Ad Infinitum, providing campaign creation, ad management, metrics retrieval, and lead webhook handling.

## Overview

This track implements the execution layer that connects Ad Infinitum to Meta's advertising platform via the Pipeboard MCP API. It provides a clean TypeScript interface for:

- **Creating ads**: Full workflow from image upload → campaign → ad set → creative → ad
- **Retrieving metrics**: Pull performance data (impressions, clicks, leads, spend, CPL)
- **Webhook handling**: Process lead form submissions from Meta
- **Mock mode**: Development and testing without hitting rate limits

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Ad Infinitum Backend                      │
│                     (Track A, B, C)                          │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ Uses AdVariant
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 MetaAdsClient (Track D)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  createAd()  │  │ getMetrics() │  │  Mock Mode   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ JSON-RPC 2.0
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Pipeboard MCP API                               │
│         (mcp.pipeboard.co/meta-ads-mcp)                      │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ Meta Marketing API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Meta Ads Platform                         │
│    (Campaigns, Ad Sets, Creatives, Ads, Insights)           │
└─────────────────────────────────────────────────────────────┘
```

## Files

```
backend-raindrop/src/services/
├── meta-ads-client.ts       # Main Meta Ads client
├── meta-webhook.ts          # Lead form webhook handler
├── meta-types.ts            # TypeScript type definitions
├── meta-ads-example.ts      # Usage examples
└── index.ts                 # Exports (updated)
```

## Quick Start

### 1. Environment Setup

Add to `.env`:

```bash
# Required for real Meta API calls
PIPEBOARD_API_TOKEN=pk_your_token_here
META_AD_ACCOUNT_ID=act_123456789012345
META_PAGE_ID=987654321098765

# Optional for webhook verification
META_WEBHOOK_VERIFY_TOKEN=your_verify_token
META_APP_SECRET=your_app_secret
```

### 2. Basic Usage

```typescript
import { createMetaAdsClient, metricsToSnapshot } from './services';
import type { AdVariant } from './models/ad-variant';

// Initialize client
const metaClient = createMetaAdsClient({ mockMode: false });

// Create an ad from AdVariant
const variant: AdVariant = {
  id: 'ad_123',
  experiment_id: 'exp_456',
  product_id: 'pc_789',
  platform: 'meta',
  headline: 'Transform Your Workspace',
  body: 'Discover the AI-powered desk companion...',
  image_url: 'https://example.com/image.png',
  cta: 'Sign up',
  status: 'draft',
  created_by: 'agent',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Create ad on Meta
const result = await metaClient.createAd(variant, {
  dailyBudget: 1500, // $15/day
  ctaUrl: 'https://myproduct.com/signup',
  targeting: {
    age_min: 25,
    age_max: 45,
    genders: [1, 2],
    geo_locations: { countries: ['US', 'CA'] },
    publisher_platforms: ['facebook', 'instagram'],
  },
});

console.log('Created:', result.adId);

// Get metrics
const metrics = await metaClient.getMetrics([result.adId]);

// Convert to snapshot format
const snapshot = metricsToSnapshot(result.adId, metrics[0]);
```

## API Reference

### MetaAdsClient

#### `createAd(variant, options?)`

Creates a complete ad on Meta from an AdVariant.

**Parameters:**
- `variant: AdVariant` - Ad variant from Track C
- `options?: CreateAdOptions`
  - `dailyBudget?: number` - Daily budget in cents (default: 1500 = $15)
  - `targeting?: TargetingSpec` - Audience targeting
  - `ctaUrl?: string` - Call-to-action destination URL

**Returns:** `Promise<CreateAdResult>`
```typescript
{
  campaignId: string;
  adsetId: string;
  creativeId: string;
  adId: string;
  imageHash?: string;
}
```

**Workflow:**
1. Upload image to Meta
2. Create campaign (or reuse existing)
3. Create ad set with targeting
4. Create ad creative
5. Create ad

**Example:**
```typescript
const result = await metaClient.createAd(variant, {
  dailyBudget: 2000,
  ctaUrl: 'https://product.com/signup',
  targeting: {
    age_min: 28,
    age_max: 44,
    genders: [2], // Female
    geo_locations: { countries: ['US', 'CA'] },
    detailed_targeting: {
      interests: [
        { id: '6003139266461', name: 'Journaling' },
      ],
    },
  },
});
```

#### `getMetrics(adIds, timeRange?)`

Retrieve performance metrics for one or more ads.

**Parameters:**
- `adIds: string[]` - Meta ad IDs to fetch metrics for
- `timeRange?: { since: string; until: string }` - Date range (YYYY-MM-DD)

**Returns:** `Promise<AdMetrics[]>`
```typescript
{
  ad_id: string;
  ad_name: string;
  impressions: number;
  clicks: number;
  leads: number;
  spend_usd: number;
  ctr: number;
  cpl_usd?: number;
  cpc_usd?: number;
}
```

**Example:**
```typescript
const metrics = await metaClient.getMetrics(
  ['123456789', '987654321'],
  { since: '2025-11-08', until: '2025-11-15' }
);

metrics.forEach(m => {
  console.log(`${m.ad_name}: CPL $${m.cpl_usd?.toFixed(2)}`);
});
```

### Webhook Handler

#### `MetaWebhookHandler`

Handles Meta Lead Ads webhooks for real-time lead capture.

**Setup:**
```typescript
import { createWebhookHandler } from './services';

const webhookHandler = createWebhookHandler();

// Webhook endpoint (GET - verification)
app.get('/webhooks/meta', (req, res) => {
  const { mode, token, challenge } = req.query;
  const result = webhookHandler.verifySubscription({ mode, token, challenge });

  if (result) {
    res.send(result);
  } else {
    res.status(403).send('Forbidden');
  }
});

// Webhook endpoint (POST - events)
app.post('/webhooks/meta', async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const payload = JSON.stringify(req.body);
  const accessToken = process.env.META_ACCESS_TOKEN;

  try {
    const leads = await webhookHandler.processWebhook(
      payload,
      signature,
      accessToken
    );

    // Process leads...
    for (const lead of leads) {
      console.log('New lead:', lead.leadId);
      console.log('Email:', lead.fieldData.email);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});
```

## Mock Mode

For development and testing without hitting Meta API rate limits:

```typescript
// Create client in mock mode
const metaClient = createMetaAdsClient({ mockMode: true });

// All operations work, but return mock data
const result = await metaClient.createAd(variant);
// Returns: { campaignId: 'mock_campaign_...', adId: 'mock_ad_...', ... }

const metrics = await metaClient.getMetrics(['ad_123']);
// Returns: [{ impressions: 5432, clicks: 234, leads: 12, ... }]
```

Mock mode:
- ✅ No API calls to Meta
- ✅ Instant responses
- ✅ Realistic random data
- ✅ Same interface as real mode
- ✅ Perfect for development & testing

## Integration with Other Tracks

### From Track C (Ad Variant Generator)

Track C creates `AdVariant` objects. Track D consumes them:

```typescript
// Track C creates variants
const variants = await adVariantGenerator.generateVariants(productConcept);

// Track D creates ads on Meta
for (const variant of variants) {
  const result = await metaClient.createAd(variant);

  // Update variant with Meta IDs
  variant.meta_campaign_id = result.campaignId;
  variant.meta_adset_id = result.adsetId;
  variant.meta_ad_id = result.adId;
}
```

### To Track A & B (Orchestration & Analytics)

Track D provides metrics that Track A/B use for decision-making:

```typescript
// Track D pulls metrics
const metrics = await metaClient.getMetrics(adIds);

// Track A/B uses for orchestration
for (const metric of metrics) {
  const snapshot = metricsToSnapshot(metric.ad_id, metric);
  const fullSnapshot = calculateDerivedMetrics(snapshot);

  // Decision logic
  if (fullSnapshot.cpl_usd && fullSnapshot.cpl_usd <= 1.0 && fullSnapshot.leads >= 10) {
    // ✅ Winner! Scale up
    console.log('Ad validated:', metric.ad_id);
    // Trigger landing page creation, etc.
  } else if (fullSnapshot.cpl_usd && fullSnapshot.cpl_usd > 5.0) {
    // ❌ Underperforming, pause
    console.log('Ad killed:', metric.ad_id);
  }
}
```

## Type System

All Meta API types are defined in `meta-types.ts`:

```typescript
import type {
  TargetingSpec,
  CallToActionType,
  AdMetrics,
  InsightsRecord,
  LeadgenWebhookPayload,
} from './services/meta-types';
```

Key types:
- **TargetingSpec**: Audience targeting configuration
- **AdMetrics**: Performance metrics for an ad
- **CreateAdResult**: Result of creating an ad
- **ParsedLead**: Processed lead from webhook

## Error Handling

The client handles common Meta API errors:

```typescript
try {
  const result = await metaClient.createAd(variant);
} catch (error) {
  if (error.message.includes('rate limit')) {
    console.log('Rate limited, switch to mock mode or retry later');
  } else if (error.message.includes('HTTP 401')) {
    console.log('Invalid API token');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

**Common errors:**
- `Invalid webhook signature` - Check `META_APP_SECRET`
- `HTTP 401: Unauthorized` - Check `PIPEBOARD_API_TOKEN`
- `Failed to fetch metrics` - Ad may not have data yet
- `Missing required environment variables` - Check `.env`

## Examples

Run the example script:

```bash
cd backend-raindrop
npx tsx src/services/meta-ads-example.ts
```

Examples include:
1. Creating ads from AdVariant
2. Fetching metrics
3. Converting to snapshot format
4. Full workflow (create → metrics → decision)
5. Real vs mock mode comparison

## Testing Checklist

- [x] MetaAdsClient initializes from env vars
- [x] createAd() creates campaign/adset/creative/ad
- [x] getMetrics() fetches performance data
- [x] Mock mode works without API calls
- [x] Webhook handler verifies signatures
- [x] Webhook handler parses lead data
- [x] metricsToSnapshot() converts format correctly
- [x] Type definitions are complete
- [x] Error handling is robust
- [x] Integration with AdVariant model works

## Performance Notes

**Rate Limits:**
- Pipeboard MCP handles Meta's rate limits internally
- If you hit limits, switch to mock mode temporarily
- Production: implement exponential backoff

**Optimization:**
- Batch metric fetches (up to 100 ads)
- Cache campaign/adset IDs to reuse
- Use webhooks for real-time leads instead of polling

## Deliverables (Completed)

✅ **Meta Marketing API service**
- Campaign creation
- Ad set creation
- Creative upload
- Ad creation
- Metrics retrieval

✅ **Webhook support**
- Lead form subscription verification
- Webhook signature validation
- Lead data parsing

✅ **Mock mode**
- Development without API calls
- Realistic test data

✅ **Exposes:**
- `metaClient.createAd(variant, options)`
- `metaClient.getMetrics(adIds, timeRange)`

✅ **Inputs:** AdVariants from Track C

✅ **Outputs:** Metrics → Track A & B

## Next Steps

1. **Connect to Track A/B**: Wire up the orchestration loop
2. **Add Actor**: Create `AdExperimentActor` using this client
3. **Add Observer**: Create `MetricsCollectorObserver` for polling
4. **Deploy webhooks**: Set up webhook endpoint on production
5. **Monitor & optimize**: Track CPL, pause losers, scale winners

## Support

- Example script: `src/services/meta-ads-example.ts`
- Python reference: `sponsor-example-scripts/meta/`
- Design doc: `docs/guides/v1-design.md`
- Pipeboard docs: Check the example scripts in the meta directory

---

**Track D Status:** ✅ Complete

Owner: API-comfortable engineer
Implementation: TypeScript + Pipeboard MCP
Integration: Ready for Track A/B/C
