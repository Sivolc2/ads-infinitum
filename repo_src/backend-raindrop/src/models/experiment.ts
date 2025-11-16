import { z } from 'zod';

// Optimization configuration schema
export const OptimizationConfigSchema = z.object({
  enabled: z.boolean().describe('Whether auto-optimization is enabled'),
  evaluation_interval_hours: z.number().min(1).max(168).describe('Hours between evaluations (1-168)'),
  min_impressions_threshold: z.number().min(100).describe('Minimum impressions before evaluation'),
  cpl_multiplier: z.number().min(1).describe('Pause if CPL > target * multiplier'),
  min_leads_for_decision: z.number().min(1).describe('Minimum leads before pausing'),
  auto_relaunch: z.boolean().describe('Automatically launch new variants'),
  max_variants_per_experiment: z.number().min(1).max(20).describe('Max total variants'),
  pause_underperforming: z.boolean().describe('Automatically pause underperforming ads'),
});

export type OptimizationConfig = z.infer<typeof OptimizationConfigSchema>;

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
  optimization_config: OptimizationConfigSchema.optional().describe('Auto-optimization settings'),
  last_optimization_at: z.string().datetime().optional().describe('Last optimization run timestamp'),
  next_optimization_at: z.string().datetime().optional().describe('Next scheduled optimization timestamp'),
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
