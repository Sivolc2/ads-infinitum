import { z } from 'zod';

// LandingPage schema
export const LandingPageSchema = z.object({
  id: z.string().describe('Unique identifier, e.g., "lp_..."'),
  product_id: z.string().describe('Foreign key to ProductConcept'),
  lovable_url: z.string().url().describe('Generated via Build-with-URL'),
  hero_image_url: z.string().url().describe('Hero image URL'),
  gallery_image_urls: z.array(z.string().url()).default([]).describe('Gallery images'),

  pitch_markdown: z.string().describe('Copy used on the page'),
  estimate_cost_to_deliver_usd: z.number().positive().optional().describe('Estimated cost to deliver'),
  call_to_action: z.string().describe('CTA, e.g., "Join the waitlist"'),

  likes_count: z.number().int().nonnegative().default(0).describe('Number of likes'),
  dislikes_count: z.number().int().nonnegative().default(0).describe('Number of dislikes'),

  // Funding fields
  pledge_count: z.number().int().nonnegative().default(0).describe('Number of pledges'),
  pledge_total_usd: z.number().nonnegative().default(0).describe('Total pledged amount'),
  funding_goal_usd: z.number().positive().optional().describe('Funding goal'),

  created_at: z.string().datetime().describe('ISO 8601 timestamp'),
  updated_at: z.string().datetime().describe('ISO 8601 timestamp'),
});

export type LandingPage = z.infer<typeof LandingPageSchema>;

// CreateLandingPage schema
export const CreateLandingPageSchema = LandingPageSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type CreateLandingPage = z.infer<typeof CreateLandingPageSchema>;

// UpdateLandingPage schema
export const UpdateLandingPageSchema = LandingPageSchema.partial().required({ id: true });

export type UpdateLandingPage = z.infer<typeof UpdateLandingPageSchema>;

// Pledge schema
export const PledgeSchema = z.object({
  id: z.string().describe('Unique identifier, e.g., "pledge_..."'),
  landing_page_id: z.string().describe('Foreign key to LandingPage'),
  amount_usd: z.number().positive().describe('Pledged amount'),
  email: z.string().email().optional().describe('User email'),
  name: z.string().optional().describe('User name'),
  message: z.string().optional().describe('Optional message'),
  created_at: z.string().datetime().describe('ISO 8601 timestamp'),
});

export type Pledge = z.infer<typeof PledgeSchema>;

export const CreatePledgeSchema = z.object({
  amount_usd: z.number().positive(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  message: z.string().optional(),
});

export type CreatePledge = z.infer<typeof CreatePledgeSchema>;

// Helper functions
export function generateLandingPageId(): string {
  return `lp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function generatePledgeId(): string {
  return `pledge_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
