import { z } from 'zod';

// ProductConcept schema
export const ProductConceptSchema = z.object({
  id: z.string().describe('Unique identifier, e.g., "pc_..."'),
  title: z.string().min(1).describe('Product title'),
  tagline: z.string().min(1).describe('Short tagline'),
  description: z.string().min(1).describe('Detailed description'),
  hypothesis: z.string().min(1).describe('What we think it solves'),
  target_audience: z.string().min(1).describe('Target segment, e.g., "Gen Z students with ADHD"'),
  status: z.enum(['draft', 'testing', 'validated', 'killed', 'handoff']).describe('Current status'),
  created_by: z.enum(['agent', 'human']).describe('Creator type'),
  created_at: z.string().datetime().describe('ISO 8601 timestamp'),
  updated_at: z.string().datetime().describe('ISO 8601 timestamp'),
});

export type ProductConcept = z.infer<typeof ProductConceptSchema>;

// CreateProductConcept schema (without id and timestamps)
export const CreateProductConceptSchema = ProductConceptSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type CreateProductConcept = z.infer<typeof CreateProductConceptSchema>;

// UpdateProductConcept schema (all fields optional except id)
export const UpdateProductConceptSchema = ProductConceptSchema.partial().required({ id: true });

export type UpdateProductConcept = z.infer<typeof UpdateProductConceptSchema>;

// Helper function to generate product ID
export function generateProductId(): string {
  return `pc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// Helper function to create timestamps
export function createTimestamps() {
  const now = new Date().toISOString();
  return {
    created_at: now,
    updated_at: now,
  };
}
