// test-track-e.ts
// Test script for Track E - Landing Page + Funding Logic

const BASE_URL = process.env.BASE_URL || 'http://localhost:8787';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    console.log(`\n🧪 Testing: ${name}`);
    await fn();
    results.push({ name, passed: true, message: 'Passed' });
    console.log(`✅ ${name} - PASSED`);
  } catch (error) {
    results.push({
      name,
      passed: false,
      message: error instanceof Error ? error.message : String(error),
    });
    console.error(`❌ ${name} - FAILED:`, error);
  }
}

async function main() {
  console.log('\n🚀 Track E - Landing Page + Funding Logic Tests');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}\n`);

  let productId: string;
  let landingPageId: string;

  // Test 1: Create a test product
  await test('Create test product', async () => {
    const response = await fetch(`${BASE_URL}/internal/test-product-concept`, {
      method: 'POST',
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }

    const product = data.product_concept;
    productId = product.id;

    console.log(`   Product ID: ${productId}`);
    console.log(`   Title: ${product.title}`);
  });

  // Test 2: Get or create landing page for product
  await test('GET /api/landing/:productId - Get or create landing page', async () => {
    if (!productId) throw new Error('No product ID from previous test');

    const response = await fetch(`${BASE_URL}/api/landing/${productId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }

    if (!data.success || !data.data) {
      throw new Error('Invalid response format');
    }

    const landingPage = data.data;
    landingPageId = landingPage.id;

    console.log(`   Landing Page ID: ${landingPageId}`);
    console.log(`   Lovable URL: ${landingPage.lovable_url}`);
    console.log(`   Likes: ${landingPage.likes_count}`);
    console.log(`   Dislikes: ${landingPage.dislikes_count}`);
    console.log(`   Pledge Total: $${landingPage.pledge_total_usd}`);

    if (landingPage.product_id !== productId) {
      throw new Error('Product ID mismatch');
    }
  });

  // Test 3: Like the landing page
  await test('POST /api/landing/:id/like - Like landing page', async () => {
    if (!landingPageId) throw new Error('No landing page ID from previous test');

    const response = await fetch(`${BASE_URL}/api/landing/${landingPageId}/like`, {
      method: 'POST',
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }

    if (!data.success || !data.data) {
      throw new Error('Invalid response format');
    }

    const landingPage = data.data;
    console.log(`   Likes after: ${landingPage.likes_count}`);

    if (landingPage.likes_count !== 1) {
      throw new Error(`Expected likes_count to be 1, got ${landingPage.likes_count}`);
    }
  });

  // Test 4: Like again (should increment)
  await test('Like again - Should increment to 2', async () => {
    if (!landingPageId) throw new Error('No landing page ID');

    const response = await fetch(`${BASE_URL}/api/landing/${landingPageId}/like`, {
      method: 'POST',
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }

    const landingPage = data.data;
    console.log(`   Likes after second like: ${landingPage.likes_count}`);

    if (landingPage.likes_count !== 2) {
      throw new Error(`Expected likes_count to be 2, got ${landingPage.likes_count}`);
    }
  });

  // Test 5: Dislike the landing page
  await test('POST /api/landing/:id/dislike - Dislike landing page', async () => {
    if (!landingPageId) throw new Error('No landing page ID');

    const response = await fetch(`${BASE_URL}/api/landing/${landingPageId}/dislike`, {
      method: 'POST',
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }

    const landingPage = data.data;
    console.log(`   Dislikes after: ${landingPage.dislikes_count}`);

    if (landingPage.dislikes_count !== 1) {
      throw new Error(`Expected dislikes_count to be 1, got ${landingPage.dislikes_count}`);
    }
  });

  // Test 6: Create a pledge
  await test('POST /api/landing/:id/pledge - Create pledge', async () => {
    if (!landingPageId) throw new Error('No landing page ID');

    const pledgeData = {
      amount_usd: 50,
      email: 'backer@example.com',
      name: 'John Backer',
      message: 'Excited to support this product!',
    };

    const response = await fetch(`${BASE_URL}/api/landing/${landingPageId}/pledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pledgeData),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }

    if (!data.success || !data.data.pledge) {
      throw new Error('Invalid response format');
    }

    const pledge = data.data.pledge;
    const landingPage = data.data.landing_page;

    console.log(`   Pledge ID: ${pledge.id}`);
    console.log(`   Amount: $${pledge.amount_usd}`);
    console.log(`   Total pledged: $${landingPage.pledge_total_usd}`);
    console.log(`   Pledge count: ${landingPage.pledge_count}`);

    if (pledge.amount_usd !== 50) {
      throw new Error(`Expected pledge amount to be 50, got ${pledge.amount_usd}`);
    }

    if (landingPage.pledge_total_usd !== 50) {
      throw new Error(`Expected total to be 50, got ${landingPage.pledge_total_usd}`);
    }

    if (landingPage.pledge_count !== 1) {
      throw new Error(`Expected pledge count to be 1, got ${landingPage.pledge_count}`);
    }
  });

  // Test 7: Create another pledge
  await test('Create another pledge - Should accumulate', async () => {
    if (!landingPageId) throw new Error('No landing page ID');

    const pledgeData = {
      amount_usd: 150,
      email: 'supporter@example.com',
      name: 'Jane Supporter',
    };

    const response = await fetch(`${BASE_URL}/api/landing/${landingPageId}/pledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pledgeData),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }

    const landingPage = data.data.landing_page;

    console.log(`   Total pledged: $${landingPage.pledge_total_usd}`);
    console.log(`   Pledge count: ${landingPage.pledge_count}`);

    if (landingPage.pledge_total_usd !== 200) {
      throw new Error(`Expected total to be 200, got ${landingPage.pledge_total_usd}`);
    }

    if (landingPage.pledge_count !== 2) {
      throw new Error(`Expected pledge count to be 2, got ${landingPage.pledge_count}`);
    }
  });

  // Test 8: Get landing page stats
  await test('GET /api/landing/:id/stats - Get stats', async () => {
    if (!landingPageId) throw new Error('No landing page ID');

    const response = await fetch(`${BASE_URL}/api/landing/${landingPageId}/stats`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }

    const stats = data.data;

    console.log(`   Likes: ${stats.likes}`);
    console.log(`   Dislikes: ${stats.dislikes}`);
    console.log(`   Net Sentiment: ${stats.net_sentiment}`);
    console.log(`   Sentiment Ratio: ${stats.sentiment_ratio}`);
    console.log(`   Pledge Count: ${stats.pledge_count}`);
    console.log(`   Pledge Total: $${stats.pledge_total_usd}`);
    console.log(`   Average Pledge: $${stats.avg_pledge_usd}`);

    if (stats.likes !== 2) {
      throw new Error(`Expected 2 likes, got ${stats.likes}`);
    }

    if (stats.dislikes !== 1) {
      throw new Error(`Expected 1 dislike, got ${stats.dislikes}`);
    }

    if (stats.pledge_count !== 2) {
      throw new Error(`Expected 2 pledges, got ${stats.pledge_count}`);
    }

    if (stats.avg_pledge_usd !== 100) {
      throw new Error(`Expected average pledge $100, got $${stats.avg_pledge_usd}`);
    }
  });

  // Test 9: Get funding progress
  await test('GET /api/landing/:id/funding-progress - Get funding progress', async () => {
    if (!landingPageId) throw new Error('No landing page ID');

    const response = await fetch(
      `${BASE_URL}/api/landing/${landingPageId}/funding-progress`
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }

    const progress = data.data;

    console.log(`   Current: $${progress.current_usd}`);
    console.log(`   Goal: ${progress.goal_usd === null ? 'Not set' : '$' + progress.goal_usd}`);
    console.log(`   Progress: ${progress.progress_percent}%`);
    console.log(`   Pledge Count: ${progress.pledge_count}`);

    if (progress.current_usd !== 200) {
      throw new Error(`Expected current to be 200, got ${progress.current_usd}`);
    }

    if (progress.pledge_count !== 2) {
      throw new Error(`Expected 2 pledges, got ${progress.pledge_count}`);
    }
  });

  // Test 10: Get all pledges
  await test('GET /api/landing/:id/pledges - Get pledges list', async () => {
    if (!landingPageId) throw new Error('No landing page ID');

    const response = await fetch(`${BASE_URL}/api/landing/${landingPageId}/pledges`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }

    const pledges = data.data;

    console.log(`   Total pledges: ${data.count}`);
    pledges.forEach((pledge: any, i: number) => {
      console.log(
        `   Pledge ${i + 1}: $${pledge.amount_usd} from ${pledge.name || pledge.email}`
      );
    });

    if (data.count !== 2) {
      throw new Error(`Expected 2 pledges, got ${data.count}`);
    }
  });

  // Test 11: Get landing page by ID (alternative endpoint)
  await test('GET /api/landing/id/:id - Get by ID', async () => {
    if (!landingPageId) throw new Error('No landing page ID');

    const response = await fetch(`${BASE_URL}/api/landing/id/${landingPageId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }

    const landingPage = data.data;

    if (landingPage.id !== landingPageId) {
      throw new Error('ID mismatch');
    }

    console.log(`   Retrieved landing page: ${landingPage.id}`);
    console.log(`   Product ID: ${landingPage.product_id}`);
  });

  // Test 12: Invalid pledge (missing amount)
  await test('Invalid pledge - Should fail validation', async () => {
    if (!landingPageId) throw new Error('No landing page ID');

    const invalidPledge = {
      email: 'invalid@example.com',
      // missing amount_usd
    };

    const response = await fetch(`${BASE_URL}/api/landing/${landingPageId}/pledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidPledge),
    });

    if (response.ok) {
      throw new Error('Expected request to fail validation');
    }

    console.log(`   Correctly rejected invalid pledge (${response.status})`);
  });

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total:  ${results.length}\n`);

  if (failed > 0) {
    console.log('Failed tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  ❌ ${r.name}: ${r.message}`);
      });
    console.log();
    process.exit(1);
  }

  console.log('🎉 All tests passed!\n');
}

main().catch((error) => {
  console.error('\n💥 Test suite failed:', error);
  process.exit(1);
});
