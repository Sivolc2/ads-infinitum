// utils/lovable-generator.ts
// Lovable Build-with-URL generator for Track E

import { ProductConcept } from '../models/product';
import { AdVariant } from '../models/ad-variant';

/**
 * Generate a Lovable Build-with-URL for a product
 *
 * Lovable accepts URL-encoded parameters to generate a landing page
 */
export function generateLovableUrl(
  product: ProductConcept,
  options: {
    heroImage?: string;
    galleryImages?: string[];
    winningAdVariant?: AdVariant;
    estimatedCost?: number;
  } = {}
): string {
  const baseUrl = 'https://lovable.dev/build';

  // Build page content from product and optional ad variant
  const title = product.title;
  const tagline = product.tagline || product.hypothesis.slice(0, 100);

  // Use winning ad copy if available, otherwise use product description
  const description = options.winningAdVariant
    ? `${options.winningAdVariant.body}\n\n${product.description}`
    : product.description;

  // Create feature list from hypothesis
  const features = [
    '✨ ' + product.hypothesis.slice(0, 80),
    '🎯 Designed for ' + product.target_audience,
    '💡 ' + (options.estimatedCost ? `Starting at $${options.estimatedCost}` : 'Affordable pricing'),
  ];

  // Build the page structure as markdown
  const pageContent = {
    title,
    tagline,
    hero_image: options.heroImage || '',
    sections: [
      {
        type: 'hero',
        heading: title,
        subheading: tagline,
        cta_text: 'Join Waitlist',
        cta_action: 'signup',
      },
      {
        type: 'features',
        heading: 'Why You\'ll Love It',
        items: features,
      },
      {
        type: 'description',
        heading: 'About This Product',
        body: description,
      },
      {
        type: 'gallery',
        heading: 'See It In Action',
        images: options.galleryImages || [],
      },
      {
        type: 'cta',
        heading: 'Be Among the First',
        body: 'Join our waitlist and get early access when we launch.',
        cta_text: 'Reserve Your Spot',
        cta_action: 'signup',
      },
    ],
    style: {
      theme: 'modern',
      color_scheme: 'vibrant',
    },
  };

  // Encode the page configuration
  const encodedConfig = encodeURIComponent(JSON.stringify(pageContent));

  // Build Lovable URL
  const lovableUrl = `${baseUrl}?config=${encodedConfig}`;

  return lovableUrl;
}

/**
 * Generate a simpler Lovable URL using query parameters
 * (Alternative approach if JSON config doesn't work)
 */
export function generateSimpleLovableUrl(
  product: ProductConcept,
  heroImage?: string
): string {
  const baseUrl = 'https://lovable.dev/build';

  const params = new URLSearchParams({
    title: product.title,
    tagline: product.tagline || product.hypothesis.slice(0, 100),
    description: product.description,
    audience: product.target_audience,
    hero_image: heroImage || '',
    cta: 'Join Waitlist',
    theme: 'kickstarter',
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * For demo purposes: generate a mock Lovable URL
 * In production, this would actually call Lovable's API
 */
export function generateMockLovableUrl(productId: string): string {
  return `https://lovable.dev/products/${productId}`;
}
