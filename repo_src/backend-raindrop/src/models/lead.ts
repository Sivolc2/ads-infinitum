import { z } from 'zod';

// Lead schema
export const LeadSchema = z.object({
  id: z.string().describe('Unique identifier, e.g., "lead_..."'),
  product_id: z.string().describe('Foreign key to ProductConcept'),
  ad_id: z.string().optional().describe('Foreign key to AdVariant (null if direct from page)'),
  landing_page_id: z.string().optional().describe('Foreign key to LandingPage'),

  source: z.enum(['meta_lead_form', 'landing_form']).describe('Lead source'),
  email: z.string().email().optional().describe('Lead email'),
  name: z.string().optional().describe('Lead name'),
  raw_form_data: z.record(z.any()).optional().describe('JSON from Meta or form'),

  created_at: z.string().datetime().describe('ISO 8601 timestamp'),
});

export type Lead = z.infer<typeof LeadSchema>;

// CreateLead schema
export const CreateLeadSchema = LeadSchema.omit({
  id: true,
  created_at: true,
});

export type CreateLead = z.infer<typeof CreateLeadSchema>;

// Helper function to generate lead ID
export function generateLeadId(): string {
  return `lead_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
