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
  (info) => {
    console.log(`✅ Server running at http://localhost:${info.port}`);
    console.log('');
    console.log('📚 Available endpoints:');
    console.log('   GET  /health - Health check');
    console.log('   GET  /internal/config - Configuration status');
    console.log('   POST /internal/test-product-concept - Get test data');
    console.log('   POST /internal/generate-ad-variants - Generate ads');
    console.log('');
    console.log('   GET  /api/products - List products');
    console.log('   POST /api/products - Create product');
    console.log('   GET  /api/experiments - List experiments');
    console.log('   GET  /api/landing/:productId - Get landing page');
    console.log('');
    console.log('🧪 Quick test:');
    console.log(`   curl http://localhost:${info.port}/internal/config`);
    console.log('');
  }
);
