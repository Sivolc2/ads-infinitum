import { z } from 'zod';

// AdVariant schema
export const AdVariantSchema = z.object({
  id: z.string().describe('Unique identifier, e.g., "ad_..."'),
  experiment_id: z.string().describe('Foreign key to AdExperiment'),
  product_id: z.string().describe('Foreign key to ProductConcept'),

  platform: z.literal('meta').describe('Ad platform'),
  meta_campaign_id: z.string().optional().describe('Meta Campaign ID'),
  meta_adset_id: z.string().optional().describe('Meta Ad Set ID'),
  meta_ad_id: z.string().optional().describe('Meta Ad ID from Graph API'),

  headline: z.string().min(1).describe('Ad headline'),
  body: z.string().min(1).describe('Ad body copy'),
  image_url: z.string().url().describe('Image URL from fal.ai'),
  cta: z.string().min(1).describe('Call to action, e.g., "Sign up"'),

  status: z.enum(['draft', 'active', 'paused', 'deleted']).describe('Ad status'),
  created_by: z.enum(['agent', 'human']).describe('Creator type'),
  created_at: z.string().datetime().describe('ISO 8601 timestamp'),
  updated_at: z.string().datetime().describe('ISO 8601 timestamp'),
});

export type AdVariant = z.infer<typeof AdVariantSchema>;

// CreateAdVariant schema
export const CreateAdVariantSchema = AdVariantSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type CreateAdVariant = z.infer<typeof CreateAdVariantSchema>;

// UpdateAdVariant schema
export const UpdateAdVariantSchema = AdVariantSchema.partial().required({ id: true });

export type UpdateAdVariant = z.infer<typeof UpdateAdVariantSchema>;

// Helper function to generate ad variant ID
export function generateAdVariantId(): string {
  return `ad_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
