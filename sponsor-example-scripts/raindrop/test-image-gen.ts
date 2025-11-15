// test-image-gen.ts
// Test script for image generation with fal.ai and Freepik

import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the root .env file
config({ path: join(__dirname, '../../.env') });

// Import after loading env vars
import { generateAdImages, imageToDataUrl } from './src/lib/image-gen';
import { writeFile } from 'fs/promises';

async function testImageGeneration() {
  console.log('=== Testing Image Generation Integration ===\n');

  const testConfig = {
    productName: 'SmartDesk Pro',
    audience: 'remote workers, 25-45, tech-savvy professionals',
    angle: 'productivity and ergonomic workspace optimization',
    numImages: 1,
  };

  // Test Freepik
  console.log('🎨 Testing Freepik...');
  console.log(`Product: ${testConfig.productName}`);
  console.log(`Audience: ${testConfig.audience}`);
  console.log(`Angle: ${testConfig.angle}\n`);

  try {
    const freepikStart = Date.now();
    const freepikImages = await generateAdImages({
      ...testConfig,
      provider: 'freepik',
    });
    const freepikTime = Date.now() - freepikStart;

    console.log(`✅ Freepik generated ${freepikImages.length} image(s) in ${freepikTime}ms`);
    for (let i = 0; i < freepikImages.length; i++) {
      const img = freepikImages[i];
      console.log(`   Image ${i + 1}:`);
      console.log(`   - Provider: ${img.provider}`);
      console.log(`   - Size: ${img.width}x${img.height}`);
      console.log(`   - Type: ${img.content_type}`);
      console.log(`   - Has base64: ${!!img.base64}`);

      // Save to file
      if (img.base64) {
        const buffer = Buffer.from(img.base64, 'base64');
        const filename = `test-freepik-${Date.now()}-${i + 1}.png`;
        await writeFile(filename, buffer);
        console.log(`   - Saved to: ${filename}`);
      }
    }
    console.log();
  } catch (error) {
    console.error('❌ Freepik test failed:', error);
    console.log();
  }

  // Test fal.ai (if FAL_KEY is set)
  if (process.env.FAL_KEY) {
    console.log('🎨 Testing fal.ai...');
    try {
      const falStart = Date.now();
      const falImages = await generateAdImages({
        ...testConfig,
        provider: 'fal',
      });
      const falTime = Date.now() - falStart;

      console.log(`✅ fal.ai generated ${falImages.length} image(s) in ${falTime}ms`);
      for (let i = 0; i < falImages.length; i++) {
        const img = falImages[i];
        console.log(`   Image ${i + 1}:`);
        console.log(`   - Provider: ${img.provider}`);
        console.log(`   - Size: ${img.width}x${img.height}`);
        console.log(`   - Type: ${img.content_type}`);
        console.log(`   - URL: ${img.url}`);

        // Download and save to file
        if (img.url) {
          const response = await fetch(img.url);
          const buffer = Buffer.from(await response.arrayBuffer());
          const filename = `test-fal-${Date.now()}-${i + 1}.jpg`;
          await writeFile(filename, buffer);
          console.log(`   - Saved to: ${filename}`);
        }
      }
      console.log();
    } catch (error) {
      console.error('❌ fal.ai test failed:', error);
      console.log();
    }
  } else {
    console.log('⚠️  Skipping fal.ai test (FAL_KEY not set)\n');
  }

  console.log('=== Test Complete ===');
}

testImageGeneration().catch(console.error);
