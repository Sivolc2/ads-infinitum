// types/lead-intelligence.ts
// Data types for Lead Intelligence (Track B - Fastino integration)

export interface Lead {
  id: string;                         // "lead_..."
  product_id: string;
  ad_id: string | null;               // null if direct from page
  landing_page_id: string | null;

  source: "meta_lead_form" | "landing_form";
  email: string | null;
  name: string | null;
  raw_form_data: Record<string, any>; // JSON from Meta or your form

  created_at: string;
}

export interface UserProfile {
  id: string;                         // "usr_..."
  lead_id: string;
  segments: string[];                 // ["creator", "student", "freelancer"]
  interest_level: "high" | "medium" | "low";
  budget_band: "low" | "mid" | "high" | null;
  problem_tags: string[];             // ["overwhelm", "task management"]
  feature_requests: string[];
  sentiment: "excited" | "neutral" | "skeptical" | "negative" | null;

  created_at: string;
  updated_at: string;
}

export interface EnrichLeadRequest {
  lead: Lead;
}

export interface EnrichLeadResponse {
  lead_id: string;
  profile: UserProfile;
  enrichment_time_ms: number;
}

export interface AdMetricsSnapshot {
  id: string;                         // "ams_..."
  ad_id: string;                      // FK -> AdVariant.id
  pulled_at: string;                  // timestamp we pulled metrics

  impressions: number;
  clicks: number;
  leads: number;
  spend_usd: number;

  ctr: number;                        // derived: clicks/impressions
  cpl_usd: number;                    // derived: spend/leads
  cpc_usd: number;                    // derived: spend/clicks
}

export interface AdQualityStats {
  ad_id: string;

  // Aggregate metrics
  total_leads: number;
  avg_interest_level: number;         // 0-1 (low=0, medium=0.5, high=1)
  sentiment_breakdown: {
    excited: number;
    neutral: number;
    skeptical: number;
    negative: number;
  };

  // Quality indicators
  high_interest_rate: number;         // % of high interest leads
  quality_score: number;              // 0-100 composite score

  // Top segments & problems
  top_segments: string[];             // Top 5 segments
  top_problem_tags: string[];         // Top 5 problems
  top_feature_requests: string[];     // Top 5 requests

  // Budget distribution
  budget_distribution: {
    low: number;
    mid: number;
    high: number;
  };

  last_updated: string;
}
