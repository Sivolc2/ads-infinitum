// Development server for testing without Raindrop CLI
// This simulates the Raindrop environment locally

import { serve } from '@hono/node-server';
import 'dotenv/config';

// Mock Raindrop environment for local development
class MockService {
  env: any;

  constructor() {
    // Mock environment with in-memory storage
    this.env = {
      // LLM Provider
      LLM_PROVIDER: process.env.LLM_PROVIDER || 'raindrop',
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,

      // Image Provider
      IMAGE_PROVIDER: process.env.IMAGE_PROVIDER || 'freepik',
      FREEPIK_API_KEY: process.env.FREEPIK_API_KEY,
      FAL_KEY: process.env.FAL_KEY,

      // Meta Ads
      META_AD_ACCOUNT_ID: process.env.META_AD_ACCOUNT_ID,
      META_PAGE_ID: process.env.META_PAGE_ID,

      // Mock Raindrop bindings (in-memory for dev)
      AD_DATA: new MockSmartBucket(),
      APP_CACHE: new MockKVCache(),
      LEAD_INGESTION: new MockQueue(),
      AI: new MockRaindropAI(),
    };
  }

  async fetch(request: Request): Promise<Response> {
    // Import the app dynamically to use our mocked env
    const indexModule = await import('./src/api/index.js');
    const ServiceClass = indexModule.default;
    const service = new ServiceClass();
    service.env = this.env;
    return service.fetch(request);
  }
}

// Mock implementations for local development
class MockSmartBucket {
  private storage = new Map<string, any>();

  async get(key: string) {
    const value = this.storage.get(key);
    if (!value) return null;

    // Return an object that mimics R2 object with text() method
    return {
      text: async () => value,
      json: async () => JSON.parse(value),
      arrayBuffer: async () => new TextEncoder().encode(value).buffer,
    };
  }

  async put(key: string, value: any) {
    // Store as string (like R2 does)
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    this.storage.set(key, stringValue);
    return { success: true };
  }

  async delete(key: string) {
    return this.storage.delete(key);
  }

  async list(options?: any) {
    const prefix = options?.prefix || '';
    const entries = Array.from(this.storage.entries())
      .filter(([key]) => key.startsWith(prefix));

    return {
      objects: entries.map(([key]) => ({
        key,
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

class MockQueue {
  async send(message: any) {
    console.log('📨 Queue message:', message);
    return { success: true };
  }
}

class MockRaindropAI {
  async run(model: string, options: any) {
    // Mock AI response - in production this would use actual Raindrop AI
    console.log(`🤖 Mock AI call: ${model}`);

    // For development, we'll throw an error to encourage using OpenRouter
    throw new Error(
      'Raindrop AI not available in local dev mode. Set LLM_PROVIDER=openrouter to use OpenRouter instead.'
    );
  }
}

// Seed database with sample products
async function seedDatabase(bucket: MockSmartBucket, cache: MockKVCache) {
  const { ProductService } = await import('./src/services/product-service.js');
  const productService = new ProductService(bucket, cache);

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

  console.log('🌱 Seeding database with sample products...');
  for (const productData of sampleProducts) {
    const product = await productService.create(productData);
    console.log(`   ✅ Created: ${product.title}`);
  }
  console.log('');
}

// Start the server
const service = new MockService();
const port = parseInt(process.env.PORT || '8787');

console.log('🚀 Starting Ad Infinitum Backend (Dev Mode)...\n');
console.log('📊 Configuration:');
console.log(`   LLM Provider: ${service.env.LLM_PROVIDER}`);
console.log(`   Image Provider: ${service.env.IMAGE_PROVIDER}`);
console.log(`   Freepik API: ${service.env.FREEPIK_API_KEY ? '✅ Configured' : '❌ Missing'}`);
console.log(`   FAL API: ${service.env.FAL_KEY ? '✅ Configured' : '❌ Missing'}`);
console.log(`   OpenRouter API: ${service.env.OPENROUTER_API_KEY ? '✅ Configured' : '❌ Missing'}`);
console.log('');
console.log('⚠️  Note: Using mock Raindrop bindings for local development');
console.log('   - In-memory storage (data not persisted)');
console.log('   - Raindrop AI unavailable (use LLM_PROVIDER=openrouter)');
console.log('');

serve(
  {
    fetch: service.fetch.bind(service),
    port,
  },
  async (info) => {
    console.log(`✅ Server running at http://localhost:${info.port}`);
    console.log('');

    // Seed database with sample products
    await seedDatabase(service.env.AD_DATA, service.env.APP_CACHE);

    console.log('📚 Available endpoints:');
    console.log('   GET  /health - Health check');
    console.log('   GET  /internal/config - Configuration status');
    console.log('   POST /internal/test-product-concept - Get test data');
    console.log('   POST /internal/generate-ad-variants - Generate ads');
    console.log('');
    console.log('   GET  /api/products - List products');
    console.log('   POST /api/products - Create product');
    console.log('   POST /api/ai/generate-product - AI generate product');
    console.log('   POST /api/ai/run-experiment - Run experiment');
    console.log('   GET  /api/experiments - List experiments');
    console.log('   GET  /api/landing/:productId - Get landing page');
    console.log('');
    console.log('🧪 Quick test:');
    console.log(`   curl http://localhost:${info.port}/internal/config`);
    console.log('');
  }
);
