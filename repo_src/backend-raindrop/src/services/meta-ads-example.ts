/**
 * Example usage of Meta Ads Client (Track D)
 *
 * Demonstrates:
 * - Creating ads from AdVariant
 * - Fetching metrics
 * - Mock mode for testing
 */

import { MetaAdsClient, createMetaAdsClient, metricsToSnapshot } from './meta-ads-client';
import type { AdVariant } from '../models/ad-variant';
import { generateAdVariantId } from '../models/ad-variant';
import { calculateDerivedMetrics } from '../models/metrics';

// ============================================================================
// Example 1: Create an ad from AdVariant
// ============================================================================

async function exampleCreateAd() {
  console.log('\n=== Example 1: Create Ad ===\n');

  // Initialize client (mock mode for demo)
  const client = createMetaAdsClient({ mockMode: true });

  // Sample AdVariant
  const variant: AdVariant = {
    id: generateAdVariantId(),
    experiment_id: 'exp_test_001',
    product_id: 'pc_solarpunk_desk_buddy',
    platform: 'meta',
    headline: 'Transform Your Workspace',
    body: 'Discover the AI-powered desk companion that helps you stay organized and focused. Join thousands who have already transformed their productivity.',
    image_url: 'https://example.com/images/desk-buddy.png',
    cta: 'Sign up',
    status: 'draft',
    created_by: 'agent',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    // Create ad on Meta
    const result = await client.createAd(variant, {
      dailyBudget: 2000, // $20/day
      ctaUrl: 'https://myproduct.com/signup',
      targeting: {
        age_min: 25,
        age_max: 45,
        genders: [1, 2],
        geo_locations: { countries: ['US', 'CA'] },
        publisher_platforms: ['facebook', 'instagram'],
        facebook_positions: ['feed', 'marketplace'],
        instagram_positions: ['feed', 'story', 'reels'],
        detailed_targeting: {
          interests: [
            { id: '6003139266461', name: 'Productivity' },
            { id: '6003462608892', name: 'Technology' },
          ],
        },
      },
    });

    console.log('✅ Ad created successfully!');
    console.log('Campaign ID:', result.campaignId);
    console.log('Ad Set ID:', result.adsetId);
    console.log('Creative ID:', result.creativeId);
    console.log('Ad ID:', result.adId);

    return { variant, result };
  } catch (error) {
    console.error('❌ Error creating ad:', error);
    throw error;
  }
}

// ============================================================================
// Example 2: Get metrics for ads
// ============================================================================

async function exampleGetMetrics(adIds: string[]) {
  console.log('\n=== Example 2: Get Metrics ===\n');

  const client = createMetaAdsClient({ mockMode: true });

  try {
    // Fetch metrics for last 7 days
    const metrics = await client.getMetrics(adIds);

    console.log(`✅ Retrieved metrics for ${metrics.length} ad(s)\n`);

    for (const metric of metrics) {
      console.log(`📊 Ad: ${metric.ad_name} (${metric.ad_id})`);
      console.log(`   Impressions: ${metric.impressions.toLocaleString()}`);
      console.log(`   Clicks: ${metric.clicks.toLocaleString()}`);
      console.log(`   CTR: ${(metric.ctr * 100).toFixed(2)}%`);
      console.log(`   Leads: ${metric.leads}`);
      console.log(`   Spend: $${metric.spend_usd.toFixed(2)}`);
      if (metric.cpl_usd) {
        console.log(`   CPL: $${metric.cpl_usd.toFixed(2)}`);
      }
      console.log();
    }

    return metrics;
  } catch (error) {
    console.error('❌ Error fetching metrics:', error);
    throw error;
  }
}

// ============================================================================
// Example 3: Convert metrics to snapshot format
// ============================================================================

