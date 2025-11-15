import { z } from 'zod';

// AdExperiment schema
export const AdExperimentSchema = z.object({
  id: z.string().describe('Unique identifier, e.g., "exp_..."'),
  product_id: z.string().describe('Foreign key to ProductConcept'),
  platform: z.literal('meta').describe('Ad platform'),
  goal: z.enum(['leads', 'clicks']).describe('Campaign goal'),
  budget_total_usd: z.number().positive().describe('Total budget in USD'),
  budget_per_day_usd: z.number().positive().describe('Daily budget in USD'),
  min_leads_for_decision: z.number().int().positive().describe('Minimum leads before making decisions'),
  target_cpl_threshold_usd: z.number().positive().describe('Target cost per lead, e.g., 1.0'),
  status: z.enum(['pending', 'running', 'paused', 'completed']).describe('Experiment status'),
  round: z.number().int().nonnegative().describe('Exploration/iteration cycle'),
  created_at: z.string().datetime().describe('ISO 8601 timestamp'),
  updated_at: z.string().datetime().describe('ISO 8601 timestamp'),
});

export type AdExperiment = z.infer<typeof AdExperimentSchema>;

// CreateAdExperiment schema
export const CreateAdExperimentSchema = AdExperimentSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type CreateAdExperiment = z.infer<typeof CreateAdExperimentSchema>;

// UpdateAdExperiment schema
export const UpdateAdExperimentSchema = AdExperimentSchema.partial().required({ id: true });

export type UpdateAdExperiment = z.infer<typeof UpdateAdExperimentSchema>;

// Helper function to generate experiment ID
export function generateExperimentId(): string {
  return `exp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
