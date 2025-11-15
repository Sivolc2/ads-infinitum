// src/lib/image-gen.ts
// Unified image generation abstraction supporting multiple providers

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
  audience: string;
  angle: string;         // e.g. "anxiety relief", "productivity", "aesthetic desk setup"
  numImages?: number;
  provider?: ImageGenProvider;  // defaults to 'fal'
};

/**
 * Generate ad images using the specified provider (fal.ai or Freepik)
 */
export async function generateAdImages(options: ImageGenOptions): Promise<GeneratedImage[]> {
  const provider = options.provider || 'fal';

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
  const { fal } = await import('@fal-ai/client');
  const { productName, audience, angle, numImages = 2 } = options;

  const prompt = [
    `Kickstarter / paid social hero image for a new product called "${productName}".`,
    `Target audience: ${audience}.`,
    `Positioning angle: ${angle}.`,
    `Clean, eye-catching composition, no heavy text, looks great in a mobile feed.`,
  ].join(' ');

  const result = await fal.subscribe('fal-ai/flux/dev', {
    input: {
      prompt,
      image_size: 'landscape_4_3',  // 1200x900-ish
      num_images: numImages,
      guidance_scale: 3.5,
      enable_safety_checker: true,
      output_format: 'jpeg',
    },
    logs: false,
  });

  // result.data.images is the standard output schema for this model
  const falImages = (result.data as any).images as Array<{
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
}

/**
 * Generate images using Freepik text-to-image API
 */
async function generateFreepikImages(options: ImageGenOptions): Promise<GeneratedImage[]> {
  const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY;

  if (!FREEPIK_API_KEY) {
    throw new Error('FREEPIK_API_KEY environment variable is not set');
  }

  const { productName, audience, angle, numImages = 2 } = options;

  const prompt = [
    `Kickstarter / paid social hero image for a new product called "${productName}".`,
    `Target audience: ${audience}.`,
    `Positioning angle: ${angle}.`,
    `Clean, eye-catching composition, no heavy text, looks great in a mobile feed.`,
  ].join(' ');

  const res = await fetch('https://api.freepik.com/v1/ai/text-to-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-freepik-api-key': FREEPIK_API_KEY,
    },
    body: JSON.stringify({
      prompt,
      negative_prompt: 'blurry, low quality, text artifacts, watermark',
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

  return freepikImages.map((img, index) => ({
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
 * Download image from URL or decode base64 to Buffer
 */
export async function imageToBuffer(image: GeneratedImage): Promise<Buffer> {
  if (image.url) {
    const response = await fetch(image.url);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  if (image.base64) {
    return Buffer.from(image.base64, 'base64');
  }
  throw new Error('Image has neither URL nor base64 data');
}
