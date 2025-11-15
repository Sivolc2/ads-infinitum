/**
 * Meta Lead Ads Webhook Handler
 *
 * Handles webhook events from Meta for lead form submissions.
 * Implements verification and parsing of lead data.
 */

import crypto from 'crypto';
import type { LeadgenWebhookPayload, LeadgenFormEntry } from './meta-types';

// ============================================================================
// Types
// ============================================================================

export interface ParsedLead {
  leadId: string;
  adId: string;
  formId: string;
  pageId: string;
  adgroupId: string;
  createdTime: Date;
  fieldData: Record<string, string | string[]>;
}

export interface WebhookVerificationParams {
  mode: string;
  token: string;
  challenge: string;
}

// ============================================================================
// Webhook Handler
// ============================================================================

export class MetaWebhookHandler {
  private verifyToken: string;
  private appSecret?: string;

  constructor(config: { verifyToken: string; appSecret?: string }) {
    this.verifyToken = config.verifyToken;
    this.appSecret = config.appSecret;
  }

  /**
   * Verify webhook subscription (GET request)
   * Meta sends this during webhook setup to verify ownership
   */
  verifySubscription(params: WebhookVerificationParams): string | null {
    const { mode, token, challenge } = params;

    if (mode === 'subscribe' && token === this.verifyToken) {
      console.log('[Meta Webhook] Subscription verified');
      return challenge;
    }

    console.error('[Meta Webhook] Verification failed');
    return null;
  }

  /**
   * Verify webhook signature (POST request)
   * Validates that the webhook came from Meta
   */
  verifySignature(payload: string, signature: string): boolean {
    if (!this.appSecret) {
      console.warn('[Meta Webhook] App secret not configured, skipping signature verification');
      return true;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.appSecret)
      .update(payload)
      .digest('hex');

    const signatureHash = signature.replace('sha256=', '');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signatureHash),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      console.error('[Meta Webhook] Signature verification failed');
    }

    return isValid;
  }

  /**
   * Parse webhook payload and extract lead information
   */
  parseWebhook(payload: LeadgenWebhookPayload): ParsedLead[] {
    const leads: ParsedLead[] = [];

    if (payload.object !== 'page') {
      console.warn('[Meta Webhook] Unexpected object type:', payload.object);
      return leads;
    }

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field === 'leadgen') {
          const value = change.value;

          const parsedLead: ParsedLead = {
            leadId: value.leadgen_id,
            adId: value.ad_id,
            formId: value.form_id,
            pageId: value.page_id,
            adgroupId: value.adgroup_id,
            createdTime: new Date(value.created_time * 1000),
            fieldData: {}, // Will be populated when fetching full lead data
          };

          leads.push(parsedLead);
        }
      }
    }

    return leads;
  }

  /**
   * Fetch full lead details from Meta Graph API
   * The webhook only contains lead ID, so we need to fetch full data separately
   */
  async fetchLeadDetails(
    leadId: string,
    accessToken: string
  ): Promise<LeadgenFormEntry> {
    const url = `https://graph.facebook.com/v18.0/${leadId}?access_token=${accessToken}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch lead ${leadId}: ${response.statusText}`);
    }

    const data: LeadgenFormEntry = await response.json();
    return data;
  }

  /**
   * Convert Meta lead form entry to structured data
   */
  parseLeadFormEntry(entry: LeadgenFormEntry): ParsedLead {
    const fieldData: Record<string, string | string[]> = {};

    for (const field of entry.field_data) {
      if (field.values.length === 1) {
        fieldData[field.name] = field.values[0];
      } else {
        fieldData[field.name] = field.values;
      }
    }

    return {
      leadId: entry.id,
      adId: '', // Not in form entry, from webhook
      formId: '', // Not in form entry, from webhook
      pageId: '', // Not in form entry, from webhook
      adgroupId: '', // Not in form entry, from webhook
      createdTime: new Date(entry.created_time),
      fieldData,
    };
  }

  /**
   * Full webhook processing pipeline
   * 1. Verify signature
   * 2. Parse webhook
   * 3. Fetch full lead details
   * 4. Return structured leads
   */
  async processWebhook(
    payload: string,
    signature: string,
    accessToken: string
  ): Promise<ParsedLead[]> {
    // Step 1: Verify signature
    if (!this.verifySignature(payload, signature)) {
      throw new Error('Invalid webhook signature');
    }

    // Step 2: Parse webhook
    const webhookData: LeadgenWebhookPayload = JSON.parse(payload);
    const partialLeads = this.parseWebhook(webhookData);

    if (partialLeads.length === 0) {
      console.log('[Meta Webhook] No leads in webhook');
      return [];
    }

    // Step 3: Fetch full details for each lead
    const fullLeads: ParsedLead[] = [];

    for (const partial of partialLeads) {
      try {
        const formEntry = await this.fetchLeadDetails(partial.leadId, accessToken);
        const fullLead = this.parseLeadFormEntry(formEntry);

        // Merge webhook metadata with form data
        fullLead.adId = partial.adId;
        fullLead.formId = partial.formId;
        fullLead.pageId = partial.pageId;
        fullLead.adgroupId = partial.adgroupId;

        fullLeads.push(fullLead);
      } catch (error) {
        console.error(`[Meta Webhook] Error fetching lead ${partial.leadId}:`, error);
      }
    }

    return fullLeads;
  }
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Extract common lead fields (email, name, phone) from field data
 */
export function extractStandardFields(fieldData: Record<string, string | string[]>): {
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
} {
  const result: Record<string, string> = {};

  // Map common field names
  const fieldMapping: Record<string, string> = {
    email: 'email',
    full_name: 'name',
    first_name: 'firstName',
    last_name: 'lastName',
    phone_number: 'phone',
    company_name: 'company',
  };

  for (const [metaField, ourField] of Object.entries(fieldMapping)) {
    const value = fieldData[metaField];
    if (value && typeof value === 'string') {
      result[ourField] = value;
    }
  }

  return result;
}

/**
 * Create webhook handler from environment variables
 */
export function createWebhookHandler(): MetaWebhookHandler {
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN ?? 'default_verify_token';
  const appSecret = process.env.META_APP_SECRET;

  return new MetaWebhookHandler({
    verifyToken,
    appSecret,
  });
}
