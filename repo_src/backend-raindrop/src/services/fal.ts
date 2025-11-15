// fal.ai integration for ad image generation
// Based on sponsor-example-scripts/fal/src/lib/fal.ts

export interface FalImage {
  url: string;
  content_type: string;
  width: number;
  height: number;
}

export interface FalGenerationResult {
  images: FalImage[];
  timings: {
    inference: number;
  };
  seed: number;
  has_nsfw_concepts: boolean[];
  prompt: string;
}

export interface FalSubscribeRequest {
  input: {
    prompt: string;
    image_size?: string;
    num_images?: number;
    guidance_scale?: number;
    num_inference_steps?: number;
    enable_safety_checker?: boolean;
    output_format?: string;
  };
  logs?: boolean;
}

/**
 * Generate product/ad images using fal.ai FLUX.1
 * @param productName - Name of the product
 * @param audience - Target audience description
 * @param angle - Positioning angle (e.g., "productivity", "aesthetic")
 * @param numImages - Number of images to generate (default: 2)
 * @param apiKey - fal.ai API key
 * @returns Array of generated images with URLs and metadata
 */
export async function generateAdImages(options: {
  productName: string;
  productDescription: string;
  audience: string;
  angle: string;
  numImages?: number;
  apiKey: string;
}): Promise<FalImage[]> {
  const {
    productName,
    productDescription,
    audience,
    angle,
    numImages = 2,
    apiKey
  } = options;

  // Construct a detailed prompt optimized for ad creatives
  const prompt = [
    `Professional product photography for a paid social media advertisement.`,
    `Product: "${productName}" - ${productDescription}.`,
    `Target audience: ${audience}.`,
    `Marketing angle: ${angle}.`,
    `Style: Clean, modern, eye-catching composition.`,
    `Requirements: Hero shot, well-lit, no heavy text overlays, optimized for mobile feed.`,
    `Aesthetic: Premium, trustworthy, scroll-stopping.`
  ].join(' ');

  const requestBody: FalSubscribeRequest = {
    input: {
      prompt,
      image_size: 'landscape_4_3',  // 1200x900-ish, good for Meta ads
      num_images: numImages,
      guidance_scale: 3.5,  // Balance between creativity and prompt adherence
      num_inference_steps: 28,  // Good quality/speed tradeoff
      enable_safety_checker: true,
      output_format: 'jpeg'
    },
    logs: false
  };

  // fal.ai requires subscribing to a model and waiting for results
  const subscribeResponse = await fetch('https://queue.fal.run/fal-ai/flux/dev', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody.input)
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

  // Poll for results (fal.ai uses async processing)
  const maxAttempts = 60;  // 60 attempts * 2 seconds = 2 minutes max wait
  const pollInterval = 2000;  // 2 seconds

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const statusResponse = await fetch(`https://queue.fal.run/fal-ai/flux/dev/requests/${requestId}/status`, {
      headers: {
        'Authorization': `Key ${apiKey}`
      }
    });

    if (!statusResponse.ok) {
      throw new Error(`fal.ai status check error: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();

    if (statusData.status === 'COMPLETED') {
      // Get the actual result
      const resultResponse = await fetch(`https://queue.fal.run/fal-ai/flux/dev/requests/${requestId}`, {
        headers: {
          'Authorization': `Key ${apiKey}`
        }
      });

      if (!resultResponse.ok) {
        throw new Error(`fal.ai result fetch error: ${resultResponse.status}`);
      }

      const result: FalGenerationResult = await resultResponse.json();
      return result.images;
    } else if (statusData.status === 'FAILED') {
      throw new Error(`fal.ai generation failed: ${statusData.error || 'Unknown error'}`);
    }

    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('fal.ai generation timed out after 2 minutes');
}

/**
 * Generate a single hero image for a product concept
 * Optimized for quick generation with good quality
 */
export async function generateHeroImage(options: {
  productName: string;
  productDescription: string;
  audience: string;
  valueProposition: string;
  apiKey: string;
}): Promise<FalImage> {
  const images = await generateAdImages({
    ...options,
    angle: options.valueProposition,
    numImages: 1
  });

  if (images.length === 0) {
    throw new Error('No images generated');
  }

  return images[0];
}

/**
 * Batch generate images for multiple value propositions
 * Useful when creating multiple ad variants at once
 */
export async function generateImagesForVariants(options: {
  productName: string;
  productDescription: string;
  audience: string;
  valuePropositions: string[];
  apiKey: string;
}): Promise<Map<string, FalImage>> {
  const { productName, productDescription, audience, valuePropositions, apiKey } = options;

  // Generate images for each value prop in parallel
  const imagePromises = valuePropositions.map(async (valueProp) => {
    const image = await generateHeroImage({
      productName,
      productDescription,
      audience,
      valueProposition: valueProp,
      apiKey
    });
    return { valueProp, image };
  });

  const results = await Promise.all(imagePromises);

  // Create a map of value_proposition -> image
  const imageMap = new Map<string, FalImage>();
  for (const { valueProp, image } of results) {
    imageMap.set(valueProp, image);
  }

  return imageMap;
}
