// workers/ad-quality-aggregator.ts
// AdQualityAggregator: aggregates lead data to generate quality stats per ad

import { UserProfile, AdQualityStats } from '../types/lead-intelligence';

export interface AdLeadData {
  ad_id: string;
  profiles: UserProfile[];
}

export class AdQualityAggregator {
  /**
   * Aggregate quality stats for a single ad based on its lead profiles
   */
  aggregateAdQuality(adData: AdLeadData): AdQualityStats {
    const { ad_id, profiles } = adData;

    if (profiles.length === 0) {
      return this.createEmptyStats(ad_id);
    }

    // Calculate aggregate metrics
    const totalLeads = profiles.length;

    // Interest level scoring
    const interestScores = profiles.map(p => {
      switch (p.interest_level) {
        case "high": return 1;
        case "medium": return 0.5;
        case "low": return 0;
        default: return 0;
      }
    });
    const avgInterestLevel = interestScores.reduce((a, b) => a + b, 0) / totalLeads;
    const highInterestCount = profiles.filter(p => p.interest_level === "high").length;
    const highInterestRate = highInterestCount / totalLeads;

    // Sentiment breakdown
    const sentimentBreakdown = {
      excited: profiles.filter(p => p.sentiment === "excited").length,
      neutral: profiles.filter(p => p.sentiment === "neutral").length,
      skeptical: profiles.filter(p => p.sentiment === "skeptical").length,
      negative: profiles.filter(p => p.sentiment === "negative").length,
    };

    // Budget distribution
    const budgetDistribution = {
      low: profiles.filter(p => p.budget_band === "low").length,
      mid: profiles.filter(p => p.budget_band === "mid").length,
      high: profiles.filter(p => p.budget_band === "high").length,
    };

    // Calculate quality score (0-100)
    const qualityScore = this.calculateQualityScore(
      highInterestRate,
      sentimentBreakdown,
      totalLeads
    );

    // Extract top segments
    const topSegments = this.getTopItems(
      profiles.flatMap(p => p.segments),
      5
    );

    // Extract top problem tags
    const topProblemTags = this.getTopItems(
      profiles.flatMap(p => p.problem_tags),
      5
    );

    // Extract top feature requests
    const topFeatureRequests = this.getTopItems(
      profiles.flatMap(p => p.feature_requests),
      5
    );

    const stats: AdQualityStats = {
      ad_id,
      total_leads: totalLeads,
      avg_interest_level: avgInterestLevel,
      sentiment_breakdown: sentimentBreakdown,
      high_interest_rate: highInterestRate,
      quality_score: qualityScore,
      top_segments: topSegments,
      top_problem_tags: topProblemTags,
      top_feature_requests: topFeatureRequests,
      budget_distribution: budgetDistribution,
      last_updated: new Date().toISOString(),
    };

    return stats;
  }

  /**
   * Calculate composite quality score (0-100)
   */
  private calculateQualityScore(
    highInterestRate: number,
    sentimentBreakdown: { excited: number; neutral: number; skeptical: number; negative: number },
    totalLeads: number
  ): number {
    // Weight factors
    const interestWeight = 0.4;
    const sentimentWeight = 0.4;
    const volumeWeight = 0.2;

    // Interest score (0-1)
    const interestScore = highInterestRate;

    // Sentiment score (0-1)
    // Excited = 1, Neutral = 0.5, Skeptical = 0.25, Negative = 0
    const sentimentScore = (
      sentimentBreakdown.excited * 1 +
      sentimentBreakdown.neutral * 0.5 +
      sentimentBreakdown.skeptical * 0.25 +
      sentimentBreakdown.negative * 0
    ) / totalLeads;

    // Volume score (0-1) - logarithmic scale, maxes out at 100 leads
    const volumeScore = Math.min(Math.log10(totalLeads + 1) / 2, 1);

    // Composite score
    const score = (
      interestScore * interestWeight +
      sentimentScore * sentimentWeight +
      volumeScore * volumeWeight
    ) * 100;

    return Math.round(score * 10) / 10; // Round to 1 decimal
  }

  /**
   * Get top N most common items from an array
   */
  private getTopItems(items: string[], topN: number): string[] {
    // Count occurrences
    const counts = new Map<string, number>();
    items.forEach(item => {
      if (item && item.trim()) {
        const normalized = item.toLowerCase().trim();
        counts.set(normalized, (counts.get(normalized) || 0) + 1);
      }
    });

    // Sort by count and take top N
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([item]) => item);
  }

  /**
   * Create empty stats for an ad with no leads
   */
  private createEmptyStats(ad_id: string): AdQualityStats {
    return {
      ad_id,
      total_leads: 0,
      avg_interest_level: 0,
      sentiment_breakdown: {
        excited: 0,
        neutral: 0,
        skeptical: 0,
        negative: 0,
      },
      high_interest_rate: 0,
      quality_score: 0,
      top_segments: [],
      top_problem_tags: [],
      top_feature_requests: [],
      budget_distribution: {
        low: 0,
        mid: 0,
        high: 0,
      },
      last_updated: new Date().toISOString(),
    };
  }

  /**
   * Batch aggregate quality stats for multiple ads
   */
  aggregateMultipleAds(adsData: AdLeadData[]): Map<string, AdQualityStats> {
    const results = new Map<string, AdQualityStats>();

    for (const adData of adsData) {
      const stats = this.aggregateAdQuality(adData);
      results.set(adData.ad_id, stats);
    }

    return results;
  }
}
