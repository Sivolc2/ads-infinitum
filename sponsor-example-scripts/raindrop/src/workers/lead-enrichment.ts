// workers/lead-enrichment.ts
// LeadEnrichmentWorker: transforms raw leads into enriched UserProfiles using Fastino

import { FastinoClient } from '../lib/fastino-client';
import { Lead, UserProfile } from '../types/lead-intelligence';

/**
 * Schema for extracting lead data with Fastino
 */
interface LeadEnrichmentResult {
  user_data: Array<{
    segments: string;
    interest_level: string;
    budget_band: string;
    problem_tags: string;
    feature_requests: string;
    sentiment: string;
  }>;
}

export class LeadEnrichmentWorker {
  private fastinoClient: FastinoClient;

  constructor(fastinoClient: FastinoClient) {
    this.fastinoClient = fastinoClient;
  }

  /**
   * Enrich a lead by extracting structured data from raw form data
   */
  async enrichLead(lead: Lead): Promise<UserProfile> {
    const startTime = Date.now();

    // Build text to analyze from the raw form data
    const textToAnalyze = this.buildAnalysisText(lead);

    // Use Fastino to extract structured data
    const enrichmentResult = await this.extractLeadData(textToAnalyze);

    // Transform Fastino result into UserProfile
    const profile = this.buildUserProfile(lead, enrichmentResult);

    const enrichmentTime = Date.now() - startTime;
    console.log(`Lead ${lead.id} enriched in ${enrichmentTime}ms`);

    return profile;
  }

  /**
   * Build text for analysis from lead's raw form data
   */
  private buildAnalysisText(lead: Lead): string {
    const parts: string[] = [];

    // Add basic info
    if (lead.name) {
      parts.push(`Name: ${lead.name}`);
    }
    if (lead.email) {
      parts.push(`Email: ${lead.email}`);
    }

    // Add all raw form data fields
    if (lead.raw_form_data) {
      Object.entries(lead.raw_form_data).forEach(([key, value]) => {
        if (value && typeof value === 'string') {
          parts.push(`${key}: ${value}`);
        }
      });
    }

    return parts.join('\n');
  }

  /**
   * Extract structured lead data using Fastino
   */
  private async extractLeadData(text: string): Promise<LeadEnrichmentResult> {
    const schema = {
      user_data: [
        "segments::str::User segments or roles (e.g., creator, student, freelancer, entrepreneur, marketer)",
        "interest_level::str::User interest level (high, medium, low)",
        "budget_band::str::Budget range (low, mid, high)",
        "problem_tags::str::Problems or pain points mentioned (comma-separated)",
        "feature_requests::str::Features or improvements requested (comma-separated)",
        "sentiment::str::User sentiment (excited, neutral, skeptical, negative)"
      ]
    };

    const result = await this.fastinoClient.extractJson<LeadEnrichmentResult>(
      text,
      schema,
      0.3 // Lower threshold for better recall
    );

    return result;
  }

  /**
   * Build UserProfile from lead and enrichment result
   */
  private buildUserProfile(
    lead: Lead,
    enrichmentResult: LeadEnrichmentResult
  ): UserProfile {
    const now = new Date().toISOString();
    const userData = enrichmentResult.user_data[0] || {};

    // Parse comma-separated values into arrays
    const parseCommaSeparated = (value: string | undefined): string[] => {
      if (!value) return [];
      return value
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    };

    // Parse interest level
    const parseInterestLevel = (value: string | undefined): "high" | "medium" | "low" => {
      const normalized = (value || "").toLowerCase();
      if (normalized.includes("high")) return "high";
      if (normalized.includes("medium") || normalized.includes("moderate")) return "medium";
      return "low";
    };

    // Parse budget band
    const parseBudgetBand = (value: string | undefined): "low" | "mid" | "high" | null => {
      if (!value) return null;
      const normalized = value.toLowerCase();
      if (normalized.includes("high")) return "high";
      if (normalized.includes("mid") || normalized.includes("medium")) return "mid";
      if (normalized.includes("low")) return "low";
      return null;
    };

    // Parse sentiment
    const parseSentiment = (value: string | undefined): "excited" | "neutral" | "skeptical" | "negative" | null => {
      if (!value) return null;
      const normalized = value.toLowerCase();
      if (normalized.includes("excit")) return "excited";
      if (normalized.includes("skeptic") || normalized.includes("unsure")) return "skeptical";
      if (normalized.includes("negat") || normalized.includes("disappoint")) return "negative";
      return "neutral";
    };

    const profile: UserProfile = {
      id: `usr_${lead.id.replace('lead_', '')}`,
      lead_id: lead.id,
      segments: parseCommaSeparated(userData.segments),
      interest_level: parseInterestLevel(userData.interest_level),
      budget_band: parseBudgetBand(userData.budget_band),
      problem_tags: parseCommaSeparated(userData.problem_tags),
      feature_requests: parseCommaSeparated(userData.feature_requests),
      sentiment: parseSentiment(userData.sentiment),
      created_at: now,
      updated_at: now,
    };

    return profile;
  }

  /**
   * Batch enrich multiple leads
   */
  async enrichLeadBatch(leads: Lead[]): Promise<UserProfile[]> {
    const profiles: UserProfile[] = [];

    for (const lead of leads) {
      try {
        const profile = await this.enrichLead(lead);
        profiles.push(profile);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to enrich lead ${lead.id}:`, error);
        // Continue with other leads
      }
    }

    return profiles;
  }
}
