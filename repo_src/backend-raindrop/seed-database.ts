// Seed script to populate database with sample products
import { ProductService } from './src/services/product-service';

// Mock storage for local development
class MockSmartBucket {
  private storage = new Map<string, any>();

  async get(key: string) {
    return this.storage.get(key) || null;
  }

  async put(key: string, value: any) {
    this.storage.set(key, value);
    return { success: true };
  }

  async delete(key: string) {
    return this.storage.delete(key);
  }

  async list(options?: any) {
    return {
      objects: Array.from(this.storage.entries()).map(([key, value]) => ({
        key,
        value,
        uploaded: new Date(),
      })),
      truncated: false,
    };
  }
}

class MockKVCache {
  private cache = new Map<string, any>();

  async get(key: string) {
    return this.cache.get(key) || null;
  }

  async put(key: string, value: any) {
    this.cache.set(key, value);
  }

  async delete(key: string) {
    return this.cache.delete(key);
  }
}

const sampleProducts = [
  {
    title: 'Smart Plant Monitor',
    tagline: 'Never kill a plant again',
    description: 'An IoT device that monitors soil moisture, light levels, and temperature to keep your plants thriving. Sends alerts to your phone when your plants need attention and provides personalized care recommendations.',
    hypothesis: 'Plant enthusiasts struggle to maintain optimal growing conditions and often forget watering schedules. This device provides real-time monitoring and actionable insights to ensure plant health.',
    target_audience: 'Urban millennials and Gen Z plant owners, ages 25-40, who love plants but struggle with plant care',
    status: 'draft' as const,
    created_by: 'agent' as const,
  },
  {
    title: 'Focus Flow Timer',
    tagline: 'Pomodoro meets ambient intelligence',
    description: 'A physical productivity timer with integrated ambient lighting and soundscapes. Uses the Pomodoro technique enhanced with binaural beats and color psychology to maximize focus and minimize distractions.',
    hypothesis: 'Remote workers need better tools to maintain focus in home environments filled with distractions. A dedicated physical device creates psychological commitment and environmental cues that software alone cannot provide.',
    target_audience: 'Knowledge workers, freelancers, and students ages 22-45 who work from home and struggle with focus',
    status: 'draft' as const,
    created_by: 'agent' as const,
  },
];

async function seedDatabase() {
  console.log('🌱 Seeding database with sample products...\n');

  const bucket = new MockSmartBucket();
  const cache = new MockKVCache();
  const productService = new ProductService(bucket, cache);

  // Check if products already exist
  const existing = await productService.list();

  if (existing.length >= 2) {
    console.log('✅ Database already has products. Skipping seed.\n');
    console.log(`Found ${existing.length} existing products:`);
    existing.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.title}`);
    });
    return;
  }

  // Create sample products
  for (const productData of sampleProducts) {
    const product = await productService.create(productData);
    console.log(`✅ Created: ${product.title}`);
    console.log(`   ID: ${product.id}`);
    console.log(`   Tagline: ${product.tagline}`);
    console.log('');
  }

  console.log('🎉 Database seeding complete!\n');

  // Verify
  const allProducts = await productService.list();
  console.log(`📊 Total products in database: ${allProducts.length}`);
}

// Run seed
seedDatabase().catch(console.error);
