# Missing Implementations & Recommendations

This document tracks what might be missing or incomplete in the backend for the core pipeline to work fully.

## ✅ Already Implemented

Based on the code review, these are confirmed working:

1. ✅ Product generation (AI + mock)
2. ✅ Ad copy generation (OpenRouter + Raindrop)
3. ✅ Image generation (Freepik + fal.ai)
4. ✅ Meta Ads client (full CRUD)
5. ✅ Metrics collection
6. ✅ Landing page service (in-memory)
7. ✅ All data models
8. ✅ API endpoints

## 🔧 Potentially Missing or Needs Verification

### 1. Storage Persistence

**Status:** ⚠️ Services use in-memory storage

**What's needed:**
- Connect ProductService to SmartSQL/SmartBuckets
- Connect ExperimentService to persistent storage
- Connect LeadService to persistent storage
- Connect MetricsService to time-series storage

**Location to check/fix:**
- `src/services/product-service.ts`
- `src/services/experiment-service.ts`
- `src/services/lead-service.ts`
- `src/services/metrics-service.ts`

**Recommendation:**
```typescript
// Current (in-memory):
private products: Map<string, ProductConcept> = new Map();

// Should be (persistent):
async get(id: string): Promise<ProductConcept | null> {
  const data = await this.storage.get(`products/${id}`);
  return data ? JSON.parse(data) : null;
}
```

### 2. Raindrop AI Context

**Status:** ⚠️ Test script doesn't have Raindrop runtime context

**What's needed:**
The test script runs outside Raindrop's runtime, so it can't access `env.AI`. This is expected.

**Workaround:**
- Use OpenRouter (LM_API_KEY) for testing
- Or use mock mode
- Real backend will have access to `c.env.AI`

**Location:**
- `test-core-pipeline.ts` line 88-92
- Uses fallback to mock generator

**Recommendation:**
✅ Already handled - script uses OpenRouter or mock when Raindrop AI not available

### 3. Meta Ads CTA URL

**Status:** ⚠️ Test script uses fallback URL

**What's needed:**
- Set AD_CTA_URL in .env
- Should point to actual landing page

**Current:**
```typescript
ctaUrl: process.env.AD_CTA_URL || 'https://example.com/reserve'
```

**Recommendation:**
Add to .env:
```bash
AD_CTA_URL=https://yoursite.com/products/${product.id}
```

### 4. Landing Page Deployment

**Status:** ⚠️ Not implemented

**What's needed:**
- Actual landing page creation (currently just data structure)
- Integration with Lovable or similar
- URL generation

**Current implementation:**
```typescript
// Only creates data structure, doesn't deploy
const landingPageData = { ... }
```

**Recommendation:**
Implement in `landing-page-service.ts`:
```typescript
async deployToLovable(productId: string): Promise<string> {
  // Generate Lovable Build-with-URL
  // POST to Lovable API
  // Return deployed URL
}
```

### 5. Metrics Evaluation Logic

**Status:** ⚠️ Not implemented in test script

**What's needed:**
- Evaluate if CPL < threshold
- Decide to pause/scale/kill ads
- Trigger landing page promotion

**Current:**
Test script just displays metrics, doesn't evaluate them

**Recommendation:**
Add to backend service:
```typescript
async evaluateExperiment(experimentId: string): Promise<Decision> {
  const metrics = await this.getMetrics(experimentId);
  const experiment = await this.getExperiment(experimentId);

  if (metrics.cpl_usd < experiment.target_cpl_threshold_usd &&
      metrics.leads >= experiment.min_leads_for_decision) {
    return { action: 'promote', reason: 'CPL threshold met' };
  }
  // ... more logic
}
```

### 6. Ad Optimization Loop

**Status:** ⚠️ Not implemented

**What's needed:**
- Periodic metrics collection
- Budget reallocation
- Variant mutation/evolution
- Winner selection

**Recommendation:**
Create `src/services/optimization-service.ts`:
```typescript
export class AdOptimizationService {
  async optimizeExperiment(experimentId: string) {
    // 1. Collect latest metrics
    // 2. Identify top performers
    // 3. Pause losing variants
    // 4. Increase budget for winners
    // 5. Generate new variants based on winners
  }
}
```

### 7. Lead Enrichment

