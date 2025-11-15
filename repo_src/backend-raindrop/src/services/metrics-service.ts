import {
  AdMetricsSnapshot,
  CreateAdMetricsSnapshot,
  calculateDerivedMetrics,
  AdMetricsSnapshotSchema,
} from '../models';

/**
 * MetricsCollectorService handles metrics collection and storage
 * Pulls stats from Meta (or mock data) and stores snapshots
 */
export class MetricsCollectorService {
  private bucket: any; // SmartBucket instance
  private METRICS_PREFIX = 'metrics/';

  constructor(bucket: any) {
    this.bucket = bucket;
  }

  /**
   * Record a metrics snapshot for an ad variant
   */
  async recordSnapshot(
    data: CreateAdMetricsSnapshot
  ): Promise<AdMetricsSnapshot> {
    // Calculate derived metrics (CTR, CPL, CPC)
    const snapshot = calculateDerivedMetrics(data);

    // Validate
    const validated = AdMetricsSnapshotSchema.parse(snapshot);

    // Store in bucket with timestamp-based key for time series
    const key = `${this.METRICS_PREFIX}${validated.ad_id}/${validated.id}`;
    await this.bucket.put(key, JSON.stringify(validated), {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: {
        type: 'metrics-snapshot',
        ad_id: validated.ad_id,
        pulled_at: validated.pulled_at,
      },
    });

    return validated;
  }

  /**
   * Get all metrics snapshots for an ad variant
   */
  async getSnapshotsForAd(adId: string): Promise<AdMetricsSnapshot[]> {
    const prefix = `${this.METRICS_PREFIX}${adId}/`;
    const listResult = await this.bucket.list({
      prefix,
      limit: 1000,
    });

    const snapshots: AdMetricsSnapshot[] = [];

    for (const obj of listResult.objects) {
      const object = await this.bucket.get(obj.key);
      if (object) {
        const data = JSON.parse(await object.text());
        const snapshot = AdMetricsSnapshotSchema.parse(data);
        snapshots.push(snapshot);
      }
    }

    // Sort by pulled_at ascending (oldest first)
    return snapshots.sort(
      (a, b) =>
        new Date(a.pulled_at).getTime() - new Date(b.pulled_at).getTime()
    );
  }

  /**
   * Get the latest metrics snapshot for an ad variant
   */
  async getLatestSnapshot(adId: string): Promise<AdMetricsSnapshot | null> {
    const snapshots = await this.getSnapshotsForAd(adId);

    if (snapshots.length === 0) {
      return null;
    }

    // Return the most recent snapshot (last in sorted array)
    return snapshots[snapshots.length - 1];
  }

  /**
   * Mock: Pull metrics from Meta API (stub implementation)
   * In production, this would call the Meta Marketing API
   */
  async pullMetricsFromMeta(adId: string, metaAdId?: string): Promise<AdMetricsSnapshot> {
    // This is a mock implementation
    // In real implementation, you would:
    // 1. Call Meta Marketing API with metaAdId
    // 2. Fetch insights data
    // 3. Transform to our schema
    // 4. Store snapshot

    // For now, generate mock data
    const mockData: CreateAdMetricsSnapshot = {
      ad_id: adId,
      pulled_at: new Date().toISOString(),
      impressions: Math.floor(Math.random() * 10000) + 1000,
      clicks: Math.floor(Math.random() * 500) + 50,
      leads: Math.floor(Math.random() * 50) + 5,
      spend_usd: Math.random() * 100 + 10,
    };

    return this.recordSnapshot(mockData);
  }

  /**
   * Calculate aggregate metrics for multiple ad variants
   */
  async getAggregateMetrics(adIds: string[]): Promise<{
    total_impressions: number;
    total_clicks: number;
    total_leads: number;
    total_spend_usd: number;
    average_ctr: number;
    average_cpl_usd: number | null;
    average_cpc_usd: number | null;
  }> {
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalLeads = 0;
    let totalSpend = 0;

    for (const adId of adIds) {
      const latest = await this.getLatestSnapshot(adId);
      if (latest) {
        totalImpressions += latest.impressions;
        totalClicks += latest.clicks;
        totalLeads += latest.leads;
        totalSpend += latest.spend_usd;
      }
    }

    const averageCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const averageCpl = totalLeads > 0 ? totalSpend / totalLeads : null;
    const averageCpc = totalClicks > 0 ? totalSpend / totalClicks : null;

    return {
      total_impressions: totalImpressions,
      total_clicks: totalClicks,
      total_leads: totalLeads,
      total_spend_usd: totalSpend,
      average_ctr: averageCtr,
      average_cpl_usd: averageCpl,
      average_cpc_usd: averageCpc,
    };
  }

  /**
   * Check if an ad variant meets success criteria
   */
  async meetsSuccessCriteria(
    adId: string,
    targetCplUsd: number,
    minLeads: number
  ): Promise<{
    meets_criteria: boolean;
    current_cpl: number | null;
    current_leads: number;
  }> {
    const latest = await this.getLatestSnapshot(adId);

    if (!latest) {
      return {
        meets_criteria: false,
        current_cpl: null,
        current_leads: 0,
      };
    }

    const meetsCriteria =
      latest.leads >= minLeads &&
      latest.cpl_usd !== undefined &&
      latest.cpl_usd <= targetCplUsd;

    return {
      meets_criteria: meetsCriteria,
      current_cpl: latest.cpl_usd || null,
      current_leads: latest.leads,
    };
  }

  /**
   * Get performance trend for an ad variant
   * Returns the change in key metrics over the last N snapshots
   */
  async getPerformanceTrend(
    adId: string,
    lastNSnapshots: number = 5
  ): Promise<{
    ctr_trend: 'improving' | 'declining' | 'stable';
    cpl_trend: 'improving' | 'declining' | 'stable';
    lead_growth: number;
  }> {
    const snapshots = await this.getSnapshotsForAd(adId);

    if (snapshots.length < 2) {
      return {
        ctr_trend: 'stable',
        cpl_trend: 'stable',
        lead_growth: 0,
      };
    }

    const recentSnapshots = snapshots.slice(-lastNSnapshots);
    const firstSnapshot = recentSnapshots[0];
    const lastSnapshot = recentSnapshots[recentSnapshots.length - 1];

    // CTR trend
    const ctrChange = lastSnapshot.ctr - firstSnapshot.ctr;
    const ctrTrend =
      Math.abs(ctrChange) < 0.001
        ? 'stable'
        : ctrChange > 0
        ? 'improving'
        : 'declining';

    // CPL trend (lower is better)
    let cplTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (
      lastSnapshot.cpl_usd !== undefined &&
      firstSnapshot.cpl_usd !== undefined
    ) {
      const cplChange = lastSnapshot.cpl_usd - firstSnapshot.cpl_usd;
      cplTrend =
        Math.abs(cplChange) < 0.01
          ? 'stable'
          : cplChange < 0
          ? 'improving'
          : 'declining';
    }

    // Lead growth
    const leadGrowth = lastSnapshot.leads - firstSnapshot.leads;

    return {
      ctr_trend: ctrTrend,
      cpl_trend: cplTrend,
      lead_growth: leadGrowth,
    };
  }
}
