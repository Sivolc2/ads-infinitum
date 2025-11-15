// Central export for all services
export * from './product-service';
export * from './experiment-service';
export * from './metrics-service';
export * from './lead-service';

// Meta Ads Integration (Track D)
export {
  MetaAdsClient,
  createMetaAdsClient,
  metricsToSnapshot,
  type MetaAdsClientConfig,
  type CreateAdResult,
  type AdMetrics,
} from './meta-ads-client';

export {
  MetaWebhookHandler,
  createWebhookHandler,
  extractStandardFields,
  type ParsedLead,
  type WebhookVerificationParams,
} from './meta-webhook';

// Meta types - export individually to avoid conflicts
export type {
  TargetingSpec,
  CampaignStatus,
  CampaignObjective,
  CallToActionType,
  InsightsRecord,
  LeadgenWebhookPayload,
  MetaAction,
  CreateAdOptions,
  GetMetricsOptions,
} from './meta-types';

// External API clients
export * from './fal';
export * from './openrouter';

// LLM Services (toggleable)
export * from './raindrop-llm';
