import { z } from 'zod';

// BuildContract schema
export const BuildContractSchema = z.object({
  id: z.string().describe('Unique identifier, e.g., "build_..."'),
  product_id: z.string().describe('Foreign key to ProductConcept'),
  platform: z.enum(['freelancer', 'upwork']).describe('Freelancer platform'),
  external_job_id: z.string().optional().describe('Set after posting'),

  status: z.enum(['draft', 'posted', 'in_progress', 'completed', 'cancelled']).describe('Build status'),

  spec_markdown: z.string().describe('Generated requirements doc'),
  budget_usd: z.number().positive().describe('Budget in USD'),
  notes_for_builder: z.string().describe('High-level context from experiments'),

  created_at: z.string().datetime().describe('ISO 8601 timestamp'),
  updated_at: z.string().datetime().describe('ISO 8601 timestamp'),
});

export type BuildContract = z.infer<typeof BuildContractSchema>;

// CreateBuildContract schema
export const CreateBuildContractSchema = BuildContractSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type CreateBuildContract = z.infer<typeof CreateBuildContractSchema>;

// UpdateBuildContract schema
export const UpdateBuildContractSchema = BuildContractSchema.partial().required({ id: true });

export type UpdateBuildContract = z.infer<typeof UpdateBuildContractSchema>;

// Helper function to generate build contract ID
export function generateBuildContractId(): string {
  return `build_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
