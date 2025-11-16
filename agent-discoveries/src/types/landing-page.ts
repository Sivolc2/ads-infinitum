// ABOUTME: Type definitions for Track E landing page data
// ABOUTME: Matches the backend-raindrop Track E schema

export interface LandingPage {
  id: string;
  product_id: string;
  lovable_url: string;
  hero_image_url: string;
  gallery_image_urls: string[];
  pitch_markdown: string;
  estimate_cost_to_deliver_usd?: number;
  call_to_action: string;
  likes_count: number;
  dislikes_count: number;
  pledge_count: number;
  pledge_total_usd: number;
  funding_goal_usd?: number;
  created_at: string;
  updated_at: string;
}

export interface Pledge {
  id: string;
  landing_page_id: string;
  amount_usd: number;
  email?: string;
  name?: string;
  message?: string;
  created_at: string;
}

export interface AdExperiment {
  image: string;
  feature: string;
  market: string;
  headline: string;
  caption: string;
  ctr: string;
  cpl: string;
}

export interface LandingPageStats {
  likes: number;
  dislikes: number;
  net_sentiment: number;
  sentiment_ratio: number;
  pledge_count: number;
  pledge_total_usd: number;
  avg_pledge_usd: number;
}

export interface FundingProgress {
  current_usd: number;
  goal_usd: number | null;
  progress_percent: number;
  pledge_count: number;
}
