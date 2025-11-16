/**
 * Data Tracker Utility
 * Saves generated ad variants and images to local data/ folder for tracking
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { GeneratedAdVariant } from '../services/ad-variant-generator';

export interface ExperimentSummary {
  experiment_id: string;
  product_id: string;
  product_title: string;
  num_variants: number;
  generated_at: string;
  variants: Array<{
    id: string;
    headline: string;
    body: string;
    cta: string;
    value_proposition: string;
    image_path: string;
  }>;
}

/**
 * Save generated ad variants to data/ folder
 * Organizes by experiment_id with images and metadata
 */
export async function saveAdVariantsToData(
  variants: GeneratedAdVariant[],
  productTitle: string
): Promise<string> {
  if (variants.length === 0) {
    throw new Error('No variants to save');
  }

  const experimentId = variants[0].experiment_id || 'no-experiment';
  const productId = variants[0].product_id;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // Create directory structure: data/experiments/{experiment_id}_{timestamp}/
  const baseDir = join(process.cwd(), 'data', 'experiments', `${experimentId}_${timestamp}`);
  await mkdir(baseDir, { recursive: true });

  console.log(`💾 Saving ${variants.length} ad variants to: ${baseDir}`);

  const summary: ExperimentSummary = {
    experiment_id: experimentId,
    product_id: productId,
    product_title: productTitle,
    num_variants: variants.length,
    generated_at: new Date().toISOString(),
    variants: [],
  };

  // Save each variant
  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];
    const variantDir = join(baseDir, `variant_${i + 1}_${variant.id}`);
    await mkdir(variantDir, { recursive: true });

    // Save metadata
    const metadata = {
      id: variant.id,
      experiment_id: variant.experiment_id,
      product_id: variant.product_id,
      platform: variant.platform,
      headline: variant.headline,
      body: variant.body,
      cta: variant.cta,
      status: variant.status,
      created_by: variant.created_by,
      created_at: variant.created_at,
      generation_metadata: variant.generation_metadata,
    };

    await writeFile(
      join(variantDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );

    // Save image
    const imagePath = join(variantDir, 'image.png');
    if (variant.image_url.startsWith('data:')) {
      // Data URL - extract base64 and save
      const base64Data = variant.image_url.split(',')[1];
      await writeFile(imagePath, Buffer.from(base64Data, 'base64'));
    } else if (variant.image_url.startsWith('http')) {
      // HTTP URL - fetch and save
      try {
        const response = await fetch(variant.image_url);
        const buffer = Buffer.from(await response.arrayBuffer());
        await writeFile(imagePath, buffer);
      } catch (error) {
        console.error(`Failed to download image for variant ${variant.id}:`, error);
        // Save URL as text file instead
        await writeFile(
          join(variantDir, 'image_url.txt'),
          variant.image_url,
          'utf-8'
        );
      }
    }

    // Add to summary
    summary.variants.push({
      id: variant.id,
      headline: variant.headline,
      body: variant.body,
      cta: variant.cta,
      value_proposition: variant.generation_metadata.value_proposition,
      image_path: `variant_${i + 1}_${variant.id}/image.png`,
    });

    console.log(`  ✅ Saved variant ${i + 1}/${variants.length}: ${variant.headline}`);
  }

  // Save experiment summary
  await writeFile(
    join(baseDir, 'experiment_summary.json'),
    JSON.stringify(summary, null, 2),
    'utf-8'
  );

  // Save human-readable summary
  const readmePath = join(baseDir, 'README.md');
  const readmeContent = generateReadme(summary);
  await writeFile(readmePath, readmeContent, 'utf-8');

  console.log(`✅ Saved experiment data to: ${baseDir}`);
  console.log(`📄 View summary: ${join(baseDir, 'README.md')}`);

  return baseDir;
}

/**
 * Generate human-readable README for the experiment
 */
function generateReadme(summary: ExperimentSummary): string {
  const lines = [
    `# Ad Experiment: ${summary.product_title}`,
    '',
    `**Experiment ID:** ${summary.experiment_id}`,
    `**Product ID:** ${summary.product_id}`,
    `**Generated:** ${summary.generated_at}`,
    `**Variants:** ${summary.num_variants}`,
    '',
    '---',
    '',
    '## Ad Variants',
    '',
  ];

  for (let i = 0; i < summary.variants.length; i++) {
    const variant = summary.variants[i];
    lines.push(
      `### Variant ${i + 1}: ${variant.headline}`,
      '',
      `**ID:** ${variant.id}`,
      `**Value Proposition:** ${variant.value_proposition}`,
      '',
      '**Headline:**',
      `> ${variant.headline}`,
      '',
      '**Body:**',
      `> ${variant.body}`,
      '',
      `**CTA:** ${variant.cta}`,
      '',
      `**Image:** \`${variant.image_path}\``,
      '',
      '---',
      ''
    );
  }

  return lines.join('\n');
}