async function exampleMetricsToSnapshot() {
  console.log('\n=== Example 3: Convert to Snapshot ===\n');

  const client = createMetaAdsClient({ mockMode: true });

  // Get metrics
  const adIds = ['mock_ad_1', 'mock_ad_2'];
  const metrics = await client.getMetrics(adIds);

  // Convert to snapshot format
  for (const metric of metrics) {
    const snapshot = metricsToSnapshot(metric.ad_id, metric);
    const fullSnapshot = calculateDerivedMetrics(snapshot);

    console.log('📸 Snapshot:', fullSnapshot.id);
    console.log('   Ad ID:', fullSnapshot.ad_id);
    console.log('   Pulled at:', fullSnapshot.pulled_at);
    console.log('   Metrics:', {
      impressions: fullSnapshot.impressions,
      clicks: fullSnapshot.clicks,
      leads: fullSnapshot.leads,
      spend: fullSnapshot.spend_usd,
      ctr: fullSnapshot.ctr.toFixed(4),
      cpl: fullSnapshot.cpl_usd?.toFixed(2) ?? 'N/A',
    });
    console.log();
  }
}

// ============================================================================
// Example 4: Full workflow
// ============================================================================

async function exampleFullWorkflow() {
  console.log('\n=== Example 4: Full Workflow ===\n');

  // Step 1: Create ad
  const { variant, result } = await exampleCreateAd();

  // Wait a bit (simulating ad running)
  console.log('⏳ Waiting for ad to run...');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Step 2: Get metrics
  const metrics = await exampleGetMetrics([result.adId]);

  // Step 3: Convert to snapshot
  const firstMetric = metrics[0];
  const snapshot = metricsToSnapshot(firstMetric.ad_id, firstMetric);
  const fullSnapshot = calculateDerivedMetrics(snapshot);

  console.log('\n✅ Full workflow complete!');
  console.log('Created ad:', result.adId);
  console.log('CPL:', fullSnapshot.cpl_usd ? `$${fullSnapshot.cpl_usd.toFixed(2)}` : 'N/A');

  // Step 4: Decision logic (example)
  const targetCPL = 2.0; // $2 target CPL
  if (fullSnapshot.cpl_usd && fullSnapshot.cpl_usd <= targetCPL && fullSnapshot.leads >= 10) {
    console.log('🎉 Ad is performing well! CPL <= $2 with 10+ leads');
    console.log('   → Recommend: Increase budget or scale');
  } else if (fullSnapshot.cpl_usd && fullSnapshot.cpl_usd > targetCPL * 2) {
    console.log('⚠️  Ad is underperforming. CPL > $4');
    console.log('   → Recommend: Pause or optimize');
  } else {
    console.log('📊 Ad needs more data for decision');
  }
}

// ============================================================================
// Example 5: Real mode (non-mock)
// ============================================================================

async function exampleRealMode() {
  console.log('\n=== Example 5: Real Mode (requires env vars) ===\n');

  try {
    // This will use real Pipeboard API
    const client = createMetaAdsClient({ mockMode: false });

    console.log('✅ Real client initialized');
    console.log('⚠️  This will make actual API calls to Meta');
    console.log('To use this, ensure you have set:');
    console.log('   - PIPEBOARD_API_TOKEN');
    console.log('   - META_AD_ACCOUNT_ID');
    console.log('   - META_PAGE_ID');

    // Uncomment to test with real API:
    // const variant: AdVariant = { ... };
    // const result = await client.createAd(variant);
    // console.log('Real ad created:', result);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// ============================================================================
// Run examples
// ============================================================================

async function main() {
  console.log('🚀 Meta Ads Client Examples (Track D)\n');
  console.log('=' .repeat(60));

  try {
    // Run all examples
    await exampleCreateAd();
    await exampleGetMetrics(['mock_ad_1', 'mock_ad_2', 'mock_ad_3']);
    await exampleMetricsToSnapshot();
    await exampleFullWorkflow();
    await exampleRealMode();

    console.log('\n' + '='.repeat(60));
    console.log('✅ All examples completed successfully!');
  } catch (error) {
    console.error('\n❌ Example failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { exampleCreateAd, exampleGetMetrics, exampleMetricsToSnapshot, exampleFullWorkflow };
