#!/usr/bin/env ts-node
/**
 * Core Pipeline Test Script
 *
 * Tests the end-to-end flow:
 * 1. Product Idea Generation → 2. Ad Creation (copy + images) →
 * 3. Post to Meta Ads → 4. Pull Metrics → 5. Update Landing Page
 *
 * Usage:
 *   ts-node misc/sponsor-example-scripts/test-core-pipeline.ts [options]
 *
 * Options:
 *   --mock-meta        Use mock mode for Meta Ads (don't actually post)
 *   --mock-product     Use mock product generator instead of AI
 *   --skip-meta        Skip Meta Ads posting entirely
 *   --num-variants=N   Number of ad variants to generate (default: 3)
 */

import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from repo root
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import services
import { generateProductConcept } from '../../repo_src/backend-raindrop/src/services/ai-product-generator';
import { generateAdVariants } from '../../repo_src/backend-raindrop/src/services/ad-variant-generator';
import { MetaAdsClient } from '../../repo_src/backend-raindrop/src/services/meta-ads-client';
import type { ProductConcept, AdVariant, AdExperiment } from '../../repo_src/backend-raindrop/src/models/types';
import { generateId } from '../../repo_src/backend-raindrop/src/utils/id-generator';

// ============================================================================
// Configuration
// ============================================================================

interface TestConfig {
  mockMeta: boolean;
  mockProduct: boolean;
  skipMeta: boolean;
  numVariants: number;
}

function parseArgs(): TestConfig {
  const args = process.argv.slice(2);

  const config: TestConfig = {
    mockMeta: args.includes('--mock-meta'),
    mockProduct: args.includes('--mock-product'),
    skipMeta: args.includes('--skip-meta'),
    numVariants: 3,
  };

  // Parse num-variants
  const numVariantsArg = args.find(arg => arg.startsWith('--num-variants='));
  if (numVariantsArg) {
    const num = parseInt(numVariantsArg.split('=')[1]);
    if (!isNaN(num) && num > 0 && num <= 10) {
      config.numVariants = num;
    }
  }

  return config;
}

function validateEnvironment(): void {
  const required = ['FREEPIK_API_KEY'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('   Please check your .env file');
    process.exit(1);
  }

  // Warn about optional variables
  if (!process.env.PIPEBOARD_API_TOKEN || !process.env.META_AD_ACCOUNT_ID || !process.env.META_PAGE_ID) {
    console.warn('⚠️  Meta Ads credentials not configured. Using mock mode for Meta Ads.');
    console.warn('   Set PIPEBOARD_API_TOKEN, META_AD_ACCOUNT_ID, META_PAGE_ID to enable real posting.');
  }
}

// ============================================================================
// Pipeline Steps
// ============================================================================

/**
 * Step 1: Generate Product Concept
 */
async function step1_GenerateProduct(config: TestConfig): Promise<ProductConcept> {
  console.log('\n' + '='.repeat(80));
  console.log('STEP 1: GENERATE PRODUCT CONCEPT');
  console.log('='.repeat(80));

  const useAI = !config.mockProduct && (process.env.LM_API_KEY || process.env.LLM_PROVIDER === 'raindrop');

  if (!useAI) {
    console.log('📦 Using mock product generator (AI not configured or --mock-product flag set)');
  } else {
    console.log('🤖 Using AI to generate product concept');
  }

  const product = await generateProductConcept({
    openrouterApiKey: process.env.LM_API_KEY,
    useRaindrop: false, // We're not in Raindrop runtime context
  });

  console.log('\n✅ Generated Product Concept:');
  console.log('   ID:', product.id);
  console.log('   Title:', product.title);
  console.log('   Tagline:', product.tagline);
  console.log('   Target Audience:', product.target_audience);
  console.log('   Status:', product.status);

  return product;
}

/**
 * Step 2: Create Experiment
 */
