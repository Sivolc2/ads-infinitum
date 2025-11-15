# Track B Integration Examples

This document shows how other tracks can integrate with Track B's Lead Intelligence APIs.

## For Track A (Meta Ads)

When you receive a new lead from Meta Lead Forms, enrich it immediately:

```typescript
// In your Meta webhook handler or lead collector

async function handleNewMetaLead(metaLeadData: any) {
  // Transform Meta lead data into our Lead format
  const lead = {
    id: `lead_${metaLeadData.id}`,
    product_id: metaLeadData.form_data.product_id,
    ad_id: metaLeadData.ad_id,
    landing_page_id: null,
    source: "meta_lead_form" as const,
    email: metaLeadData.email,
    name: metaLeadData.full_name,
    raw_form_data: metaLeadData.field_data,
    created_at: new Date().toISOString(),
  };

  // Send to Track B for enrichment
  const response = await fetch('https://your-raindrop-url/internal/enrich-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead }),
  });

  const enrichedData = await response.json();

  // Now you have structured profile data
  console.log('User segments:', enrichedData.profile.segments);
  console.log('Interest level:', enrichedData.profile.interest_level);
  console.log('Sentiment:', enrichedData.profile.sentiment);

  return enrichedData.profile;
}
```

## For Track C (Orchestration / Decision Making)

Use ad quality stats to make decisions about which ads to scale:

```typescript
// In your orchestration logic

async function evaluateAdPerformance(adIds: string[]) {
  const adQualityData = [];

  for (const adId of adIds) {
    const response = await fetch(
      `https://your-raindrop-url/internal/ad-quality/${adId}`
    );
    const stats = await response.json();
    adQualityData.push(stats);
  }

  // Sort by quality score
  adQualityData.sort((a, b) => b.quality_score - a.quality_score);

  // Make decisions
  const topPerformers = adQualityData.filter(ad =>
    ad.quality_score > 70 &&
    ad.high_interest_rate > 0.5 &&
    ad.total_leads >= 10
  );

  console.log('Top performing ads to scale:', topPerformers.map(a => a.ad_id));

  // Get insights from best ad
  const bestAd = topPerformers[0];
  if (bestAd) {
    console.log('Top segments:', bestAd.top_segments);
    console.log('Top problems:', bestAd.top_problem_tags);
    console.log('Top requests:', bestAd.top_feature_requests);

    // Use these insights to:
    // 1. Adjust targeting to focus on top segments
    // 2. Update ad copy to address top problems
    // 3. Highlight features that users are requesting
  }

  return {
    toScale: topPerformers.slice(0, 3),
    toPause: adQualityData.filter(ad => ad.quality_score < 30),
    insights: {
      segments: bestAd?.top_segments || [],
      problems: bestAd?.top_problem_tags || [],
      features: bestAd?.top_feature_requests || [],
    }
  };
}
```

## Real-time Quality Monitoring

Set up a monitoring dashboard that polls ad quality:

```typescript
async function monitorAdQuality(adIds: string[], intervalMs: number = 60000) {
  setInterval(async () => {
    for (const adId of adIds) {
      const response = await fetch(
        `https://your-raindrop-url/internal/ad-quality/${adId}`
      );
      const stats = await response.json();

      // Alert on quality changes
      if (stats.quality_score < 40 && stats.total_leads >= 20) {
        console.warn(`⚠️ Ad ${adId} has low quality score: ${stats.quality_score}`);
        console.warn('Sentiment breakdown:', stats.sentiment_breakdown);
        // Trigger alert or pause ad
      }

      if (stats.high_interest_rate > 0.7 && stats.total_leads >= 15) {
        console.log(`🎯 Ad ${adId} is performing well! Quality: ${stats.quality_score}`);
        // Trigger scale-up
      }
    }
  }, intervalMs);
}

