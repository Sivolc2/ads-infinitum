# Image Generation Integration

This integration provides a unified abstraction layer for generating ad images using multiple providers (fal.ai and Freepik).

## Architecture

The image generation system is built with:

- **Abstraction Layer** (`src/lib/image-gen.ts`): Unified interface for multiple providers
- **API Endpoint** (`/generate-images`): HTTP endpoint for generating images
- **Provider Support**: fal.ai (FLUX.1) and Freepik (text-to-image API)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Keys

Add your API keys to the root `.env` file:

```bash
# Freepik (required for Freepik provider)
FREEPIK_API_KEY=your_freepik_api_key

# fal.ai (required for fal provider)
FAL_KEY=your_fal_api_key
```

## Usage

### Option 1: Use the Abstraction Layer Directly

```typescript
import { generateAdImages } from './src/lib/image-gen';

// Generate with Freepik
const images = await generateAdImages({
  productName: 'SmartDesk Pro',
  audience: 'remote workers, 25-45, tech-savvy professionals',
  angle: 'productivity and ergonomic workspace optimization',
  numImages: 2,
  provider: 'freepik',  // or 'fal'
});

// Access the generated images
for (const img of images) {
  if (img.provider === 'freepik') {
    // Freepik returns base64-encoded images
    console.log('Base64:', img.base64);
  } else if (img.provider === 'fal') {
    // fal.ai returns URLs
    console.log('URL:', img.url);
  }
}
```

### Option 2: Use the API Endpoint

```bash
# Start the Raindrop service
npm run dev
```

Then make a POST request to `/generate-images`:

```bash
curl -X POST http://localhost:8787/generate-images \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "SmartDesk Pro",
    "audience": "remote workers, 25-45, tech-savvy professionals",
    "angle": "productivity and ergonomic workspace optimization",
    "numImages": 2,
    "provider": "freepik"
  }'
```

Response:

```json
{
  "images": [
    {
      "base64": "iVBORw0KGgoAAAANS...",
      "dataUrl": "data:image/png;base64,iVBORw0KGgoAAAANS...",
      "width": 1024,
      "height": 1024,
      "provider": "freepik"
    }
  ],
  "provider": "freepik",
  "generationTime": 2164
}
```

## Testing

Run the test script to verify both providers work:

```bash
npm run test:image-gen
```

This will:
1. Test Freepik image generation (if `FREEPIK_API_KEY` is set)
2. Test fal.ai image generation (if `FAL_KEY` is set)
3. Save generated images to the current directory

## Provider Comparison

| Feature | Freepik | fal.ai |
|---------|---------|--------|
| Output Format | Base64 PNG | JPEG URL |
| Image Size | 1024x1024 (square) | 1200x900 (landscape) |
| Speed | ~2-3 seconds | ~3-5 seconds |
| Safety Filter | Built-in NSFW filter | Configurable safety checker |
| Cost | Check Freepik pricing | Check fal.ai pricing |

## Integration with Ad Infinitum

According to the [v1-design.md](../../docs/guides/v1-design.md), image generation is used at multiple points:

### Step 1: Generate Initial Ads
```typescript
// Generate product images for ad creatives
const images = await generateAdImages({
  productName: productConcept.title,
  audience: productConcept.target_audience,
  angle: adVariant.headline,
  provider: 'freepik',  // or 'fal'
});

// Store the image URL/data in AdVariant
adVariant.image_url = imageToDataUrl(images[0]);
```

### Step 4: Landing Page Promotion
```typescript
// Generate hero/gallery images for the landing page
const heroImages = await generateAdImages({
  productName: productConcept.title,
  audience: productConcept.target_audience,
  angle: 'Kickstarter campaign hero image',
  numImages: 3,
  provider: 'freepik',
});

landingPage.hero_image_url = imageToDataUrl(heroImages[0]);
landingPage.gallery_image_urls = heroImages.map(imageToDataUrl);
```

## Helper Functions

### `imageToDataUrl(image: GeneratedImage): string`
Converts a GeneratedImage to a data URL for HTML embedding or direct use.

### `imageToBuffer(image: GeneratedImage): Promise<Buffer>`
Downloads/decodes the image to a Buffer for file saving or further processing.

## Example: Full Ad Generation Workflow

```typescript
import { generateAdImages, imageToDataUrl } from './src/lib/image-gen';

async function createAdVariant(productConcept: ProductConcept) {
  // Step 1: Generate copy with OpenRouter
  const adCopy = await generateAdCopy(productConcept);

  // Step 2: Generate images with your preferred provider
  const images = await generateAdImages({
    productName: productConcept.title,
    audience: productConcept.target_audience,
    angle: adCopy.headline,
    numImages: 1,
    provider: 'freepik',  // Switch to 'fal' if needed
  });

  // Step 3: Create the ad variant
  const adVariant = {
    id: generateId(),
    product_id: productConcept.id,
    headline: adCopy.headline,
    body: adCopy.body,
    image_url: imageToDataUrl(images[0]),
    cta: 'Sign up',
    status: 'draft',
  };

  return adVariant;
}
```

## Error Handling

Both providers handle errors gracefully:

```typescript
try {
  const images = await generateAdImages({
    productName: 'Test Product',
    audience: 'test audience',
    angle: 'test angle',
    provider: 'freepik',
  });
} catch (error) {
  if (error.message.includes('API key')) {
    console.error('Missing or invalid API key');
  } else if (error.message.includes('400')) {
    console.error('Invalid parameters');
  } else {
    console.error('Image generation failed:', error);
  }
}
```

## Future Enhancements

- [ ] Add Stability AI as a third provider
- [ ] Support batch generation for multiple angles
- [ ] Add image caching to reduce API calls
- [ ] Support custom image dimensions per provider
- [ ] Add retry logic with exponential backoff
- [ ] Store generated images in SmartBuckets for persistence
