import {
  Lead,
  CreateLead,
  generateLeadId,
  LeadSchema,
  UserProfile,
  CreateUserProfile,
  generateUserProfileId,
  UserProfileSchema,
} from '../models';

/**
 * LeadIngestionService handles lead capture and enrichment
 * Stores leads and optionally enqueues them for Fastino processing
 */
export class LeadIngestionService {
  private bucket: any; // SmartBucket instance
  private queue: any; // Queue instance for async processing
  private LEADS_PREFIX = 'leads/';
  private PROFILES_PREFIX = 'user-profiles/';

  constructor(bucket: any, queue: any) {
    this.bucket = bucket;
    this.queue = queue;
  }

  // ===== LEAD OPERATIONS =====

  /**
   * Ingest a new lead
   */
  async ingestLead(data: CreateLead): Promise<Lead> {
    const lead: Lead = {
      ...data,
      id: generateLeadId(),
      created_at: new Date().toISOString(),
    };

    const validated = LeadSchema.parse(lead);

    // Store in bucket
    const key = `${this.LEADS_PREFIX}${validated.id}`;
    await this.bucket.put(key, JSON.stringify(validated), {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: {
        type: 'lead',
        product_id: validated.product_id,
        source: validated.source,
      },
    });

    // Enqueue for Fastino processing
    await this.queue.send({
      type: 'lead_enrichment',
      lead_id: validated.id,
      lead_data: validated,
    });

    return validated;
  }

  /**
   * Get lead by ID
   */
  async getLead(id: string): Promise<Lead | null> {
    const key = `${this.LEADS_PREFIX}${id}`;
    const object = await this.bucket.get(key);

    if (!object) {
      return null;
    }

    const data = JSON.parse(await object.text());
    return LeadSchema.parse(data);
  }

  /**
   * List leads by product
   */
  async listLeadsByProduct(productId: string): Promise<Lead[]> {
    const listResult = await this.bucket.list({
      prefix: this.LEADS_PREFIX,
      limit: 1000,
    });

    const leads: Lead[] = [];

    for (const obj of listResult.objects) {
      const object = await this.bucket.get(obj.key);
      if (object) {
        const data = JSON.parse(await object.text());
        const lead = LeadSchema.parse(data);

        if (lead.product_id === productId) {
          leads.push(lead);
        }
      }
    }

    return leads.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  /**
   * List leads by ad variant
   */
  async listLeadsByAd(adId: string): Promise<Lead[]> {
    const listResult = await this.bucket.list({
      prefix: this.LEADS_PREFIX,
      limit: 1000,
    });

    const leads: Lead[] = [];

    for (const obj of listResult.objects) {
      const object = await this.bucket.get(obj.key);
      if (object) {
        const data = JSON.parse(await object.text());
        const lead = LeadSchema.parse(data);

        if (lead.ad_id === adId) {
          leads.push(lead);
        }
      }
    }

    return leads.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  // ===== USER PROFILE OPERATIONS =====

  /**
   * Create a user profile from lead enrichment
   */
  async createUserProfile(data: CreateUserProfile): Promise<UserProfile> {
    const profile: UserProfile = {
      ...data,
      id: generateUserProfileId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const validated = UserProfileSchema.parse(profile);

    const key = `${this.PROFILES_PREFIX}${validated.id}`;
    await this.bucket.put(key, JSON.stringify(validated), {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: {
        type: 'user-profile',
        lead_id: validated.lead_id,
        interest_level: validated.interest_level,
      },
    });

    return validated;
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(id: string): Promise<UserProfile | null> {
    const key = `${this.PROFILES_PREFIX}${id}`;
    const object = await this.bucket.get(key);

    if (!object) {
      return null;
    }

    const data = JSON.parse(await object.text());
    return UserProfileSchema.parse(data);
  }

  /**
   * Get user profile by lead ID
   */
  async getUserProfileByLead(leadId: string): Promise<UserProfile | null> {
    const listResult = await this.bucket.list({
      prefix: this.PROFILES_PREFIX,
      limit: 1000,
    });

    for (const obj of listResult.objects) {
      const object = await this.bucket.get(obj.key);
      if (object) {
        const data = JSON.parse(await object.text());
        const profile = UserProfileSchema.parse(data);

        if (profile.lead_id === leadId) {
          return profile;
        }
      }
    }

    return null;
  }

  /**
   * Mock: Enrich lead with Fastino
   * In production, this would call Fastino GLiNER-2 API
   */
  async enrichLeadWithFastino(leadId: string): Promise<UserProfile | null> {
    const lead = await this.getLead(leadId);
    if (!lead) {
      return null;
    }

    // Mock enrichment data
    // In production, you would:
    // 1. Call Fastino GLiNER-2 API
    // 2. Extract entities and classify text
    // 3. Generate profile data

    const mockProfile: CreateUserProfile = {
      lead_id: leadId,
      segments: ['early_adopter', 'tech_enthusiast'],
      interest_level: 'high',
      budget_band: 'mid',
      problem_tags: ['productivity', 'automation'],
      feature_requests: [],
      sentiment: 'excited',
    };

    return this.createUserProfile(mockProfile);
  }

  /**
   * Get lead statistics for a product
   */
  async getLeadStats(productId: string): Promise<{
    total_leads: number;
    meta_leads: number;
    landing_leads: number;
    profiles_created: number;
    high_interest: number;
  }> {
    const leads = await this.listLeadsByProduct(productId);

    const metaLeads = leads.filter((l) => l.source === 'meta_lead_form').length;
    const landingLeads = leads.filter((l) => l.source === 'landing_form').length;

    // Count profiles
    const listResult = await this.bucket.list({
      prefix: this.PROFILES_PREFIX,
      limit: 1000,
    });

    let profilesCreated = 0;
    let highInterest = 0;

    for (const obj of listResult.objects) {
      const object = await this.bucket.get(obj.key);
      if (object) {
        const data = JSON.parse(await object.text());
        const profile = UserProfileSchema.parse(data);

        // Check if profile belongs to this product's leads
        const leadIds = leads.map((l) => l.id);
        if (leadIds.includes(profile.lead_id)) {
          profilesCreated++;
          if (profile.interest_level === 'high') {
            highInterest++;
          }
        }
      }
    }

    return {
      total_leads: leads.length,
      meta_leads: metaLeads,
      landing_leads: landingLeads,
      profiles_created: profilesCreated,
      high_interest: highInterest,
    };
  }

  /**
   * Process lead enrichment queue message
   * This would typically be called by a Raindrop queue consumer
   */
  async processLeadEnrichment(message: any): Promise<void> {
    const { lead_id } = message;

    // Check if profile already exists
    const existingProfile = await this.getUserProfileByLead(lead_id);
    if (existingProfile) {
      console.log(`Profile already exists for lead ${lead_id}`);
      return;
    }

    // Enrich with Fastino
    await this.enrichLeadWithFastino(lead_id);
  }
}
