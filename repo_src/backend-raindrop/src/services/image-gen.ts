// Unified image generation abstraction supporting multiple providers
// Supports both fal.ai and Freepik

export type ImageGenProvider = 'fal' | 'freepik';

export type GeneratedImage = {
  url?: string;          // URL for fal.ai
  base64?: string;       // base64 for Freepik
  width?: number;
  height?: number;
  content_type?: string;
  provider: ImageGenProvider;
};

export type ImageGenOptions = {
  productName: string;
  productDescription: string;
  audience: string;
  angle: string;         // e.g. "anxiety relief", "productivity", "aesthetic desk setup"
  numImages?: number;
  provider?: ImageGenProvider;  // defaults to 'freepik'
  apiKey: string;        // API key for the selected provider
};

/**
 * Generate ad images using the specified provider (fal.ai or Freepik)
 */
export async function generateAdImages(options: ImageGenOptions): Promise<GeneratedImage[]> {
  const provider = options.provider || 'freepik';

  switch (provider) {
    case 'fal':
      return generateFalImages(options);
    case 'freepik':
      return generateFreepikImages(options);
    default:
      throw new Error(`Unknown image generation provider: ${provider}`);
  }
}

/**
 * Generate images using fal.ai FLUX.1
 */
async function generateFalImages(options: ImageGenOptions): Promise<GeneratedImage[]> {
  const { productName, productDescription, audience, angle, numImages = 1, apiKey } = options;

  const prompt = [
    `Kickstarter / paid social hero image for "${productName}".`,
    `Product: ${productDescription}.`,
    `Target audience: ${audience}.`,
    `Positioning angle: ${angle}.`,
    `Clean, eye-catching composition, no heavy text, looks great in a mobile feed.`,
  ].join(' ');

  // fal.ai requires subscribing to a model
  const subscribeResponse = await fetch('https://queue.fal.run/fal-ai/flux/dev', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      image_size: 'landscape_4_3',  // 1200x900-ish
      num_images: numImages,
      guidance_scale: 3.5,
      enable_safety_checker: true,
      output_format: 'jpeg',
    })
  });

  if (!subscribeResponse.ok) {
    const errorText = await subscribeResponse.text();
    throw new Error(`fal.ai subscribe error: ${subscribeResponse.status} - ${errorText}`);
  }

  const subscribeData = await subscribeResponse.json();
  const requestId = subscribeData.request_id;

  if (!requestId) {
    throw new Error('No request_id returned from fal.ai');
  }

  // Poll for results
  const maxAttempts = 60;
  const pollInterval = 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const statusResponse = await fetch(`https://queue.fal.run/fal-ai/flux/dev/requests/${requestId}/status`, {
      headers: { 'Authorization': `Key ${apiKey}` }
    });

    if (!statusResponse.ok) {
      throw new Error(`fal.ai status check error: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();

    if (statusData.status === 'COMPLETED') {
      const resultResponse = await fetch(`https://queue.fal.run/fal-ai/flux/dev/requests/${requestId}`, {
        headers: { 'Authorization': `Key ${apiKey}` }
      });

      if (!resultResponse.ok) {
        throw new Error(`fal.ai result fetch error: ${resultResponse.status}`);
      }

      const result = await resultResponse.json();
      const falImages = result.images as Array<{
        url: string;
        content_type: string;
        width: number;
        height: number;
      }>;

      return falImages.map(img => ({
        url: img.url,
        width: img.width,
        height: img.height,
        content_type: img.content_type,
        provider: 'fal' as const,
      }));
    } else if (statusData.status === 'FAILED') {
      throw new Error(`fal.ai generation failed: ${statusData.error || 'Unknown error'}`);
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('fal.ai generation timed out after 2 minutes');
}

/**
 * Generate images using Freepik text-to-image API
 */
async function generateFreepikImages(options: ImageGenOptions): Promise<GeneratedImage[]> {
  const { productName, productDescription, audience, angle, numImages = 1, apiKey } = options;

  const prompt = [
    `Professional product photography for social media advertisement.`,
    `Product: "${productName}" - ${productDescription}.`,
    `Target audience: ${audience}.`,
    `Marketing angle: ${angle}.`,
    `Style: Clean, modern, eye-catching, Kickstarter-style hero shot.`,
    `Aesthetic: Premium, vibrant, scroll-stopping, optimistic solarpunk vibe.`
  ].join(' ');

  const res = await fetch('https://api.freepik.com/v1/ai/text-to-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-freepik-api-key': apiKey,
    },
    body: JSON.stringify({
      prompt,
      negative_prompt: 'blurry, low quality, text artifacts, watermark, cluttered, dark, gloomy',
      num_images: numImages,
      image: { size: 'square_1_1' },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Freepik API error: ${res.status} – ${text}`);
  }

  const json = await res.json();
  const freepikImages = json.data as Array<{
    base64: string;
    has_nsfw: boolean;
  }>;

  return freepikImages.map((img) => ({
    base64: img.base64,
    width: 1024,  // Freepik square_1_1 is 1024x1024
    height: 1024,
    content_type: 'image/png',
    provider: 'freepik' as const,
  }));
}

/**
 * Convert a GeneratedImage to a data URL (for HTML embedding)
 */
export function imageToDataUrl(image: GeneratedImage): string {
  if (image.url) {
    return image.url;  // fal.ai provides direct URLs
  }
  if (image.base64) {
    return `data:${image.content_type || 'image/png'};base64,${image.base64}`;
  }
  throw new Error('Image has neither URL nor base64 data');
}

/**
 * Batch generate images for multiple value propositions
 * Used by ad-variant-generator
 */
export async function generateImagesForVariants(options: {
  productName: string;
  productDescription: string;
  audience: string;
  valuePropositions: string[];
  apiKey: string;
  provider?: ImageGenProvider;
}): Promise<Map<string, GeneratedImage>> {
  const { productName, productDescription, audience, valuePropositions, apiKey, provider = 'freepik' } = options;

  console.log(`🎨 Generating ${valuePropositions.length} images with ${provider}...`);

  const imageMap = new Map<string, GeneratedImage>();

  // Generate sequentially to respect rate limits
  for (let i = 0; i < valuePropositions.length; i++) {
    const valueProp = valuePropositions[i];
    console.log(`   [${i + 1}/${valuePropositions.length}] Generating image for: ${valueProp}`);

    try {
      const images = await generateAdImages({
        productName,
        productDescription,
        audience,
        angle: valueProp,
        numImages: 1,
        provider,
        apiKey
      });

      if (images.length > 0) {
        imageMap.set(valueProp, images[0]);
        console.log(`   ✅ Image generated successfully`);
      }

      // Add delay to respect rate limits
      if (i < valuePropositions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`   ❌ Failed to generate image for "${valueProp}":`, error);
    }
  }

  if (imageMap.size === 0) {
    throw new Error('Failed to generate any images');
  }

  return imageMap;
}