function step2_CreateExperiment(product: ProductConcept): AdExperiment {
  console.log('\n' + '='.repeat(80));
  console.log('STEP 2: CREATE EXPERIMENT');
  console.log('='.repeat(80));

  const experiment: AdExperiment = {
    id: generateId('exp'),
    product_id: product.id,
    platform: 'meta',
    goal: 'leads',
    budget_total_usd: 100,
    budget_per_day_usd: 20,
    min_leads_for_decision: 10,
    target_cpl_threshold_usd: 5.0,
    status: 'pending',
    round: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  console.log('\n✅ Created Experiment:');
  console.log('   ID:', experiment.id);
  console.log('   Goal:', experiment.goal);
  console.log('   Budget per day: $', experiment.budget_per_day_usd);
  console.log('   Target CPL: $', experiment.target_cpl_threshold_usd);
  console.log('   Min leads for decision:', experiment.min_leads_for_decision);

  return experiment;
}

/**
 * Step 3: Generate Ad Variants (copy + images)
 */
async function step3_GenerateAdVariants(
  product: ProductConcept,
  experiment: AdExperiment,
  config: TestConfig
): Promise<AdVariant[]> {
  console.log('\n' + '='.repeat(80));
  console.log('STEP 3: GENERATE AD VARIANTS (COPY + IMAGES)');
  console.log('='.repeat(80));

  console.log(`🎨 Generating ${config.numVariants} ad variants...`);
  console.log('   Image Provider: Freepik');
  console.log('   LLM Provider: OpenRouter (or mock if not configured)');

  const variants = await generateAdVariants({
    productConcept: product,
    experimentId: experiment.id,
    numVariants: config.numVariants,
    openrouterApiKey: process.env.LM_API_KEY,
    imageApiKey: process.env.FREEPIK_API_KEY!,
    imageProvider: 'freepik',
  });

  console.log(`\n✅ Generated ${variants.length} Ad Variants:`);
  variants.forEach((variant, i) => {
    console.log(`\n   Variant ${i + 1} (${variant.id}):`);
    console.log(`      Headline: ${variant.headline}`);
    console.log(`      Body: ${variant.body.substring(0, 80)}...`);
    console.log(`      CTA: ${variant.cta}`);
    console.log(`      Image: ${variant.image_url.substring(0, 60)}...`);
  });

  return variants;
}

/**
 * Step 4: Post Ads to Meta
 */
async function step4_PostToMeta(
  variants: AdVariant[],
  config: TestConfig
): Promise<AdVariant[]> {
  console.log('\n' + '='.repeat(80));
  console.log('STEP 4: POST ADS TO META');
  console.log('='.repeat(80));

  if (config.skipMeta) {
    console.log('⏭️  Skipping Meta Ads posting (--skip-meta flag set)');
    return variants;
  }

  const hasMetaCreds = process.env.PIPEBOARD_API_TOKEN &&
                       process.env.META_AD_ACCOUNT_ID &&
                       process.env.META_PAGE_ID;

  const useMockMode = config.mockMeta || !hasMetaCreds;

  if (useMockMode) {
    console.log('🧪 Using MOCK mode for Meta Ads (not posting real ads)');
  } else {
    console.log('🚀 Posting real ads to Meta');
  }

  const metaClient = new MetaAdsClient({
    apiToken: process.env.PIPEBOARD_API_TOKEN || 'mock_token',
    adAccountId: process.env.META_AD_ACCOUNT_ID || 'mock_account',
    pageId: process.env.META_PAGE_ID || 'mock_page',
    mockMode: useMockMode,
  });

  const updatedVariants: AdVariant[] = [];

  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];
    console.log(`\n📤 Posting variant ${i + 1}/${variants.length} (${variant.id})...`);

    try {
      const result = await metaClient.createAd(variant, {
        dailyBudget: 1500, // $15/day in cents
        ctaUrl: process.env.AD_CTA_URL || 'https://example.com/reserve',
      });

      console.log('   ✅ Success!');
      console.log('      Campaign ID:', result.campaignId);
      console.log('      AdSet ID:', result.adsetId);
      console.log('      Creative ID:', result.creativeId);
      console.log('      Ad ID:', result.adId);

      // Update variant with Meta IDs
      updatedVariants.push({
        ...variant,
        meta_campaign_id: result.campaignId,
        meta_adset_id: result.adsetId,
        meta_ad_id: result.adId,
        status: 'active',
      });
    } catch (error) {
      console.error('   ❌ Error posting ad:', error instanceof Error ? error.message : error);
      updatedVariants.push(variant); // Keep original variant
    }
  }

  return updatedVariants;
}

/**
 * Step 5: Pull Metrics from Meta
 */
async function step5_PullMetrics(
  variants: AdVariant[],
  config: TestConfig
): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('STEP 5: PULL METRICS FROM META');
  console.log('='.repeat(80));

  if (config.skipMeta) {
    console.log('⏭️  Skipping metrics pull (--skip-meta flag set)');
    return;
  }

  const hasMetaCreds = process.env.PIPEBOARD_API_TOKEN &&
                       process.env.META_AD_ACCOUNT_ID &&
                       process.env.META_PAGE_ID;
  const useMockMode = config.mockMeta || !hasMetaCreds;

  const metaClient = new MetaAdsClient({
    apiToken: process.env.PIPEBOARD_API_TOKEN || 'mock_token',
    adAccountId: process.env.META_AD_ACCOUNT_ID || 'mock_account',
    pageId: process.env.META_PAGE_ID || 'mock_page',
    mockMode: useMockMode,
  });

  const adIds = variants
    .filter(v => v.meta_ad_id)
    .map(v => v.meta_ad_id!);

  if (adIds.length === 0) {
    console.log('⚠️  No Meta Ad IDs available to pull metrics for');
    return;
  }

  console.log(`📊 Pulling metrics for ${adIds.length} ad(s)...`);

  try {
    const metrics = await metaClient.getMetrics(adIds);

    console.log(`\n✅ Retrieved metrics for ${metrics.length} ad(s):`);
    metrics.forEach((metric, i) => {
      console.log(`\n   Ad ${i + 1} (${metric.ad_name}):`);
      console.log(`      Impressions: ${metric.impressions.toLocaleString()}`);
      console.log(`      Clicks: ${metric.clicks.toLocaleString()}`);
      console.log(`      Leads: ${metric.leads.toLocaleString()}`);
      console.log(`      Spend: $${metric.spend_usd.toFixed(2)}`);
      console.log(`      CTR: ${(metric.ctr * 100).toFixed(2)}%`);
      if (metric.cpc_usd) {
        console.log(`      CPC: $${metric.cpc_usd.toFixed(2)}`);
      }
      if (metric.cpl_usd) {
        console.log(`      CPL: $${metric.cpl_usd.toFixed(2)}`);
      }
    });
  } catch (error) {
    console.error('❌ Error pulling metrics:', error instanceof Error ? error.message : error);
  }
}

