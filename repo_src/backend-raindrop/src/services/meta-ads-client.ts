/**
 * Meta Ads Integration Service via Pipeboard MCP
 *
 * Provides a TypeScript interface to Meta Marketing API through Pipeboard's MCP service.
 * Supports creating campaigns, ad sets, creatives, ads, and retrieving metrics.
 * Includes mock mode for development and rate limit handling.
 */

import type { AdVariant } from '../models/ad-variant';
import type { CreateAdMetricsSnapshot } from '../models/metrics';
import type { TargetingSpec } from './meta-types';

// ============================================================================
// Configuration & Types
// ============================================================================

export interface MetaAdsClientConfig {
  apiToken: string;
  adAccountId: string;
  pageId: string;
  mockMode?: boolean;
  endpoint?: string;
}

export interface CreateAdResult {
  campaignId: string;
  adsetId: string;
  creativeId: string;
  adId: string;
  imageHash?: string;
}

export interface AdMetrics {
  ad_id: string;
  ad_name: string;
  impressions: number;
  clicks: number;
  leads: number;
  spend_usd: number;
  ctr: number;
  cpl_usd?: number;
  cpc_usd?: number;
}

interface MCPResponse<T = any> {
  jsonrpc: string;
  id: number;
  result?: {
    isError?: boolean;
    content?: Array<{ text: string }>;
    structuredContent?: {
      result: string;
    };
  };
  error?: {
    code: number;
    message: string;
  };
}

// ============================================================================
// Meta Ads Client
// ============================================================================

export class MetaAdsClient {
  private config: Required<MetaAdsClientConfig>;
  private requestId: number = 0;

  constructor(config: MetaAdsClientConfig) {
    this.config = {
      ...config,
      mockMode: config.mockMode ?? false,
      endpoint: config.endpoint ?? 'https://mcp.pipeboard.co/meta-ads-mcp',
    };
  }

  // --------------------------------------------------------------------------
  // Core API Methods
  // --------------------------------------------------------------------------

