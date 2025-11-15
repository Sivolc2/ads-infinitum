#!/usr/bin/env tsx
/**
 * Quick Setup Verification Script
 *
 * Verifies that:
 * - All imports work
 * - Environment variables are loaded
 * - Services can be instantiated
 * - No obvious configuration issues
 *
 * Usage: tsx verify-setup.ts
 */

import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

console.log('🔍 Verifying Ad Infinitum setup...\n');

// Check 1: Environment Variables
console.log('1️⃣  Checking environment variables...');
const envVars = {
  'FREEPIK_API_KEY': process.env.FREEPIK_API_KEY,
  'PIPEBOARD_API_TOKEN': process.env.PIPEBOARD_API_TOKEN,
  'META_AD_ACCOUNT_ID': process.env.META_AD_ACCOUNT_ID,
  'META_PAGE_ID': process.env.META_PAGE_ID,
  'LM_API_KEY': process.env.LM_API_KEY,
  'LLM_PROVIDER': process.env.LLM_PROVIDER,
};

let missingCount = 0;
for (const [key, value] of Object.entries(envVars)) {
  const status = value ? '✅' : '⚠️ ';
  const displayValue = value ? (key.includes('KEY') || key.includes('TOKEN') ? '***' + value.slice(-4) : value) : 'not set';
  console.log(`   ${status} ${key}: ${displayValue}`);
  if (!value && !['LM_API_KEY', 'LLM_PROVIDER'].includes(key)) {
    missingCount++;
  }
}

if (missingCount === 0) {
  console.log('   ✅ All critical environment variables set\n');
} else {
  console.log(`   ⚠️  ${missingCount} optional variables not set (can use mock mode)\n`);
}

// Check 2: Imports
console.log('2️⃣  Checking service imports...');
try {
  const { generateProductConcept } = await import('../../repo_src/backend-raindrop/src/services/ai-product-generator.js');
  console.log('   ✅ ai-product-generator');

  const { generateAdVariants } = await import('../../repo_src/backend-raindrop/src/services/ad-variant-generator.js');
  console.log('   ✅ ad-variant-generator');

  const { MetaAdsClient } = await import('../../repo_src/backend-raindrop/src/services/meta-ads-client.js');
  console.log('   ✅ meta-ads-client');

  const { generateId } = await import('../../repo_src/backend-raindrop/src/utils/id-generator.js');
  console.log('   ✅ id-generator');

  console.log('   ✅ All imports successful\n');
} catch (error) {
  console.error('   ❌ Import failed:', error);
  console.error('   Make sure you run: cd repo_src/backend-raindrop && npm install\n');
  process.exit(1);
}

// Check 3: Service Instantiation
console.log('3️⃣  Checking service instantiation...');
try {
  const { MetaAdsClient } = await import('../../repo_src/backend-raindrop/src/services/meta-ads-client.js');

  const metaClient = new MetaAdsClient({
    apiToken: process.env.PIPEBOARD_API_TOKEN || 'test_token',
    adAccountId: process.env.META_AD_ACCOUNT_ID || 'test_account',
    pageId: process.env.META_PAGE_ID || 'test_page',
    mockMode: true,
  });
  console.log('   ✅ MetaAdsClient instantiated (mock mode)\n');
} catch (error) {
  console.error('   ❌ Service instantiation failed:', error);
  process.exit(1);
}

// Check 4: Quick Product Generation Test
console.log('4️⃣  Testing mock product generation...');
try {
  const { generateProductConcept } = await import('../../repo_src/backend-raindrop/src/services/ai-product-generator.js');

  const product = await generateProductConcept({
    // Force mock mode for this test
  });

  console.log('   ✅ Generated test product:');
  console.log(`      Title: ${product.title}`);
  console.log(`      ID: ${product.id}`);
  console.log(`      Status: ${product.status}\n`);
} catch (error) {
  console.error('   ❌ Product generation failed:', error);
  process.exit(1);
}

// Summary
console.log('═'.repeat(60));
console.log('✅ SETUP VERIFICATION COMPLETE');
console.log('═'.repeat(60));
console.log('\n🎯 Next steps:');
console.log('   1. Run the full pipeline test:');
console.log('      ./misc/sponsor-example-scripts/run-test.sh --mock-meta');
console.log('');
console.log('   2. Or test individual steps:');
console.log('      ./misc/sponsor-example-scripts/run-test.sh --skip-meta --num-variants=2');
console.log('');
console.log('   3. For real Meta posting (requires credentials):');
console.log('      ./misc/sponsor-example-scripts/run-test.sh');
console.log('');
