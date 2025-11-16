// Seed script to populate the database with example data
import { serve } from '@hono/node-server';
import 'dotenv/config';

const API_BASE = 'http://localhost:8787';

async function seedData() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // 1. Create a Product Concept
    console.log('📦 Creating product concept...');
    const productResponse = await fetch(`${API_BASE}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'SmartDesk Pro',
        tagline: 'Your AI-powered workspace companion',
        description: 'An AI-powered desk device that helps remote workers stay focused, organized, and productive throughout their workday. Features include smart lighting, posture correction, and focus mode.',
        hypothesis: 'Remote workers struggle with distraction and maintaining productivity. A smart desk companion that provides environmental optimization and gentle nudges can improve focus by 40%.',
        target_audience: 'Remote workers and digital nomads, ages 25-45, working in tech and creative industries',
        status: 'testing',
        created_by: 'human'
      })
    });
    const product = await productResponse.json();
    console.log(`✅ Created product: ${product.data.id} - ${product.data.title}\n`);

    // 2. Create an Experiment
    console.log('🧪 Creating experiment...');
    const experimentResponse = await fetch(`${API_BASE}/api/experiments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: product.data.id,
        name: 'Facebook Campaign - Remote Workers',
        platform: 'meta',
        status: 'running',
        goal: 'leads',
        budget_total_usd: 500,
        budget_per_day_usd: 50,
        min_leads_for_decision: 50,
        target_cpl_threshold_usd: 10,
        round: 1,
        target_audience: 'Remote workers in tech, 25-45 years old',
        created_by: 'human'
      })
    });
    const experiment = await experimentResponse.json();
    if (!experiment.success) {
      console.error('❌ Failed to create experiment:', experiment.message);
      throw new Error(experiment.message);
    }
    console.log(`✅ Created experiment: ${experiment.data.id} - ${experiment.data.name}\n`);

    // 3. Create Ad Variants
    console.log('🎨 Creating ad variants...');

    const variant1Response = await fetch(`${API_BASE}/api/ad-variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        experiment_id: experiment.data.id,
        product_id: product.data.id,
        platform: 'meta',
        headline: 'Work Smarter, Not Harder',
        body: 'Transform your workspace with AI. SmartDesk Pro helps you stay focused and productive all day long. 40% more productive work hours guaranteed.',
        image_url: 'https://via.placeholder.com/1200x628/3b82f6/ffffff?text=SmartDesk+Pro',
        cta: 'Learn More',
        status: 'active',
        created_by: 'agent'
      })
    });
    const variant1 = await variant1Response.json();
    console.log(`✅ Created ad variant: ${variant1.data.id} - "${variant1.data.headline}"`);

    const variant2Response = await fetch(`${API_BASE}/api/ad-variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        experiment_id: experiment.data.id,
        product_id: product.data.id,
        platform: 'meta',
        headline: 'Remote Work, Perfected',
        body: 'Join 10,000+ remote professionals who boosted their productivity with SmartDesk Pro. Smart lighting, posture alerts, and focus mode built-in.',
        image_url: 'https://via.placeholder.com/1200x628/10b981/ffffff?text=Remote+Work+Solution',
        cta: 'Get Started',
        status: 'active',
        created_by: 'agent'
      })
    });
    const variant2 = await variant2Response.json();
    console.log(`✅ Created ad variant: ${variant2.data.id} - "${variant2.data.headline}"\n`);

    // 4. Create a Lead
    console.log('👤 Creating lead...');
    const leadResponse = await fetch(`${API_BASE}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: product.data.id,
        ad_id: variant1.data.id,
        email: 'john.doe@example.com',
        name: 'John Doe',
        source: 'facebook_ad',
        metadata: {
          utm_source: 'facebook',
          utm_campaign: 'remote-workers-q1',
          device: 'mobile'
        }
      })
    });
    const lead = await leadResponse.json();
    console.log(`✅ Created lead: ${lead.data.id} - ${lead.data.email}\n`);

    // 5. Create a Landing Page
    console.log('🌐 Creating landing page...');
    const landingResponse = await fetch(`${API_BASE}/api/landing/${product.data.id}`);
    const landing = await landingResponse.json();
    console.log(`✅ Created landing page: ${landing.data.id}\n`);

    // 6. Add some engagement to the landing page
    console.log('❤️  Adding engagement...');
    await fetch(`${API_BASE}/api/landing/${landing.data.id}/like`, {
      method: 'POST'
    });
    await fetch(`${API_BASE}/api/landing/${landing.data.id}/like`, {
      method: 'POST'
    });
    await fetch(`${API_BASE}/api/landing/${landing.data.id}/like`, {
      method: 'POST'
    });
    console.log('✅ Added 3 likes');

    await fetch(`${API_BASE}/api/landing/${landing.data.id}/dislike`, {
      method: 'POST'
    });
    console.log('✅ Added 1 dislike\n');

    // 7. Create a Pledge
    console.log('💰 Creating pledge...');
    const pledgeResponse = await fetch(`${API_BASE}/api/landing/${landing.data.id}/pledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'sarah.smith@example.com',
        name: 'Sarah Smith',
        amount_cents: 9900, // $99
        message: 'This looks amazing! Can\'t wait to get my hands on one!'
      })
    });
    const pledge = await pledgeResponse.json();
    console.log(`✅ Created pledge: ${pledge.data.id} - $${pledge.data.amount_cents / 100}\n`);

    // Summary
    console.log('🎉 Database seeding complete!\n');
    console.log('📊 Summary:');
    console.log(`   • 1 Product: ${product.data.title}`);
    console.log(`   • 1 Experiment: ${experiment.data.name}`);
    console.log(`   • 2 Ad Variants`);
    console.log(`   • 1 Lead: ${lead.data.email}`);
    console.log(`   • 1 Landing Page with 3 likes, 1 dislike`);
    console.log(`   • 1 Pledge: $${pledge.data.amount_cents / 100}`);
    console.log('\n✅ You can now view this data at http://localhost:5173\n');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  }
}

// Run the seeder
console.log('🚀 Ad Infinitum Database Seeder\n');
console.log('⏳ Waiting for backend to be ready...');

// Wait a bit for the server to start if needed
setTimeout(() => {
  seedData().then(() => {
    console.log('👋 Seeding script finished. Press Ctrl+C to exit or wait for auto-exit.\n');
    process.exit(0);
  });
}, 2000);