  /**
   * Create a complete ad from an AdVariant
   * Handles: image upload → campaign → ad set → creative → ad
   */
  async createAd(variant: AdVariant, options?: {
    dailyBudget?: number; // in cents, default 1500 ($15)
    targeting?: TargetingSpec;
    ctaUrl?: string;
  }): Promise<CreateAdResult> {
    if (this.config.mockMode) {
      return this.mockCreateAd(variant);
    }

    const dailyBudget = options?.dailyBudget ?? 1500;
    const ctaUrl = options?.ctaUrl ?? 'https://example.com';
    const targeting = options?.targeting ?? this.getDefaultTargeting();

    try {
      // Step 1: Upload image
      console.log(`[Meta] Uploading image for ad ${variant.id}...`);
      const imageHash = await this.uploadAdImage(variant.image_url, `${variant.id}.png`);

      // Step 2: Create or reuse campaign
      console.log(`[Meta] Creating campaign for product ${variant.product_id}...`);
      const campaignId = await this.createCampaign(
        `Campaign: ${variant.product_id}`,
        'OUTCOME_LEADS',
        'PAUSED', // Always start paused for safety
        dailyBudget
      );

      // Step 3: Create ad set
      console.log(`[Meta] Creating ad set for experiment ${variant.experiment_id}...`);
      const adsetId = await this.createAdset(
        campaignId,
        `AdSet: ${variant.experiment_id}`,
        dailyBudget,
        targeting,
        undefined,
        undefined,
        'PAUSED'
      );

      // Step 4: Create creative
      console.log(`[Meta] Creating creative for ad ${variant.id}...`);
      const creativeId = await this.createAdCreative(
        `Creative: ${variant.id}`,
        this.config.pageId,
        imageHash,
        variant.body,
        variant.headline,
        ctaUrl,
        this.mapCtaType(variant.cta),
        'PAUSED'
      );

      // Step 5: Create ad
      console.log(`[Meta] Creating ad ${variant.id}...`);
      const adId = await this.createAdFromCreative(
        adsetId,
        creativeId,
        variant.headline,
        'PAUSED'
      );

      console.log(`[Meta] ✅ Successfully created ad ${variant.id}`);

      return {
        campaignId,
        adsetId,
        creativeId,
        adId,
        imageHash,
      };
    } catch (error) {
      console.error(`[Meta] ❌ Error creating ad ${variant.id}:`, error);
      throw new Error(`Failed to create ad: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get metrics for one or more ads
   */
  async getMetrics(adIds: string[], timeRange?: {
    since: string; // YYYY-MM-DD
    until: string; // YYYY-MM-DD
  }): Promise<AdMetrics[]> {
    if (this.config.mockMode) {
      return this.mockGetMetrics(adIds);
    }

    try {
      const range = timeRange ?? this.getDefaultTimeRange();

      console.log(`[Meta] Fetching metrics for ${adIds.length} ad(s)...`);

      const insights = await this.getInsights(
        'ad',
        range,
        adIds.length > 0 ? [{ field: 'ad.id', operator: 'IN', value: adIds }] : undefined,
        ['ad_id', 'ad_name', 'impressions', 'clicks', 'actions', 'spend', 'ctr', 'cpc', 'cpm']
      );

      const metrics: AdMetrics[] = insights.map((record: any) => {
        const impressions = parseInt(record.impressions ?? '0');
        const clicks = parseInt(record.clicks ?? '0');
        const spend_usd = parseFloat(record.spend ?? '0');
        const leads = this.parseLeadActions(record.actions ?? []);
        const ctr = parseFloat(record.ctr ?? '0');
        const cpc_usd = clicks > 0 ? spend_usd / clicks : undefined;
        const cpl_usd = leads > 0 ? spend_usd / leads : undefined;

        return {
          ad_id: record.ad_id,
          ad_name: record.ad_name ?? 'Unknown',
          impressions,
          clicks,
          leads,
          spend_usd,
          ctr,
          cpc_usd,
          cpl_usd,
        };
      });

      console.log(`[Meta] ✅ Retrieved metrics for ${metrics.length} ad(s)`);

      return metrics;
    } catch (error) {
      console.error(`[Meta] ❌ Error fetching metrics:`, error);
      throw new Error(`Failed to fetch metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // --------------------------------------------------------------------------
  // Low-level Meta API wrappers
  // --------------------------------------------------------------------------

  private async uploadAdImage(imageUrl: string, filename: string): Promise<string> {
    // If imageUrl is a data URL, extract and upload the base64 data directly
    if (imageUrl.startsWith('data:')) {
      const base64Match = imageUrl.match(/^data:image\/\w+;base64,(.+)$/);
      if (base64Match) {
        console.log('[Meta] Detected data URL, uploading base64 directly...');
        return this.uploadAdImageFromBase64(base64Match[1], filename);
      }
    }

    const result = await this.callMCPTool('upload_ad_image', {
      account_id: this.config.adAccountId,
      image_url: imageUrl,
      filename,
    });

    // Extract hash from response
    let hash: string | undefined;
    if (result.images?.bytes?.hash) {
      hash = result.images.bytes.hash;
    } else if (result.hash) {
      hash = result.hash;
    } else if (result.image_hash) {
      hash = result.image_hash;
    }

    if (!hash) {
      console.error('[Meta] ❌ Failed to extract image hash from response:', JSON.stringify(result));
      throw new Error('Image upload succeeded but no hash returned');
    }

    console.log(`[Meta] ✅ Image uploaded successfully (hash: ${hash.substring(0, 16)}...)`);
    return hash;
  }

  private async uploadAdImageFromBase64(base64Data: string, filename: string): Promise<string> {
    // Upload using file parameter with base64 data
    const result = await this.callMCPTool('upload_ad_image', {
      account_id: this.config.adAccountId,
      file: base64Data,
      filename,
    });

    // Extract hash from response
    let hash: string | undefined;
    if (result.images?.bytes?.hash) {
      hash = result.images.bytes.hash;
    } else if (result.hash) {
      hash = result.hash;
    } else if (result.image_hash) {
      hash = result.image_hash;
    }

    if (!hash) {
      console.error('[Meta] ❌ Failed to extract image hash from base64 upload:', JSON.stringify(result));
      throw new Error('Base64 image upload succeeded but no hash returned');
    }

    console.log(`[Meta] ✅ Image uploaded from base64 successfully (hash: ${hash.substring(0, 16)}...)`);
    return hash;
  }

  private async createCampaign(
    name: string,
    objective: string = 'OUTCOME_LEADS',
    status: 'PAUSED' | 'ACTIVE' = 'PAUSED',
    dailyBudget?: number,
  ): Promise<string> {
    const result = await this.callMCPTool('create_campaign', {
      account_id: this.config.adAccountId,
      name,
      objective,
      status,
      special_ad_categories: ['NONE'],
      buying_type: 'AUCTION',
      ...(dailyBudget ? { daily_budget: dailyBudget } : {}),
    });

    const campaignId = result.id ?? result.campaign_id;
    if (!campaignId) {
      console.error('[Meta] ❌ Failed to extract campaign ID from response:', JSON.stringify(result));
      throw new Error('Campaign creation succeeded but no ID returned');
    }
    console.log(`[Meta] ✅ Campaign created (ID: ${campaignId})`);
    return campaignId;
  }

  private async createAdset(
    campaignId: string,
    name: string,
    dailyBudget: number,
    targeting: TargetingSpec,
    startTime?: string,
    endTime?: string,
    status: 'PAUSED' | 'ACTIVE' = 'PAUSED'
  ): Promise<string> {
    const start = startTime ?? this.getTomorrowISO();
    const end = endTime ?? this.getDaysFromNowISO(4);

    const adsetPayload = {
      account_id: this.config.adAccountId,
      campaign_id: campaignId,
      name,
      status,
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'LEAD_GENERATION',
      bid_strategy: 'LOWEST_COST_WITH_BID_CAP',
      bid_amount: this.calculateDefaultBidAmount(dailyBudget),
      start_time: start,
      end_time: end,
      targeting,
      promoted_object: {
        page_id: this.config.pageId,
      },
    };

    console.log('[Meta] create_adset payload:', {
      ...adsetPayload,
      account_id: '[redacted]',
    });

    const result = await this.callMCPTool('create_adset', adsetPayload);
    const adsetId = this.extractAdsetId(result);
    if (!adsetId) {
      console.error('[Meta] ❌ Failed to extract adset ID from response:', JSON.stringify(result));
      throw new Error('Adset creation succeeded but no ID returned');
    }
    console.log(`[Meta] ✅ Adset created (ID: ${adsetId})`);
    return adsetId;
  }

  private async createAdCreative(
    name: string,
    pageId: string,
    imageHash: string,
    message: string,
    headline: string,
    link: string,
    callToActionType: string = 'SIGN_UP',
    status: 'PAUSED' | 'ACTIVE' = 'PAUSED'
  ): Promise<string> {
    const result = await this.callMCPTool('create_ad_creative', {
      account_id: this.config.adAccountId,
      name,
      image_hash: imageHash,  // Top-level for MCP validation
      object_story_spec: {
        page_id: pageId,
        link_data: {
          message,
          name: headline,
          link,
          image_hash: imageHash,  // Nested for Meta API
          call_to_action: {
            type: callToActionType,
            value: { link },
          },
        },
      },
      status,
    });

    const creativeId = result.id ?? result.creative_id;
    if (!creativeId) {
      console.error('[Meta] ❌ Failed to extract creative ID from response:', JSON.stringify(result));
      throw new Error('Creative creation succeeded but no ID returned');
    }
    console.log(`[Meta] ✅ Creative created (ID: ${creativeId})`);
    return creativeId;
  }

  private async createAdFromCreative(
    adsetId: string,
    creativeId: string,
    name: string,
    status: 'PAUSED' | 'ACTIVE' = 'PAUSED'
  ): Promise<string> {
    console.log(`[Meta] 🔧 Creating ad with adset_id=${adsetId}, creative_id=${creativeId}`);
    const result = await this.callMCPTool('create_ad', {
      account_id: this.config.adAccountId,
      adset_id: adsetId,
      creative_id: creativeId,
      name,
      status,
    });

    const adId = result.id ?? result.ad_id;
    if (!adId) {
      console.error('[Meta] ❌ Failed to extract ad ID from response:', JSON.stringify(result));
      throw new Error('Ad creation succeeded but no ID returned');
    }
    console.log(`[Meta] ✅ Ad created (ID: ${adId})`);
    return adId;
  }

  private async getInsights(
    level: 'ad' | 'adset' | 'campaign',
    timeRange: { since: string; until: string },
    filtering?: Array<{ field: string; operator: string; value: any }>,
    fields?: string[]
  ): Promise<any[]> {
    const defaultFields = [
      'ad_id', 'ad_name', 'adset_id', 'adset_name',
      'campaign_id', 'campaign_name',
      'impressions', 'clicks', 'actions', 'spend',
      'ctr', 'cpm', 'cpc',
    ];

    const args: any = {
      object_id: this.config.adAccountId,
      level,
      time_range: timeRange,
      limit: 100,
    };

    if (filtering) {
      args.filtering = filtering;
    }

    const result = await this.callMCPTool('get_insights', args);

    // Parse nested response
    if (result.data && Array.isArray(result.data)) {
      return result.data;
    }
    if (Array.isArray(result)) {
      return result;
    }
    return [result];
  }

  // --------------------------------------------------------------------------
  // MCP Communication
  // --------------------------------------------------------------------------

  private async callMCPTool(toolName: string, args: any): Promise<any> {
    this.requestId += 1;

    const payload = {
      jsonrpc: '2.0',
      id: this.requestId,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    };

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: MCPResponse = await response.json();

    // Handle JSON-RPC error
    if (data.error) {
      throw new Error(`MCP Error ${data.error.code}: ${data.error.message}`);
    }

    // Handle MCP tool error
    if (data.result?.isError) {
      const errorText = data.result.content?.[0]?.text ?? 'Unknown error';
      throw new Error(`MCP Tool Error: ${errorText}`);
    }

    // Parse result
    const structured = data.result?.structuredContent;
    if (structured?.result) {
      try {
        return JSON.parse(structured.result);
      } catch {
        return structured.result;
      }
    }

    return data.result;
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  private parseLeadActions(actions: any[]): number {
    if (!actions || actions.length === 0) {
      return 0;
    }

    const actionMap: Record<string, number> = {};
    for (const action of actions) {
      if (action.action_type && action.value) {
        actionMap[action.action_type] = parseInt(action.value);
      }
    }

    return (actionMap['leadgen.other'] ?? 0) + (actionMap['onsite_conversion.lead_grouped'] ?? 0);
  }

  private getDefaultTargeting(): TargetingSpec {
    return {
      age_min: 25,
      age_max: 55,
      genders: [1, 2], // All genders
      geo_locations: { countries: ['US', 'CA'] },
      publisher_platforms: ['facebook', 'instagram'],
      facebook_positions: ['feed', 'marketplace'],
      instagram_positions: ['stream', 'story', 'reels'],  // 'stream' not 'feed' for Instagram
    };
  }

  private getDefaultTimeRange(): { since: string; until: string } {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    return {
      since: weekAgo.toISOString().split('T')[0],
      until: today.toISOString().split('T')[0],
    };
  }

  private getTomorrowISO(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow.toISOString().replace('Z', '-08:00');
  }

  private getDaysFromNowISO(days: number): string {
    const future = new Date();
    future.setDate(future.getDate() + days);
    future.setHours(9, 0, 0, 0);
    return future.toISOString().replace('Z', '-08:00');
  }

  private mapCtaType(cta: string): string {
    const mapping: Record<string, string> = {
      'Sign up': 'SIGN_UP',
      'Sign Up': 'SIGN_UP',
      'Learn more': 'LEARN_MORE',
      'Learn More': 'LEARN_MORE',
      'Get quote': 'GET_QUOTE',
      'Get Quote': 'GET_QUOTE',
      'Shop now': 'SHOP_NOW',
      'Shop Now': 'SHOP_NOW',
      'Book now': 'BOOK_NOW',
      'Book Now': 'BOOK_NOW',
      'Apply now': 'APPLY_NOW',
      'Apply Now': 'APPLY_NOW',
    };

    return mapping[cta] ?? 'LEARN_MORE';
  }

  private extractAdsetId(result: any): string | undefined {
    if (!result || typeof result !== 'object') {
      return undefined;
    }
    if (typeof result.id === 'string') {
      return result.id;
    }
    if (typeof result.adset_id === 'string') {
      return result.adset_id;
    }
    if (typeof result.data === 'string') {
      try {
        const parsed = JSON.parse(result.data);
        if (parsed?.id) {
          return parsed.id;
        }
        if (parsed?.adset_id) {
          return parsed.adset_id;
        }
      } catch {
        // ignore parse errors
      }
    }
    return undefined;
  }

  private calculateDefaultBidAmount(dailyBudget: number): number {
    const minimumBid = 100; // $1.00 in cents
    const tenPercent = Math.floor(dailyBudget * 0.1);
    return Math.max(tenPercent, minimumBid);
  }

  // --------------------------------------------------------------------------
  // Mock Mode (for development/testing)
  // --------------------------------------------------------------------------

  private mockCreateAd(variant: AdVariant): CreateAdResult {
    console.log(`[Meta Mock] Creating ad for variant ${variant.id}`);
    return {
      campaignId: `mock_campaign_${variant.product_id}`,
      adsetId: `mock_adset_${variant.experiment_id}`,
      creativeId: `mock_creative_${variant.id}`,
      adId: `mock_ad_${variant.id}`,
      imageHash: 'mock_hash_' + Math.random().toString(36).substring(7),
    };
  }

  private mockGetMetrics(adIds: string[]): AdMetrics[] {
    console.log(`[Meta Mock] Fetching metrics for ${adIds.length} ad(s)`);
    return adIds.map(adId => ({
      ad_id: adId,
      ad_name: `Mock Ad ${adId}`,
      impressions: Math.floor(Math.random() * 10000) + 1000,
      clicks: Math.floor(Math.random() * 500) + 50,
      leads: Math.floor(Math.random() * 50) + 5,
      spend_usd: Math.random() * 100 + 20,
      ctr: Math.random() * 0.05 + 0.01,
      cpc_usd: Math.random() * 2 + 0.5,
      cpl_usd: Math.random() * 5 + 1,
    }));
  }
}

// ============================================================================
// Factory & Exports
// ============================================================================

/**
 * Create a Meta Ads client from environment variables
 */
export function createMetaAdsClient(options?: {
  mockMode?: boolean;
}): MetaAdsClient {
  const apiToken = process.env.PIPEBOARD_API_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;
  const pageId = process.env.META_PAGE_ID;

  if (!apiToken || !adAccountId || !pageId) {
    throw new Error(
      'Missing required environment variables: PIPEBOARD_API_TOKEN, META_AD_ACCOUNT_ID, META_PAGE_ID'
    );
  }

  return new MetaAdsClient({
    apiToken,
    adAccountId,
    pageId,
    mockMode: options?.mockMode ?? false,
  });
}

/**
 * Convert MetaAdsClient metrics to AdMetricsSnapshot
 */
export function metricsToSnapshot(
  adId: string,
  metrics: AdMetrics
): CreateAdMetricsSnapshot {
  return {
    ad_id: adId,
    pulled_at: new Date().toISOString(),
    impressions: metrics.impressions,
    clicks: metrics.clicks,
    leads: metrics.leads,
    spend_usd: metrics.spend_usd,
  };
}
