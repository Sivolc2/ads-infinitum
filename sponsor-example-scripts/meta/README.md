# Meta Ads API via Pipeboard MCP

This example demonstrates how to programmatically create and manage Meta (Facebook/Instagram) ad campaigns using the Pipeboard MCP (Model Context Protocol) API.

## Why Pipeboard?

Pipeboard provides a simplified MCP interface to the Meta Marketing API, handling authentication, rate limiting, and API complexity. It's perfect for:
- Automated ad campaign creation
- A/B testing multiple ad variants
- Performance tracking and optimization
- Integration with creative generation pipelines

**Key Benefits:**
- Simplified authentication via single API token
- Handles Meta API versioning and changes
- Built-in retry logic and error handling
- Clean JSON-based interface

## Features

This example includes:

1. **Post Ads** (`post_ad_example.py`)
   - Upload ad images to Meta
   - Create campaigns with specific objectives
   - Create ad sets with detailed targeting
   - Create ad creatives with copy and CTAs
   - Create ads (all in PAUSED status for safety)

2. **Get Metrics** (`get_metrics_example.py`)
   - Retrieve performance metrics (impressions, clicks, leads, spend)
   - Calculate cost per lead (CPL) and CTR
   - Identify top-performing ads
   - Generate optimization recommendations
   - Compare ad performance across campaigns

## Prerequisites

