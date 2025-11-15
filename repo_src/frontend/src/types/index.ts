// Data contracts based on v1-design.md

export type ProductStatus = 'draft' | 'testing' | 'validated' | 'killed' | 'handoff';
export type CreatedBy = 'agent' | 'human';
export type ExperimentStatus = 'pending' | 'running' | 'paused' | 'completed';
export type AdStatus = 'draft' | 'active' | 'paused' | 'deleted';
export type LeadSource = 'meta_lead_form' | 'landing_form';
export type InterestLevel = 'high' | 'medium' | 'low';
export type BudgetBand = 'low' | 'mid' | 'high' | null;
export type Sentiment = 'excited' | 'neutral' | 'skeptical' | 'negative' | null;
export type BuildStatus = 'draft' | 'posted' | 'in_progress' | 'completed' | 'cancelled';
export type BuildPlatform = 'freelancer' | 'upwork';

// Product & Experiment
export interface ProductConcept {
  id: string;
  title: string;
  tagline: string;
  description: string;
  hypothesis: string;
  target_audience: string;
  status: ProductStatus;
  created_by: CreatedBy;
  created_at: string;
  updated_at: string;
}

export interface AdExperiment {
  id: string;
  product_id: string;
  platform: 'meta';
  goal: 'leads' | 'clicks';
  budget_total_usd: number;
  budget_per_day_usd: number;
  min_leads_for_decision: number;
  target_cpl_threshold_usd: number;
  status: ExperimentStatus;
  round: number;
  created_at: string;
  updated_at: string;
}

// Ads & Metrics
export interface AdVariant {
  id: string;
  experiment_id: string;
  product_id: string;
  platform: 'meta';
  meta_campaign_id: string;
  meta_adset_id: string;
  meta_ad_id: string;
  headline: string;
  body: string;
  image_url: string;
  cta: string;
  status: AdStatus;
  created_by: CreatedBy;
  created_at: string;
  updated_at: string;
}

export interface AdMetricsSnapshot {
  id: string;
  ad_id: string;
  pulled_at: string;
  impressions: number;
  clicks: number;
  leads: number;
  spend_usd: number;
  ctr: number;
  cpl_usd: number;
  cpc_usd: number;
}

// Landing Page & Public Presence
export interface LandingPage {
  id: string;
  product_id: string;
  lovable_url: string;
  hero_image_url: string;
  gallery_image_urls: string[];
  pitch_markdown: string;
  estimate_cost_to_deliver_usd: number | null;
  call_to_action: string;
  likes_count: number;
  dislikes_count: number;
  created_at: string;
  updated_at: string;
}

// Leads, Profiles & Feedback
export interface Lead {
  id: string;
  product_id: string;
  ad_id: string | null;
  landing_page_id: string | null;
  source: LeadSource;
  email: string | null;
  name: string | null;
  raw_form_data: any;
  created_at: string;
}

export interface UserProfile {
  id: string;
  lead_id: string;
  segments: string[];
  interest_level: InterestLevel;
  budget_band: BudgetBand;
  problem_tags: string[];
  feature_requests: string[];
  sentiment: Sentiment;
  created_at: string;
  updated_at: string;
}

// Build Handoff
export interface BuildContract {
  id: string;
  product_id: string;
  platform: BuildPlatform;
  external_job_id: string | null;
  status: BuildStatus;
  spec_markdown: string;
  budget_usd: number;
  notes_for_builder: string;
  created_at: string;
  updated_at: string;
}

// Aggregate data for dashboard views
export interface ProductWithMetrics extends ProductConcept {
  total_experiments: number;
  total_leads: number;
  avg_cpl_usd: number;
  total_spend_usd: number;
  landing_page?: LandingPage;
}

export interface ExperimentWithMetrics extends AdExperiment {
  product: ProductConcept;
  total_variants: number;
  total_leads: number;
  avg_cpl_usd: number;
  total_spend_usd: number;
  best_variant?: AdVariant;
}

export interface AdVariantWithMetrics extends AdVariant {
  latest_metrics?: AdMetricsSnapshot;
  total_impressions: number;
  total_clicks: number;
  total_leads: number;
  total_spend_usd: number;
  avg_ctr: number;
  avg_cpl_usd: number;
}