**Status:** ⚠️ Fastino integration exists but not used in test

**What's needed:**
- Call Fastino to enrich lead data
- Extract user profile info
- Store in UserProfile

**Location:**
- `src/services/lead-service.ts` has the structure
- Need to actually call Fastino API

**Recommendation:**
```typescript
async enrichLead(leadId: string): Promise<UserProfile> {
  const lead = await this.getLead(leadId);

  const enriched = await fetch('https://fastino.ai/api/gliner-2', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${FASTINO_API_KEY}` },
    body: JSON.stringify({
      text: lead.raw_form_data,
      schema: { ... }
    })
  });

  return await this.createUserProfile({ ... });
}
```

### 8. Build Contract Generation

**Status:** ⚠️ Data model exists, generation logic not implemented

**What's needed:**
- Generate spec from winning ads + metrics
- Format for Freelancer.com/Upwork
- Actually post the job

**Recommendation:**
Add to `src/services/build-contract-service.ts`:
```typescript
async generateSpec(productId: string): Promise<string> {
  const product = await productService.get(productId);
  const winningAds = await this.getTopPerformingAds(productId);
  const userProfiles = await this.getLeadProfiles(productId);

  // Use LLM to generate detailed spec
  const spec = await llm.generate({
    prompt: `Generate build spec for: ${product.title}...`,
    context: { winningAds, userProfiles, metrics }
  });

  return spec;
}
```

### 9. Webhook for Meta Lead Forms

**Status:** ⚠️ Basic structure in `meta-webhook.ts`, may need testing

**What's needed:**
- Set up webhook endpoint
- Register with Meta
- Test lead ingestion flow

**Location:**
- `src/services/meta-webhook.ts`

**Recommendation:**
Test webhook:
```bash
curl -X POST http://localhost:8787/webhooks/meta \
  -H "Content-Type: application/json" \
  -d '{"entry": [...]}'
```

### 10. Daft Integration for Analytics

**Status:** ⚠️ Mentioned in v1-design but not implemented

**What's needed:**
- Batch analytics on metrics
- User segmentation
- Copy improvement at scale

**Recommendation:**
Create `src/services/analytics-service.ts`:
```typescript
import * as daft from '@daft-labs/sdk';

export class AnalyticsService {
  async analyzePerformance(experimentId: string) {
    const df = daft.read_json(metricsData);
    const insights = await df.prompt(
      'Analyze which ad copy resonates best with each demographic'
    );
    return insights;
  }
}
```

## 🚀 Priority Recommendations

If you need to add missing pieces, prioritize in this order:

### High Priority (Core Functionality)
1. **Storage persistence** - So data isn't lost on restart
2. **Metrics evaluation** - So ads can be optimized
3. **AD_CTA_URL configuration** - So clicks go to right place

### Medium Priority (Enhanced Features)
4. **Optimization loop** - So system improves over time
5. **Landing page deployment** - So users see product pages
6. **Lead enrichment** - So you understand your audience

### Low Priority (Future Enhancements)
7. **Build contract generation** - For handing off to builders
8. **Daft analytics** - For advanced insights
9. **Webhook testing** - Already structured, just needs testing

## 🧪 Testing Each Missing Piece

Once you implement something, add a test:

```bash
# Test storage persistence
npx tsx misc/sponsor-example-scripts/test-storage.ts

# Test metrics evaluation
npx tsx misc/sponsor-example-scripts/test-evaluation.ts

# etc.
```

## ✅ Test Script Completeness

For the test script specifically, everything needed is implemented:

- ✅ Can generate products
- ✅ Can generate ads
- ✅ Can post to Meta (or mock)
- ✅ Can retrieve metrics
- ✅ Can prepare landing page data

**What test script doesn't do (by design):**
- ❌ Persist data (uses memory only)
- ❌ Make optimization decisions
- ❌ Deploy landing pages
- ❌ Run continuously

These are expected - test script is meant to validate services work, not replace the full backend.

## Summary

**Test Script Status: ✅ READY TO USE**

The test script should work as-is for validating the core pipeline. Missing pieces are mostly for production features like:
- Persistent storage
- Automated optimization
- Landing page deployment
- Build handoff

These can be added incrementally to the backend service while the test script validates the core flow works.