1. **Pipeboard Account**: Sign up at [pipeboard.com](https://pipeboard.com)
2. **Meta Business Account**: Set up at [business.facebook.com](https://business.facebook.com)
3. **Meta Ad Account**: Create or access an existing ad account
4. **Facebook Page**: Required for ad creatives
5. **Pipeboard MCP Connection**: Connect your Meta account to Pipeboard

### Required Scopes

Ensure your Pipeboard connection has these Meta API scopes:
- `ads_management` - Create and manage ads
- `business_management` - Access business assets
- `pages_read_engagement` - Access page information

## Setup

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   ```

3. **Add Your Credentials to `.env`**
   ```bash
   # Get from Pipeboard dashboard
   PIPEBOARD_API_TOKEN=pk_your_token_here

   # Get from Meta Ads Manager (format: act_123456789012345)
   META_AD_ACCOUNT_ID=act_123456789012345

   # Get from your Facebook Page settings
   META_PAGE_ID=123456789012345

   # Get from Meta Business Manager
   META_BUSINESS_ID=123456789012345

   # Your landing page URL
   AD_CTA_URL=https://example.com/landing-page
   ```

### Finding Your Meta IDs

- **Ad Account ID**: Go to [Meta Ads Manager](https://business.facebook.com/adsmanager) → Settings. The ID is in the format `act_123456789012345`
- **Page ID**: Go to your Facebook Page → About → Page Transparency → Page ID
- **Business ID**: Go to [Business Settings](https://business.facebook.com/settings) → Business Info → Business ID

## Usage

### Creating Ads

Run the post ads example:

```bash
python post_ad_example.py
```

**What it does:**
1. Uploads an ad image and gets an image hash
2. Creates a campaign with LEAD_GENERATION objective
3. Creates an ad set targeting women 28-44 in US/CA
4. Creates an ad creative with copy and CTA
5. Creates an ad (in PAUSED status)

**Output:**
```
🚀 Starting Meta Ads Campaign Creation

📸 Step 1: Uploading ad images...
   ✅ Image uploaded. Hash: bbee20f58574e4e4994f0f5adb8c0af6

📋 Step 2: Creating campaign...
   ✅ Campaign created. ID: 120235242600130757

🎯 Step 3: Creating ad set...
   ✅ Ad set created. ID: 120235242641410757

🎨 Step 4: Creating ad creative...
   ✅ Creative created. ID: 1346857283841704

📢 Step 5: Creating ad...
   ✅ Ad created. ID: 23860482918350242

============================================================
✅ CAMPAIGN CREATION COMPLETE
============================================================
Campaign ID:  120235242600130757
Ad Set ID:    120235242641410757
Creative ID:  1346857283841704
Ad ID:        23860482918350242

⚠️  All objects created in PAUSED status.
Review them in Meta Ads Manager before activating.
============================================================
```

### Retrieving Metrics

Run the metrics example:

```bash
python get_metrics_example.py
```

**What it does:**
1. Fetches insights for the last 7 days
2. Parses lead generation actions
3. Calculates CPL (Cost Per Lead) for each ad
4. Identifies top performers by CPL and CTR
5. Generates optimization recommendations

**Output:**
```
📊 Fetching Meta Ads Performance Metrics

📅 Time Range: 2025-11-08 to 2025-11-15

🔍 Fetching ad-level insights...
   ✅ Retrieved 4 ad record(s)

================================================================================
AD PERFORMANCE SUMMARY
================================================================================

📢 Ad: AI Friend - Nori (ID: 23860482918350242)
   Campaign: AIMi – Millennial Gift-Givers
   Impressions: 12,345
   Clicks: 456
   CTR: 3.69%
   Leads: 78
   Spend: $98.76
   CPL: $1.27

================================================================================
TOP PERFORMERS
================================================================================

🏆 Best Cost Per Lead (CPL):
   AI Friend - Nori
   CPL: $1.27 (78 leads for $98.76)

🎯 Best Click-Through Rate (CTR):
   AI Friend - Nori
   CTR: 3.69% (456 clicks from 12,345 impressions)

================================================================================
OVERALL SUMMARY
================================================================================

Total Ads: 4
Total Impressions: 45,678
Total Clicks: 1,234
Overall CTR: 2.70%
Total Leads: 234
Total Spend: $456.78
Overall CPL: $1.95

💡 RECOMMENDATIONS
================================================================================

🚀 Consider increasing budget for these low-CPL ads:
   - AI Friend - Nori (CPL: $1.27, 1.5x better than average)
```

## Customization

### Targeting Options

Modify the `create_targeting_spec()` function to adjust targeting:

```python
targeting = create_targeting_spec(
    age_min=18,
    age_max=24,
    genders=[1, 2],  # 1=male, 2=female
    countries=["US", "CA", "GB"],
    interests=[
        {"id": "6003139266461", "name": "Journaling"},
        {"id": "6003349442621", "name": "Anime"}
    ]
)
```

**Common Interest IDs:**
- Journaling: `6003139266461`
- Self-care: `6003462608892`
- Anime: `6003349442621`
- Digital Collectibles: `6003726105862`

Find more interest IDs using [Meta Ads Manager](https://business.facebook.com/adsmanager) → Audience Insights.

### Campaign Objectives

Available objectives (change in `create_campaign()`):
- `OUTCOME_LEADS` - Lead generation
- `OUTCOME_TRAFFIC` - Website traffic
- `OUTCOME_ENGAGEMENT` - Post engagement
- `OUTCOME_AWARENESS` - Brand awareness
- `OUTCOME_APP_PROMOTION` - App installs
- `OUTCOME_SALES` - Conversions

### Budget

Set daily budget in cents (100 = $1.00):

```python
adset_id = client.create_adset(
    campaign_id=campaign_id,
    name="My Ad Set",
    daily_budget=1500,  # $15.00 per day
    targeting=targeting
)
```

### Call-to-Action Types

Available CTA button types:
- `SIGN_UP` - "Sign Up" button
- `LEARN_MORE` - "Learn More" button
- `SHOP_NOW` - "Shop Now" button
- `DOWNLOAD` - "Download" button
- `GET_QUOTE` - "Get Quote" button
- `APPLY_NOW` - "Apply Now" button

## Integration with Creative Generation

This example can be integrated with image generation APIs (fal.ai, Freepik, etc.):

```python
from fal_client import generate_image
from pipeboard_client import PipeboardMetaAdsClient

# Generate creative
image_url = generate_image(prompt="Modern AI companion app")

# Upload to Meta
client = PipeboardMetaAdsClient(api_token, ad_account_id)
image_hash = client.upload_ad_image(image_url, "generated-ad.png")

# Create ad creative with generated image
creative_id = client.create_ad_creative(
    name="Generated Creative",
    page_id=page_id,
    image_hash=image_hash,
    message="Your ad copy here",
    headline="Your headline here",
    link=landing_page_url
)
```

## API Rate Limits

Pipeboard handles rate limiting automatically. If you hit Meta's API limits:
- Free tier: 30 AI tool executions per week
- Paid tiers: Higher limits and priority support

## Safety Features

All scripts create ads in **PAUSED** status by default to prevent accidental spend:
- Review ads in [Meta Ads Manager](https://business.facebook.com/adsmanager) before activating
- Set appropriate daily/lifetime budgets
- Test with small budgets first
- Use the Meta sandbox environment for development

## Troubleshooting

### Error: "facebook_connection_required"
- **Solution**: Reconnect your Facebook account in Pipeboard dashboard

### Error: "weekly_limit_exceeded"
- **Solution**: Upgrade your Pipeboard plan or wait for limit reset (Mondays)

### Error: "Invalid ad account ID"
- **Solution**: Ensure your ad account ID includes the `act_` prefix (e.g., `act_123456789012345`)

### Error: "Insufficient permissions"
- **Solution**: Verify you have `ads_management`, `business_management`, and `pages_read_engagement` scopes

### No insights data returned
- **Possible causes**:
  - Ads are still paused
  - Ads haven't started running yet
  - Time range is too early (before ad start date)
  - No spend has occurred

## Resources

- [Pipeboard Documentation](https://pipeboard.com/docs)
- [Meta Ads MCP on GitHub](https://github.com/pipeboard-co/meta-ads-mcp)
- [Meta Marketing API Docs](https://developers.facebook.com/docs/marketing-apis)
- [Meta Ads Manager](https://business.facebook.com/adsmanager)
- [Meta Business Manager](https://business.facebook.com/settings)

## Next Steps

1. **Run the examples** with your credentials
2. **Review created ads** in Meta Ads Manager
3. **Activate ads** with small budgets to test
4. **Monitor performance** with the metrics script
5. **Iterate and optimize** based on results
6. **Scale winning ads** by increasing budgets

## License

This example is provided as-is for educational purposes. Use in accordance with Meta's [Terms of Service](https://www.facebook.com/legal/terms) and [Advertising Policies](https://www.facebook.com/policies/ads/).
