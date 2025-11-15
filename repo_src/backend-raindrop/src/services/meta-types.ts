/**
 * Type definitions for Meta Ads API
 * Based on Meta Marketing API v18.0+
 */

// ============================================================================
// Campaign, AdSet, Creative, Ad Types
// ============================================================================

export type CampaignStatus = 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
export type CampaignObjective =
  | 'OUTCOME_LEADS'
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_ENGAGEMENT'
  | 'OUTCOME_SALES'
  | 'OUTCOME_APP_PROMOTION'
  | 'OUTCOME_AWARENESS';

export type BuyingType = 'AUCTION' | 'RESERVED';
export type OptimizationGoal =
  | 'LEAD_GENERATION'
  | 'LINK_CLICKS'
  | 'IMPRESSIONS'
  | 'REACH'
  | 'LANDING_PAGE_VIEWS'
  | 'POST_ENGAGEMENT';

export type BillingEvent = 'IMPRESSIONS' | 'LINK_CLICKS' | 'APP_INSTALLS';
export type BidStrategy =
  | 'LOWEST_COST_WITHOUT_CAP'
  | 'LOWEST_COST_WITH_BID_CAP'
  | 'COST_CAP';

export type CallToActionType =
  | 'SIGN_UP'
  | 'LEARN_MORE'
  | 'GET_QUOTE'
  | 'SHOP_NOW'
  | 'BOOK_NOW'
  | 'APPLY_NOW'
  | 'DOWNLOAD'
  | 'CONTACT_US'
  | 'SUBSCRIBE'
  | 'NO_BUTTON';

// ============================================================================
// Targeting
// ============================================================================

export interface GeoLocation {
  countries?: string[]; // ISO country codes
  cities?: Array<{ key: string; radius?: number; distance_unit?: 'mile' | 'kilometer' }>;
  regions?: Array<{ key: string }>;
  zips?: Array<{ key: string }>;
  location_types?: ('home' | 'recent')[];
}

export interface Interest {
  id: string; // Meta interest ID
  name: string;
}

export interface DetailedTargeting {
  interests?: Interest[];
  behaviors?: Array<{ id: string; name: string }>;
  demographics?: Array<{ id: string; name: string }>;
}

export interface TargetingSpec {
  age_min: number;
  age_max: number;
  genders?: number[]; // 1=male, 2=female, 0=all
  geo_locations: GeoLocation;
  publisher_platforms?: ('facebook' | 'instagram' | 'messenger' | 'audience_network')[];
  facebook_positions?: ('feed' | 'marketplace' | 'video_feeds' | 'right_hand_column' | 'instant_article')[];
  instagram_positions?: ('feed' | 'story' | 'reels' | 'explore')[];
  device_platforms?: ('mobile' | 'desktop')[];
  detailed_targeting?: DetailedTargeting;
  excluded_geo_locations?: GeoLocation;
  locales?: number[]; // Language IDs
  user_os?: ('iOS' | 'Android')[];
}

// ============================================================================
// Creative
// ============================================================================

export interface CallToAction {
  type: CallToActionType;
  value: {
    link: string;
    link_title?: string;
  };
}

export interface LinkData {
  message: string; // Ad body text
  name: string; // Ad headline
  link: string; // Destination URL
  image_hash?: string; // From upload_ad_image
  video_id?: string;
  call_to_action?: CallToAction;
  description?: string; // Link description
  caption?: string; // Link caption (domain)
}

export interface ObjectStorySpec {
  page_id: string;
  link_data?: LinkData;
  video_data?: {
    video_id: string;
    message: string;
    title: string;
    call_to_action?: CallToAction;
  };
  photo_data?: {
    image_hash: string;
    url: string;
    caption?: string;
  };
}

export interface AdCreative {
  id: string;
  name: string;
  object_story_spec?: ObjectStorySpec;
  status: CampaignStatus;
}

// ============================================================================
// Lead Form
// ============================================================================

export interface LeadFormQuestion {
  type: 'FULL_NAME' | 'EMAIL' | 'PHONE' | 'CUSTOM' | 'MULTIPLE_CHOICE';
  key: string;
  label: string;
  options?: string[]; // For multiple choice
}

export interface LeadForm {
  id: string;
  name: string;
  questions: LeadFormQuestion[];
  privacy_policy_url: string;
  follow_up_action_url?: string;
  context_card?: {
    title: string;
    content: string;
    button_text: string;
  };
}

// ============================================================================
// Insights / Metrics
// ============================================================================

export interface MetaAction {
  action_type: string;
  value: string | number;
}

export type MetaActionType =
  | 'leadgen.other'
  | 'onsite_conversion.lead_grouped'
  | 'link_click'
  | 'post_engagement'
  | 'page_engagement'
  | 'post'
  | 'comment'
  | 'like'
  | 'video_view';

export interface InsightsRecord {
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  impressions: string;
  clicks: string;
  spend: string;
  actions?: MetaAction[];
  ctr?: string;
  cpm?: string;
  cpc?: string;
  reach?: string;
  frequency?: string;
  date_start?: string;
  date_stop?: string;
}

export interface InsightsResponse {
  data: InsightsRecord[];
  paging?: {
    cursors?: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

// ============================================================================
// Lead Retrieval (Webhook)
// ============================================================================

export interface LeadgenFormEntry {
  id: string;
  created_time: string;
  field_data: Array<{
    name: string;
    values: string[];
  }>;
}

export interface LeadgenWebhookPayload {
  object: 'page';
  entry: Array<{
    id: string; // Page ID
    time: number;
    changes: Array<{
      field: 'leadgen';
      value: {
        leadgen_id: string;
        page_id: string;
        form_id: string;
        adgroup_id: string;
        ad_id: string;
        created_time: number;
      };
    }>;
  }>;
}

// ============================================================================
// API Responses
// ============================================================================

export interface CreateCampaignResponse {
  id: string;
  campaign_id?: string;
}

export interface CreateAdsetResponse {
  id: string;
  adset_id?: string;
}

export interface CreateCreativeResponse {
  id: string;
  creative_id?: string;
}

export interface CreateAdResponse {
  id: string;
  ad_id?: string;
}

export interface UploadImageResponse {
  images: {
    bytes: {
      hash: string;
      url?: string;
    };
  };
  hash?: string;
  image_hash?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export interface MetaAPIError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    error_user_title?: string;
    error_user_msg?: string;
    fbtrace_id?: string;
  };
}

export interface RateLimitError extends MetaAPIError {
  error: MetaAPIError['error'] & {
    code: 4 | 17 | 32 | 613;
  };
}

// ============================================================================
// Filters
// ============================================================================

export type FilterOperator =
  | 'EQUAL'
  | 'NOT_EQUAL'
  | 'GREATER_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN'
  | 'LESS_THAN_OR_EQUAL'
  | 'IN'
  | 'NOT_IN'
  | 'CONTAIN'
  | 'NOT_CONTAIN';

export interface InsightsFilter {
  field: string;
  operator: FilterOperator;
  value: string | number | string[];
}

// ============================================================================
// Request Options
// ============================================================================

export interface CreateAdOptions {
  dailyBudget?: number; // in cents
  targeting?: TargetingSpec;
  ctaUrl?: string;
  startTime?: string; // ISO 8601
  endTime?: string; // ISO 8601
}

export interface GetMetricsOptions {
  timeRange?: {
    since: string; // YYYY-MM-DD
    until: string; // YYYY-MM-DD
  };
  level?: 'ad' | 'adset' | 'campaign';
  filtering?: InsightsFilter[];
  fields?: string[];
}
