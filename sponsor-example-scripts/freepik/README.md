# Freepik Text-to-Image API Example

This example demonstrates how to use Freepik's text-to-image API to generate campaign creatives for Kickstarter-style landing pages.

## Setup

1. Get your API key from [Freepik API](https://www.freepik.com/api)

2. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Add your API key to the `.env` file:
   ```
   FREEPIK_API_KEY=your_actual_api_key_here
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
- Takes a product name and generates a Kickstarter-style hero image
- Uses Freepik's text-to-image API with optimized settings for campaign creatives
- Saves the generated image as a PNG file
- Shows how to use the base64 output in HTML

## API Features Used

- **Style**: Concept art with pastel colors and warm lighting
- **Size**: Square (1:1 ratio)
- **NSFW Filter**: Enabled
- **Negative prompt**: Filters out blurry/low quality images

## Integration

To integrate into your ad campaign pipeline, import the `generateCampaignImage` function:

```typescript
import { generateCampaignImage } from './lib/freepik.js';

const [img] = await generateCampaignImage(
  `Solarpunk hardware lab product shot, ${productName}, vibrant, optimistic`
);

// Use in HTML
const htmlImg = `<img src="data:image/png;base64,${img.base64}" />`;
```
