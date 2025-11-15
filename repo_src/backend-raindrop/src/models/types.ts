// Data models for Ad Infinitum - based on v1-design.md

// ===== Product & Experiment =====

export interface ProductConcept {
  id: string;                 // "pc_..."
  title: string;              // "Solarpunk AI Desk Buddy"
  tagline: string;
  description: string;
  hypothesis: string;         // what we think it solves
  target_audience: string;    // text segment, e.g. "Gen Z students with ADHD"
  status: "draft" | "testing" | "validated" | "killed" | "handoff";
  created_by: "agent" | "human";
  created_at: string;
  updated_at: string;
}

export interface AdExperiment {
  id: string;                 // "exp_..."
  product_id: string;
  platform: "meta";
  goal: "leads" | "clicks";
  budget_total_usd: number;
  budget_per_day_usd: number;
  min_leads_for_decision: number;
  target_cpl_threshold_usd: number;    // e.g. 1.0
  status: "pending" | "running" | "paused" | "completed";
  round: number;              // exploration / iteration cycle
  created_at: string;
  updated_at: string;
}

// ===== Ads & Metrics =====

export interface AdVariant {
  id: string;                 // "ad_..."
  experiment_id: string;
  product_id: string;

  platform: "meta";
  meta_campaign_id?: string;
  meta_adset_id?: string;
  meta_ad_id?: string;        // Graph API ID

  headline: string;
  body: string;
  image_url: string;          // from fal.ai
  cta: string;                // "Sign up", etc.

  status: "draft" | "active" | "paused" | "deleted";
  created_by: "agent" | "human";
  created_at: string;
  updated_at: string;
}

export interface AdMetricsSnapshot {
  id: string;                 // "ams_..."
  ad_id: string;              // FK -> AdVariant.id
  pulled_at: string;          // timestamp we pulled metrics

  impressions: number;
  clicks: number;
  leads: number;
  spend_usd: number;

  ctr: number;                // derived: clicks/impressions
  cpl_usd: number;            // derived: spend/leads
  cpc_usd: number;            // derived: spend/clicks
}

// ===== Copy Generation Types =====

export interface CopyVariation {
  headline: string;
  body: string;
  cta: string;
  value_proposition: string;  // The core value prop this variant emphasizes
}

export interface GeneratedAdCreative {
  copy: CopyVariation;
  image_url: string;
  image_width: number;
  image_height: number;
}

// ===== API Request/Response Types =====

export interface GenerateAdVariantsRequest {
  product_concept: ProductConcept;
  experiment_id?: string;
  num_variants?: number;      // Default: 3-6
}

export interface GenerateAdVariantsResponse {
  success: boolean;
  variants: AdVariant[];
  generated_at: string;
  error?: string;
}
