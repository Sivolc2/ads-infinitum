# fal.ai FLUX.1 Text-to-Image API Example

This example demonstrates how to use fal.ai's FLUX.1 [dev] model to generate high-quality ad creatives for Kickstarter campaigns and paid social ads.

## Why fal.ai?

fal.ai provides fast, production-ready access to state-of-the-art image generation models like FLUX.1. It's perfect for generating:
- Kickstarter hero images
- Social media ad creatives
- Product mockups
- Campaign visuals

**Speed + Quality**: FLUX.1 delivers modern, eye-catching images in seconds, optimized for mobile feeds.

## Setup

1. Get your API key from [fal.ai Dashboard](https://fal.ai/dashboard/keys)

2. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Add your API key to the `.env` file:
   ```
   FAL_KEY=your_actual_api_key_here
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

## Usage

Run the example:
```bash
npm run dev
```

Or build and run:
```bash
npm run build
npm start
```

## What it does

The example:
- Generates 2 ad creative variants using FLUX.1 [dev]
- Takes product name, target audience, and positioning angle as input
- Uses optimized settings for ad creatives (landscape 4:3, safety checker enabled)
- Downloads and saves generated images locally
- Returns direct image URLs for immediate use

## API Features Used

- **Model**: FLUX.1 [dev] - high-quality, modern text-to-image
- **Image Size**: landscape_4_3 (1200x900) - perfect for social ads
- **Safety Checker**: Enabled to filter inappropriate content
- **Output Format**: JPEG for smaller file sizes
- **Guidance Scale**: 3.5 for balanced creativity and prompt adherence

## Integration

To integrate into your ad campaign pipeline, import the `generateFalAdImages` function:

```typescript
import { generateFalAdImages } from './lib/fal.js';

const images = await generateFalAdImages({
  productName: "SolarPanel X3",
  audience: "eco-conscious tech enthusiasts",
  angle: "sustainable productivity",
  numImages: 2
});

// Use the image URLs directly
images.forEach(img => {
  console.log(`<img src="${img.url}" alt="ad creative" />`);
});
```

## Use Cases in Your Pipeline

1. **A/B Testing**: Generate multiple creative variants for the same product
2. **Rapid Prototyping**: Create campaign visuals before photoshoots
3. **Social Ads**: Generate feed-optimized creatives for Meta/Instagram ads
4. **Kickstarter**: Create hero images and campaign visuals quickly

## vs Freepik

- **fal.ai**: Faster inference, FLUX.1 model, modern aesthetic, direct URLs
- **Freepik**: Base64 output, concept-art style, different pricing model

Choose fal when you need:
- Really fast generation (<10s)
- Modern, realistic imagery
- Multiple variants for A/B testing
- Direct image URLs (no base64 decoding)

## Resources

- [fal.ai Documentation](https://fal.ai/models/fal-ai/flux/dev/api)
- [FLUX.1 Model Card](https://fal.ai/models/fal-ai/flux/dev)
- [fal.ai Dashboard](https://fal.ai/dashboard)
