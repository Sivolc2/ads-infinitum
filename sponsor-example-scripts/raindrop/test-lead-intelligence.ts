// test-lead-intelligence.ts
// Test script for Track B - Lead Intelligence endpoints

import { Lead } from './src/types/lead-intelligence';

// Configuration
const BASE_URL = process.env.RAINDROP_URL || 'http://localhost:8787';

/**
 * Test lead enrichment endpoint
 */
async function testEnrichLead() {
  console.log('\n🧪 Testing POST /internal/enrich-lead');
  console.log('='.repeat(60));

  // Sample lead from a Meta ad
  const sampleLead: Lead = {
    id: 'lead_001',
    product_id: 'prod_smart_desk_buddy',
    ad_id: 'ad_001',
    landing_page_id: null,
    source: 'meta_lead_form',
    email: 'john.doe@example.com',
    name: 'John Doe',
    raw_form_data: {
      'What problem are you trying to solve?': 'I struggle with task management and staying organized. Need something to help me prioritize my work.',
      'What is your role?': 'Freelance designer and content creator',
      'Budget range?': 'Mid-range, willing to invest $50-150',
      'How excited are you about this product?': 'Very excited! This sounds exactly like what I need.',
      'Any features you\'d like to see?': 'AI-powered task prioritization and calendar integration would be amazing'
    },
    created_at: new Date().toISOString(),
  };

  try {
    const response = await fetch(`${BASE_URL}/internal/enrich-lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lead: sampleLead }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('\n✅ Lead enrichment successful!');
    console.log('\nEnriched Profile:');
    console.log(JSON.stringify(result.profile, null, 2));
    console.log(`\n⏱️  Enrichment time: ${result.enrichment_time_ms}ms`);

    return result;
  } catch (error) {
    console.error('\n❌ Lead enrichment failed:', error);
    throw error;
  }
}

/**
 * Test ad quality stats endpoint
 */
async function testAdQuality(adId: string) {
  console.log('\n\n🧪 Testing GET /internal/ad-quality/:adId');
  console.log('='.repeat(60));

  try {
    const response = await fetch(`${BASE_URL}/internal/ad-quality/${adId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const stats = await response.json();
    console.log('\n✅ Ad quality stats retrieved!');
    console.log('\nQuality Stats:');
    console.log(JSON.stringify(stats, null, 2));

    return stats;
  } catch (error) {
    console.error('\n❌ Ad quality retrieval failed:', error);
    throw error;
  }
}

/**
 * Enrich multiple leads for the same ad to test aggregation
 */
async function testMultipleLeads() {
  console.log('\n\n🧪 Testing multiple lead enrichment for ad_002');
  console.log('='.repeat(60));

  const leads: Lead[] = [
    {
      id: 'lead_002',
      product_id: 'prod_smart_desk_buddy',
      ad_id: 'ad_002',
      landing_page_id: null,
      source: 'meta_lead_form',
      email: 'sarah@example.com',
      name: 'Sarah Johnson',
      raw_form_data: {
        'What problem are you trying to solve?': 'Need help tracking deadlines',
        'What is your role?': 'Student and part-time entrepreneur',
        'Budget range?': 'Low budget, looking for affordable options',
        'How excited are you about this product?': 'Interested but need to see more details',
        'Any features you\'d like to see?': 'Simple interface, mobile app'
      },
      created_at: new Date().toISOString(),
    },
    {
      id: 'lead_003',
      product_id: 'prod_smart_desk_buddy',
      ad_id: 'ad_002',
      landing_page_id: null,
      source: 'meta_lead_form',
      email: 'mike@example.com',
      name: 'Mike Chen',
      raw_form_data: {
        'What problem are you trying to solve?': 'Feeling overwhelmed with multiple projects',
        'What is your role?': 'Marketing manager and team lead',
        'Budget range?': 'High budget, need professional-grade tools',
        'How excited are you about this product?': 'This is exactly what my team needs!',
        'Any features you\'d like to see?': 'Team collaboration, project templates, integrations with Slack'
      },
      created_at: new Date().toISOString(),
    },
    {
      id: 'lead_004',
      product_id: 'prod_smart_desk_buddy',
      ad_id: 'ad_002',
      landing_page_id: null,
      source: 'landing_form',
      email: 'lisa@example.com',
      name: 'Lisa Wang',
      raw_form_data: {
        'What problem are you trying to solve?': 'Not sure this is for me, just browsing',
        'What is your role?': 'Casual user',
        'Budget range?': 'Not interested in paying',
        'How excited are you about this product?': 'Skeptical about AI products',
        'Any features you\'d like to see?': 'Free version'
      },
      created_at: new Date().toISOString(),
    },
  ];

  let enrichedCount = 0;
  for (const lead of leads) {
    try {
      await fetch(`${BASE_URL}/internal/enrich-lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lead }),
      });
      enrichedCount++;
      console.log(`✅ Enriched lead ${lead.id}`);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`❌ Failed to enrich lead ${lead.id}:`, error);
    }
  }

  console.log(`\n📊 Enriched ${enrichedCount}/${leads.length} leads`);
}

/**
 * Main test runner
 */
async function main() {
  console.log('\n🚀 Starting Lead Intelligence Tests');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);

  try {
    // Test 1: Enrich a single lead
    await testEnrichLead();

    // Test 2: Get quality stats for the first ad (should have 1 lead)
    await testAdQuality('ad_001');

    // Test 3: Enrich multiple leads for a different ad
    await testMultipleLeads();

    // Test 4: Get quality stats for the second ad (should have 3 leads with varied quality)
    await testAdQuality('ad_002');

    console.log('\n\n✨ All tests completed!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
main();