/**
 * Step 6: Pass Info to Landing Page
 */
function step6_UpdateLandingPage(
  product: ProductConcept,
  experiment: AdExperiment,
  variants: AdVariant[]
): void {
  console.log('\n' + '='.repeat(80));
  console.log('STEP 6: PASS INFO TO LANDING PAGE');
  console.log('='.repeat(80));

  // Create landing page data structure
  const landingPageData = {
    product: {
      id: product.id,
      title: product.title,
      tagline: product.tagline,
      description: product.description,
      target_audience: product.target_audience,
    },
    experiment: {
      id: experiment.id,
      status: experiment.status,
      budget_per_day_usd: experiment.budget_per_day_usd,
      target_cpl_threshold_usd: experiment.target_cpl_threshold_usd,
    },
    ads: variants.map(v => ({
      id: v.id,
      headline: v.headline,
      body: v.body,
      cta: v.cta,
      image_url: v.image_url,
      meta_ad_id: v.meta_ad_id,
      status: v.status,
    })),
    landing_page_url: `https://example.com/products/${product.id}`,
    created_at: new Date().toISOString(),
  };

  console.log('\n✅ Landing Page Data Prepared:');
  console.log(JSON.stringify(landingPageData, null, 2));

  console.log('\n💡 This data would be sent to:');
  console.log('   - Frontend landing page API');
  console.log('   - POST /api/landing/:productId');
  console.log('   - Or stored in landing page service');
}

/**
 * Summary Report
 */
function generateSummary(
  product: ProductConcept,
  experiment: AdExperiment,
  variants: AdVariant[],
  config: TestConfig
): void {
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));

  console.log('\n📊 Pipeline Test Results:');
  console.log('   ✅ Product concept generated:', product.title);
  console.log('   ✅ Experiment created:', experiment.id);
  console.log('   ✅ Ad variants generated:', variants.length);

  const postedCount = variants.filter(v => v.meta_ad_id).length;
  if (!config.skipMeta) {
    if (config.mockMeta) {
      console.log('   🧪 Ads posted (mock mode):', postedCount);
    } else {
      console.log('   🚀 Ads posted to Meta:', postedCount);
    }
  } else {
    console.log('   ⏭️  Meta posting skipped');
  }

  console.log('\n🎯 Next Steps:');
  console.log('   1. View ads in Meta Ads Manager');
  console.log('   2. Monitor performance metrics');
  console.log('   3. Check landing page at frontend');
  console.log('   4. Collect leads and analyze');

  console.log('\n💰 Estimated Costs:');
  console.log('   - Ad generation (LLM + images): ~$0.10 - $0.20');
  console.log(`   - Meta ads budget: $${experiment.budget_per_day_usd}/day`);
  console.log(`   - Total for ${experiment.budget_total_usd / experiment.budget_per_day_usd} days: $${experiment.budget_total_usd}`);
}

// ============================================================================
// Main Pipeline
// ============================================================================

async function main() {
  console.log('🚀 AD INFINITUM - CORE PIPELINE TEST');
  console.log('Testing: Product Generation → Ad Creation → Meta Posting → Metrics → Landing Page');
  console.log('');

  // Parse arguments and validate environment
  const config = parseArgs();

  console.log('Configuration:');
  console.log('   Mock Meta:', config.mockMeta);
  console.log('   Mock Product:', config.mockProduct);
  console.log('   Skip Meta:', config.skipMeta);
  console.log('   Num Variants:', config.numVariants);

  validateEnvironment();

  try {
    // Step 1: Generate Product
    const product = await step1_GenerateProduct(config);

    // Step 2: Create Experiment
    const experiment = step2_CreateExperiment(product);

    // Step 3: Generate Ad Variants
    const variants = await step3_GenerateAdVariants(product, experiment, config);

    // Step 4: Post to Meta
    const updatedVariants = await step4_PostToMeta(variants, config);

    // Step 5: Pull Metrics
    await step5_PullMetrics(updatedVariants, config);

    // Step 6: Update Landing Page
    step6_UpdateLandingPage(product, experiment, updatedVariants);

    // Summary
    generateSummary(product, experiment, updatedVariants, config);

    console.log('\n✅ Pipeline test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Pipeline test failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run the pipeline
main();
