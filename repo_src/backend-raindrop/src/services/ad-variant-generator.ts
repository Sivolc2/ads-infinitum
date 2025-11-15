// Ad Variant Generation Service - Track C
// Orchestrates LLM (Raindrop AI or OpenRouter) + Image Gen (Freepik/fal.ai) to create complete ad variants

import { ProductConcept, AdVariant, CopyVariation } from '../models/types';
import { generateAdCopy as generateAdCopyOpenRouter } from './openrouter';
import { generateAdCopy as generateAdCopyRaindrop, RaindropAI, shouldUseRaindropAI } from './raindrop-llm';
import { generateImagesForVariants, GeneratedImage, ImageGenProvider, imageToDataUrl } from './image-gen';
import { generateId } from '../utils/id-generator';

export interface AdVariantGenerationOptions {
  productConcept: ProductConcept;
  experimentId?: string;
  numVariants?: number;
  openrouterApiKey?: string;  // Optional, only needed if not using Raindrop AI
  imageApiKey: string;  // API key for image generation (Freepik or fal.ai)
  imageProvider?: ImageGenProvider;  // 'freepik' or 'fal' (default: freepik)
  raindropAI?: RaindropAI;  // Optional, Raindrop AI instance from env.AI
  env?: any;  // For checking LLM_PROVIDER
}

export interface GeneratedAdVariant extends AdVariant {
  // Extended with generation metadata
  generation_metadata: {
    value_proposition: string;
    image_width: number;
    image_height: number;
    generated_at: string;
  };
}

/**
 * Main function to generate complete ad variants
 * Combines LLM-generated copy with AI-generated images
 */
export async function generateAdVariants(
  options: AdVariantGenerationOptions
): Promise<GeneratedAdVariant[]> {
  const {
    productConcept,
    experimentId,
    numVariants = 3,
    openrouterApiKey,
    imageApiKey,
    imageProvider = 'freepik',
    raindropAI
  } = options;

  console.log(`🎨 Generating ${numVariants} ad variants for: ${productConcept.title}`);
  console.log(`📊 Using ${imageProvider} for images`);

  // Determine which LLM provider to use
  const useRaindrop = raindropAI && shouldUseRaindropAI(options.env || process.env);
  const llmProvider = useRaindrop ? 'Raindrop AI (deepseek-r1)' : 'OpenRouter';

  // Step 1: Generate ad copy variations using selected LLM
  console.log(`📝 Step 1/3: Generating ad copy with ${llmProvider}...`);

  let copyVariations: CopyVariation[];

  if (useRaindrop && raindropAI) {
    // Use Raindrop's built-in AI
    copyVariations = await generateAdCopyRaindrop({
      productName: productConcept.title,
      productDescription: productConcept.description,
      targetAudience: productConcept.target_audience,
      hypothesis: productConcept.hypothesis,
      numVariations: numVariants,
      ai: raindropAI
    });
  } else {
    // Use OpenRouter
    if (!openrouterApiKey) {
      throw new Error('openrouterApiKey is required when not using Raindrop AI');
    }
    copyVariations = await generateAdCopyOpenRouter({
      productName: productConcept.title,
      productDescription: productConcept.description,
      targetAudience: productConcept.target_audience,
      hypothesis: productConcept.hypothesis,
      numVariations: numVariants,
      apiKey: openrouterApiKey
    });
  }

  console.log(`✅ Generated ${copyVariations.length} copy variations`);

  // Step 2: Extract unique value propositions for image generation
  const valuePropositions = copyVariations.map(copy => copy.value_proposition);

  console.log(`🖼️  Step 2/3: Generating images with ${imageProvider}...`);
  console.log(`   Value propositions: ${valuePropositions.join(', ')}`);

  // Generate images for each unique value proposition
  const imageMap = await generateImagesForVariants({
    productName: productConcept.title,
    productDescription: productConcept.description,
    audience: productConcept.target_audience,
    valuePropositions,
    apiKey: imageApiKey,
    provider: imageProvider
  });

  console.log(`✅ Generated ${imageMap.size} images`);

  // Step 3: Combine copy + images into complete AdVariant objects
  console.log('🔧 Step 3/3: Assembling ad variants...');

  const timestamp = new Date().toISOString();
  const variants: GeneratedAdVariant[] = [];

  for (let i = 0; i < copyVariations.length; i++) {
    const copy = copyVariations[i];
    const image = imageMap.get(copy.value_proposition);

    if (!image) {
      console.warn(`⚠️  No image found for value proposition: ${copy.value_proposition}`);
      continue;
    }

    const variant: GeneratedAdVariant = {
      id: generateId('ad'),
      experiment_id: experimentId || '',
      product_id: productConcept.id,
      platform: 'meta',
      headline: copy.headline,
      body: copy.body,
      image_url: imageToDataUrl(image),  // Handles both URL and base64
      cta: copy.cta,
      status: 'draft',
      created_by: 'agent',
      created_at: timestamp,
      updated_at: timestamp,
      generation_metadata: {
        value_proposition: copy.value_proposition,
        image_width: image.width || 1024,
        image_height: image.height || 1024,
        generated_at: timestamp
      }
    };

    variants.push(variant);
  }

  console.log(`✅ Successfully generated ${variants.length} complete ad variants`);

  return variants;
}

/**
 * Generate a single ad variant (useful for quick iteration)
 */
export async function generateSingleAdVariant(options: {
  productConcept: ProductConcept;
  experimentId?: string;
  openrouterApiKey: string;
  falApiKey: string;
}): Promise<GeneratedAdVariant> {
  const variants = await generateAdVariants({
    ...options,
    numVariants: 1
  });

  if (variants.length === 0) {
    throw new Error('Failed to generate ad variant');
  }

  return variants[0];
}

/**
 * Regenerate variants with different value propositions
 * Useful when initial variants don't perform well
 */
export async function regenerateWithNewAngles(options: {
  productConcept: ProductConcept;
  experimentId?: string;
  excludeAngles?: string[];  // Value props to avoid
  numVariants?: number;
  openrouterApiKey: string;
  falApiKey: string;
}): Promise<GeneratedAdVariant[]> {
  // TODO: Enhance the prompt to OpenRouter to avoid certain angles
  // For now, just generate new variants
  return generateAdVariants(options);
}

/**
 * Preview ad variant generation cost estimate
 * Useful for budget planning
 */
export function estimateGenerationCost(numVariants: number): {
  openrouter_cost_usd: number;
  fal_cost_usd: number;
  total_cost_usd: number;
} {
  // Rough estimates (as of 2025):
  // - Claude 3.5 Sonnet via OpenRouter: ~$3/1M input tokens, ~$15/1M output tokens
  // - fal.ai FLUX.1 dev: ~$0.025 per image

  // Average tokens per copy generation request: ~1500 input, ~500 output
  const avgInputTokens = 1500;
  const avgOutputTokens = 500;
  const openrouterCostPerRequest =
    (avgInputTokens / 1_000_000) * 3 +
    (avgOutputTokens / 1_000_000) * 15;

  const falCostPerImage = 0.025;

  return {
    openrouter_cost_usd: openrouterCostPerRequest,
    fal_cost_usd: numVariants * falCostPerImage,
    total_cost_usd: openrouterCostPerRequest + (numVariants * falCostPerImage)
  };
}