// Start monitoring
monitorAdQuality(['ad_001', 'ad_002', 'ad_003']);
```

## Batch Lead Processing

Process multiple leads at once:

```typescript
async function processBatchLeads(leads: Lead[]) {
  const enrichedProfiles = [];

  for (const lead of leads) {
    try {
      const response = await fetch('https://your-raindrop-url/internal/enrich-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead }),
      });

      const result = await response.json();
      enrichedProfiles.push(result.profile);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Failed to enrich lead ${lead.id}:`, error);
    }
  }

  return enrichedProfiles;
}
```

## Segment-based Targeting

Use enriched data to create lookalike audiences:

```typescript
async function createLookalikeAudience(adId: string) {
  const response = await fetch(
    `https://your-raindrop-url/internal/ad-quality/${adId}`
  );
  const stats = await response.json();

  // Use the insights to create targeting criteria
  const targetingCriteria = {
    interests: stats.top_segments,
    problems: stats.top_problem_tags,
    budgetRange: Object.entries(stats.budget_distribution)
      .sort(([, a], [, b]) => b - a)[0][0], // Most common budget band
    sentimentPreference: stats.sentiment_breakdown.excited > stats.sentiment_breakdown.neutral
      ? 'enthusiastic-early-adopters'
      : 'cautious-researchers',
  };

  console.log('Create lookalike audience with:', targetingCriteria);

  // Pass to Meta Ads API for audience creation
  return targetingCriteria;
}
```

## Quality-based Budget Allocation

Automatically adjust budgets based on lead quality:

```typescript
async function allocateBudget(adIds: string[], totalBudget: number) {
  // Get quality stats for all ads
  const adStats = await Promise.all(
    adIds.map(async (adId) => {
      const response = await fetch(
        `https://your-raindrop-url/internal/ad-quality/${adId}`
      );
      return response.json();
    })
  );

  // Calculate total quality points
  const totalQualityPoints = adStats.reduce(
    (sum, stat) => sum + stat.quality_score,
    0
  );

  // Allocate budget proportionally to quality
  const budgetAllocation = adStats.map(stat => ({
    ad_id: stat.ad_id,
    budget: (stat.quality_score / totalQualityPoints) * totalBudget,
    quality_score: stat.quality_score,
    high_interest_rate: stat.high_interest_rate,
  }));

  console.log('Budget allocation:', budgetAllocation);

  return budgetAllocation;
}

// Example: Allocate $1000 across 3 ads
allocateBudget(['ad_001', 'ad_002', 'ad_003'], 1000);
```

## Event-driven Architecture

Use webhooks or message queues:

```typescript
// When Track A receives a new lead
async function onNewLead(lead: Lead) {
  // Enrich asynchronously
  const enrichmentPromise = fetch('https://your-raindrop-url/internal/enrich-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead }),
  });

  // Don't block - process in background
  enrichmentPromise
    .then(res => res.json())
    .then(result => {
      // Emit event for other tracks
      eventBus.emit('lead-enriched', {
        lead_id: lead.id,
        ad_id: lead.ad_id,
        profile: result.profile,
      });
    })
    .catch(error => {
      console.error('Enrichment failed:', error);
    });
}
```

## Testing Integration

Test your integration:

```typescript
import { Lead } from './types/lead-intelligence';

async function testIntegration() {
  const testLead: Lead = {
    id: 'test_lead_001',
    product_id: 'test_product',
    ad_id: 'test_ad_001',
    landing_page_id: null,
    source: 'meta_lead_form',
    email: 'test@example.com',
    name: 'Test User',
    raw_form_data: {
      'role': 'developer',
      'problem': 'need better tools',
      'budget': 'mid-range',
      'excitement': 'very interested'
    },
    created_at: new Date().toISOString(),
  };

  // Test enrichment
  const enrichResponse = await fetch('http://localhost:8787/internal/enrich-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead: testLead }),
  });

  console.log('Enrichment result:', await enrichResponse.json());

  // Test quality stats
  const qualityResponse = await fetch('http://localhost:8787/internal/ad-quality/test_ad_001');
  console.log('Quality stats:', await qualityResponse.json());
}

testIntegration();
```
