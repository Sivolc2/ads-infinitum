import { z } from 'zod';

// AdMetricsSnapshot schema
export const AdMetricsSnapshotSchema = z.object({
  id: z.string().describe('Unique identifier, e.g., "ams_..."'),
  ad_id: z.string().describe('Foreign key to AdVariant.id'),
  pulled_at: z.string().datetime().describe('Timestamp when metrics were pulled'),

  impressions: z.number().int().nonnegative().describe('Total impressions'),
  clicks: z.number().int().nonnegative().describe('Total clicks'),
  leads: z.number().int().nonnegative().describe('Total leads'),
  spend_usd: z.number().nonnegative().describe('Total spend in USD'),

  ctr: z.number().nonnegative().describe('Click-through rate: clicks/impressions'),
  cpl_usd: z.number().nonnegative().optional().describe('Cost per lead: spend/leads'),
  cpc_usd: z.number().nonnegative().optional().describe('Cost per click: spend/clicks'),
});

export type AdMetricsSnapshot = z.infer<typeof AdMetricsSnapshotSchema>;

// CreateAdMetricsSnapshot schema
export const CreateAdMetricsSnapshotSchema = AdMetricsSnapshotSchema.omit({
  id: true,
  ctr: true,
  cpl_usd: true,
  cpc_usd: true,
});

export type CreateAdMetricsSnapshot = z.infer<typeof CreateAdMetricsSnapshotSchema>;

// Helper function to generate metrics snapshot ID
export function generateMetricsSnapshotId(): string {
  return `ams_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// Helper function to calculate derived metrics
export function calculateDerivedMetrics(snapshot: CreateAdMetricsSnapshot): AdMetricsSnapshot {
  const ctr = snapshot.impressions > 0 ? snapshot.clicks / snapshot.impressions : 0;
  const cpl_usd = snapshot.leads > 0 ? snapshot.spend_usd / snapshot.leads : undefined;
  const cpc_usd = snapshot.clicks > 0 ? snapshot.spend_usd / snapshot.clicks : undefined;

  return {
    ...snapshot,
    id: generateMetricsSnapshotId(),
    ctr,
    cpl_usd,
    cpc_usd,
  };
}
