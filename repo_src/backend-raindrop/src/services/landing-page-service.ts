// services/landing-page-service.ts
// Landing Page Service for Track E

import {
  LandingPage,
  CreateLandingPage,
  Pledge,
  CreatePledge,
  generateLandingPageId,
  generatePledgeId,
} from '../models/landing-page';
import { ProductConcept } from '../models/product';
import { generateMockLovableUrl } from '../utils/lovable-generator';

/**
 * LandingPageService manages landing pages and their interactions
 *
 * In production, this would use Raindrop SmartBuckets or a database
 * For the hackathon, we use in-memory storage
 */
export class LandingPageService {
  private landingPages: Map<string, LandingPage>;
  private pledges: Map<string, Pledge>;
  private productToLandingPage: Map<string, string>; // product_id -> landing_page_id

  constructor() {
    this.landingPages = new Map();
    this.pledges = new Map();
    this.productToLandingPage = new Map();
  }

  /**
   * Create or get landing page for a product
   */
  async getOrCreateForProduct(
    productId: string,
    product: ProductConcept,
    heroImageUrl?: string
  ): Promise<LandingPage> {
    // Check if landing page already exists for this product
    const existingId = this.productToLandingPage.get(productId);
    if (existingId) {
      const existing = this.landingPages.get(existingId);
      if (existing) return existing;
    }

    // Create new landing page
    const now = new Date().toISOString();
    const id = generateLandingPageId();

    // Generate Lovable URL (mock for now)
    const lovableUrl = generateMockLovableUrl(productId);

    // Create pitch markdown from product
    const pitchMarkdown = `
# ${product.title}

${product.tagline || product.hypothesis}

## About This Product

${product.description}

## Target Audience

${product.target_audience}

## Join the Waitlist

Be among the first to experience ${product.title}. Sign up for early access!
    `.trim();

    const landingPage: LandingPage = {
      id,
      product_id: productId,
      lovable_url: lovableUrl,
      hero_image_url: heroImageUrl || 'https://via.placeholder.com/1200x600',
      gallery_image_urls: [],
      pitch_markdown: pitchMarkdown,
      estimate_cost_to_deliver_usd: undefined,
      call_to_action: 'Join the Waitlist',
      likes_count: 0,
      dislikes_count: 0,
      pledge_count: 0,
      pledge_total_usd: 0,
      funding_goal_usd: undefined,
      created_at: now,
      updated_at: now,
    };

    this.landingPages.set(id, landingPage);
    this.productToLandingPage.set(productId, id);

    return landingPage;
  }

  /**
   * Get landing page by ID
   */
  async get(id: string): Promise<LandingPage | null> {
    return this.landingPages.get(id) || null;
  }

  /**
   * Get landing page by product ID
   */
  async getByProductId(productId: string): Promise<LandingPage | null> {
    const landingPageId = this.productToLandingPage.get(productId);
    if (!landingPageId) return null;
    return this.get(landingPageId);
  }

  /**
   * List all landing pages
   */
  async list(): Promise<LandingPage[]> {
    return Array.from(this.landingPages.values());
  }

  /**
   * Update landing page
   */
  async update(id: string, updates: Partial<LandingPage>): Promise<LandingPage | null> {
    const existing = this.landingPages.get(id);
    if (!existing) return null;

    const updated: LandingPage = {
      ...existing,
      ...updates,
      id,  // Can't change ID
      updated_at: new Date().toISOString(),
    };

    this.landingPages.set(id, updated);
    return updated;
  }

  /**
   * Increment likes
   */
  async like(id: string): Promise<LandingPage | null> {
    const page = this.landingPages.get(id);
    if (!page) return null;

    page.likes_count += 1;
    page.updated_at = new Date().toISOString();

    this.landingPages.set(id, page);
    return page;
  }

  /**
   * Increment dislikes
   */
  async dislike(id: string): Promise<LandingPage | null> {
    const page = this.landingPages.get(id);
    if (!page) return null;

    page.dislikes_count += 1;
    page.updated_at = new Date().toISOString();

    this.landingPages.set(id, page);
    return page;
  }

  /**
   * Create a pledge
   */
  async createPledge(landingPageId: string, pledgeData: CreatePledge): Promise<Pledge | null> {
    const page = this.landingPages.get(landingPageId);
    if (!page) return null;

    const now = new Date().toISOString();
    const pledge: Pledge = {
      id: generatePledgeId(),
      landing_page_id: landingPageId,
      amount_usd: pledgeData.amount_usd,
      email: pledgeData.email,
      name: pledgeData.name,
      message: pledgeData.message,
      created_at: now,
    };

    // Store pledge
    this.pledges.set(pledge.id, pledge);

    // Update landing page totals
    page.pledge_count += 1;
    page.pledge_total_usd += pledgeData.amount_usd;
    page.updated_at = now;

    this.landingPages.set(landingPageId, page);

    return pledge;
  }

  /**
   * Get pledges for a landing page
   */
  async getPledges(landingPageId: string): Promise<Pledge[]> {
    return Array.from(this.pledges.values())
      .filter(p => p.landing_page_id === landingPageId);
  }

  /**
   * Get funding progress for a landing page
   */
  async getFundingProgress(landingPageId: string): Promise<{
    current_usd: number;
    goal_usd: number | null;
    progress_percent: number;
    pledge_count: number;
  }> {
    const page = this.landingPages.get(landingPageId);
    if (!page) {
      return {
        current_usd: 0,
        goal_usd: null,
        progress_percent: 0,
        pledge_count: 0,
      };
    }

    const progressPercent = page.funding_goal_usd
      ? Math.min((page.pledge_total_usd / page.funding_goal_usd) * 100, 100)
      : 0;

    return {
      current_usd: page.pledge_total_usd,
      goal_usd: page.funding_goal_usd || null,
      progress_percent: Math.round(progressPercent * 10) / 10,
      pledge_count: page.pledge_count,
    };
  }

  /**
   * Get stats for a landing page
   */
  async getStats(landingPageId: string): Promise<{
    likes: number;
    dislikes: number;
    net_sentiment: number;
    sentiment_ratio: number;
    pledge_count: number;
    pledge_total_usd: number;
    avg_pledge_usd: number;
  } | null> {
    const page = this.landingPages.get(landingPageId);
    if (!page) return null;

    const totalVotes = page.likes_count + page.dislikes_count;
    const netSentiment = page.likes_count - page.dislikes_count;
    const sentimentRatio = totalVotes > 0
      ? page.likes_count / totalVotes
      : 0.5;

    const avgPledge = page.pledge_count > 0
      ? page.pledge_total_usd / page.pledge_count
      : 0;

    return {
      likes: page.likes_count,
      dislikes: page.dislikes_count,
      net_sentiment: netSentiment,
      sentiment_ratio: Math.round(sentimentRatio * 100) / 100,
      pledge_count: page.pledge_count,
      pledge_total_usd: page.pledge_total_usd,
      avg_pledge_usd: Math.round(avgPledge * 100) / 100,
    };
  }

  /**
   * Delete landing page
   */
  async delete(id: string): Promise<boolean> {
    const page = this.landingPages.get(id);
    if (!page) return false;

    // Remove from product mapping
    this.productToLandingPage.delete(page.product_id);

    // Remove all pledges
    const pledges = await this.getPledges(id);
    pledges.forEach(p => this.pledges.delete(p.id));

    // Remove landing page
    this.landingPages.delete(id);

    return true;
  }
}
