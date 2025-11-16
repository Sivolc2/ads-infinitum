// ABOUTME: Data fetching for Track E landing pages with mock fallbacks
// ABOUTME: Tries real API first, falls back to mock data if unavailable

import { LandingPage, AdExperiment, LandingPageStats, FundingProgress } from '@/types/landing-page';

const TRACK_E_API_BASE = import.meta.env.VITE_TRACK_E_API_URL || 'http://localhost:8787';

// Mock data for fallback
const createMockLandingPage = (productId: string): LandingPage => ({
  id: `lp_mock_${productId}`,
  product_id: productId,
  lovable_url: `https://lovable.dev/products/${productId}`,
  hero_image_url: 'https://via.placeholder.com/1200x600',
  gallery_image_urls: [],
  pitch_markdown: '# Mock Product\n\nThis is mock data. Connect to Track E backend for real data.',
  estimate_cost_to_deliver_usd: 1000,
  call_to_action: 'Join the Waitlist',
  likes_count: 0,
  dislikes_count: 0,
  pledge_count: 0,
  pledge_total_usd: 0,
  funding_goal_usd: 5000,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const createMockAdExperiments = (): AdExperiment[] => [
  {
    image: 'https://via.placeholder.com/600x400',
    feature: 'Mock Feature 1',
    market: 'Mock Market 1',
    headline: 'Mock headline for experiment 1',
    caption: 'This is mock ad experiment data',
    ctr: '2.5%',
    cpl: '$3.00',
  },
  {
    image: 'https://via.placeholder.com/600x400',
    feature: 'Mock Feature 2',
    market: 'Mock Market 2',
    headline: 'Mock headline for experiment 2',
    caption: 'This is mock ad experiment data',
    ctr: '3.0%',
    cpl: '$2.50',
  },
];

const createMockStats = (): LandingPageStats => ({
  likes: 0,
  dislikes: 0,
  net_sentiment: 0,
  sentiment_ratio: 0.5,
  pledge_count: 0,
  pledge_total_usd: 0,
  avg_pledge_usd: 0,
});

const createMockFundingProgress = (): FundingProgress => ({
  current_usd: 0,
  goal_usd: 5000,
  progress_percent: 0,
  pledge_count: 0,
});

/**
 * Fetch landing page data for a product
 * Falls back to mock data if API is unavailable
 */
export async function getLandingPageForProduct(productId: string): Promise<LandingPage> {
  try {
    const response = await fetch(`${TRACK_E_API_BASE}/api/landing/${productId}`);
    if (!response.ok) {
      console.warn(`Track E API returned ${response.status}, using mock data`);
      return createMockLandingPage(productId);
    }
    const data = await response.json();
    return data.data as LandingPage;
  } catch (error) {
    console.warn('Track E API unavailable, using mock data:', error);
    return createMockLandingPage(productId);
  }
}

/**
 * Fetch ad experiments for a product
 * Currently returns mock data (Track D integration pending)
 * TODO: Connect to Track D API for real ad variant data
 */
export async function getAdExperiments(productId: string): Promise<AdExperiment[]> {
  // TODO: Replace with Track D API call
  // const response = await fetch(`${TRACK_D_API}/api/ad-variants/${productId}`);
  console.info('Using mock ad experiments (Track D integration pending)');
  return createMockAdExperiments();
}

/**
 * Fetch landing page stats
 * Falls back to mock data if API is unavailable
 */
export async function getLandingPageStats(landingPageId: string): Promise<LandingPageStats> {
  try {
    const response = await fetch(`${TRACK_E_API_BASE}/api/landing/${landingPageId}/stats`);
    if (!response.ok) {
      console.warn(`Track E API returned ${response.status}, using mock stats`);
      return createMockStats();
    }
    const data = await response.json();
    return data.data as LandingPageStats;
  } catch (error) {
    console.warn('Track E API unavailable, using mock stats:', error);
    return createMockStats();
  }
}

/**
 * Fetch funding progress
 * Falls back to mock data if API is unavailable
 */
export async function getFundingProgress(landingPageId: string): Promise<FundingProgress> {
  try {
    const response = await fetch(`${TRACK_E_API_BASE}/api/landing/${landingPageId}/funding-progress`);
    if (!response.ok) {
      console.warn(`Track E API returned ${response.status}, using mock funding progress`);
      return createMockFundingProgress();
    }
    const data = await response.json();
    return data.data as FundingProgress;
  } catch (error) {
    console.warn('Track E API unavailable, using mock funding progress:', error);
    return createMockFundingProgress();
  }
}

/**
 * Record a like
 */
export async function recordLike(landingPageId: string): Promise<LandingPage | null> {
  try {
    const response = await fetch(`${TRACK_E_API_BASE}/api/landing/${landingPageId}/like`, {
      method: 'POST',
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.data as LandingPage;
  } catch (error) {
    console.error('Failed to record like:', error);
    return null;
  }
}

/**
 * Record a dislike
 */
export async function recordDislike(landingPageId: string): Promise<LandingPage | null> {
  try {
    const response = await fetch(`${TRACK_E_API_BASE}/api/landing/${landingPageId}/dislike`, {
      method: 'POST',
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.data as LandingPage;
  } catch (error) {
    console.error('Failed to record dislike:', error);
    return null;
  }
}

/**
 * Create a pledge
 */
export async function createPledge(
  landingPageId: string,
  pledge: {
    amount_usd: number;
    email?: string;
    name?: string;
    message?: string;
  }
): Promise<{ pledge: any; landing_page: LandingPage } | null> {
  try {
    const response = await fetch(`${TRACK_E_API_BASE}/api/landing/${landingPageId}/pledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pledge),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Failed to create pledge:', error);
    return null;
  }
}
