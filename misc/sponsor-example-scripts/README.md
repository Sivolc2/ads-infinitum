# Ad Infinitum Core Pipeline Test Scripts

This directory contains example scripts that demonstrate the core pipeline functionality of Ad Infinitum.

## Test Scripts

### `test-core-pipeline.ts`

Comprehensive end-to-end test of the core pipeline:

**Pipeline Steps:**
1. **Product Idea Generation** - Generate a product concept using AI or mock data
2. **Ad Creation** - Generate ad copy and images (using Freepik)
3. **Meta Ads Posting** - Post ads to Meta (or use mock mode)
4. **Metrics Collection** - Pull performance metrics from Meta
5. **Landing Page Update** - Pass product and ad info to the website

## Setup

### Prerequisites

1. **Node.js & TypeScript** installed
2. **Environment variables** configured in `.env` at repo root

### Required Environment Variables

```bash
# Required for ad generation
FREEPIK_API_KEY=your_freepik_api_key

# Required for real Meta posting (optional - can use mock mode)
PIPEBOARD_API_TOKEN=your_pipeboard_token
META_AD_ACCOUNT_ID=act_xxxxxxxxxxxxx
META_PAGE_ID=xxxxxxxxxxxxx

# Optional for AI product generation
LM_API_KEY=your_openrouter_api_key

# Optional landing page URL
AD_CTA_URL=https://yoursite.com/reserve
```

### Installation

From the repo root:

```bash
# Install dependencies if not already done
cd repo_src/backend-raindrop
npm install

# Return to repo root
cd ../..
```

## Usage

### Verify Setup First

Before running the full pipeline, verify your setup:

```bash
# From repo root
cd repo_src/backend-raindrop && npm install && cd ../..
npx tsx misc/sponsor-example-scripts/verify-setup.ts
```

This will check:
- Environment variables are loaded
- All imports work
- Services can be instantiated
- Mock product generation works

### Quick Start

The easiest way to run the test is using the provided shell script:

```bash
# From repo root
./misc/sponsor-example-scripts/run-test.sh --mock-meta
```

### Basic Test (Mock Mode)

Test the entire pipeline without posting real ads:

```bash
./misc/sponsor-example-scripts/run-test.sh --mock-meta
```

### Real Meta Posting

Post actual ads to Meta (requires Meta credentials):

```bash
./misc/sponsor-example-scripts/run-test.sh
```

### Available Options

```bash
# Use mock product generator (no AI)
--mock-product

# Use mock mode for Meta Ads (don't post real ads)
--mock-meta

# Skip Meta Ads posting entirely
--skip-meta

# Generate N variants (default: 3, max: 10)
--num-variants=5
```

### Example Commands

```bash
# Full test with mock Meta
./misc/sponsor-example-scripts/run-test.sh --mock-meta

# Full test with real Meta posting
./misc/sponsor-example-scripts/run-test.sh

# Quick test with mock everything and 2 variants
./misc/sponsor-example-scripts/run-test.sh --mock-product --mock-meta --num-variants=2

# Test without Meta (just product + ad generation)
./misc/sponsor-example-scripts/run-test.sh --skip-meta
```

### Alternative: Direct tsx execution

You can also run the script directly if you have tsx installed:

```bash
# From repo root
npx tsx misc/sponsor-example-scripts/test-core-pipeline.ts --mock-meta

# Or with the backend's tsx
repo_src/backend-raindrop/node_modules/.bin/tsx misc/sponsor-example-scripts/test-core-pipeline.ts --mock-meta
```

## What Gets Tested

### ✅ Product Generation
- Generates creative product concepts
- Uses AI (OpenRouter) or mock generator
- Creates proper data structures

### ✅ Ad Variant Generation
- Generates ad copy using LLM
- Creates images using Freepik API
- Produces 3-10 unique ad variants
- Combines copy + images into complete ads

### ✅ Meta Ads Integration
- Creates campaigns, ad sets, creatives
- Uploads images to Meta
- Posts ads (or mocks in dev mode)
- Returns Meta IDs for tracking

### ✅ Metrics Collection
- Pulls performance data from Meta
- Calculates CTR, CPL, CPC
- Tracks impressions, clicks, leads, spend

### ✅ Landing Page Integration
- Prepares product data for frontend
- Structures ad performance info
- Shows how data flows to website

## Expected Output

The test script will show detailed progress through each step:

```
🚀 AD INFINITUM - CORE PIPELINE TEST

================================================================================
STEP 1: GENERATE PRODUCT CONCEPT
================================================================================
🤖 Using AI to generate product concept

✅ Generated Product Concept:
   ID: pc_1234567890
   Title: FocusFlow Timer
   Tagline: Stay focused with ambient productivity cues
   ...

================================================================================
STEP 2: CREATE EXPERIMENT
================================================================================
✅ Created Experiment:
   ID: exp_1234567890
   Goal: leads
   Budget per day: $ 20
   ...

================================================================================
STEP 3: GENERATE AD VARIANTS (COPY + IMAGES)
================================================================================
🎨 Generating 3 ad variants...
📝 Step 1/3: Generating ad copy with OpenRouter...
✅ Generated 3 copy variations
🖼️  Step 2/3: Generating images with freepik...
✅ Generated 3 images
🔧 Step 3/3: Assembling ad variants...
✅ Successfully generated 3 complete ad variants

   Variant 1 (ad_xxx):
      Headline: Reclaim Your Focus
      Body: Stop losing hours to distractions...
      CTA: Learn more
      ...

================================================================================
STEP 4: POST ADS TO META
================================================================================
🚀 Posting real ads to Meta
📤 Posting variant 1/3...
   ✅ Success!
      Campaign ID: 123456789
      AdSet ID: 987654321
      ...

================================================================================
STEP 5: PULL METRICS FROM META
================================================================================
📊 Pulling metrics for 3 ad(s)...

✅ Retrieved metrics for 3 ad(s):
   Ad 1:
      Impressions: 1,234
      Clicks: 56
      Leads: 12
      Spend: $8.50
      CTR: 4.54%
      CPL: $0.71
      ...

================================================================================
STEP 6: PASS INFO TO LANDING PAGE
================================================================================
✅ Landing Page Data Prepared:
{
  "product": { ... },
  "experiment": { ... },
  "ads": [ ... ]
}

💡 This data would be sent to:
   - Frontend landing page API
   - POST /api/landing/:productId
   ...

================================================================================
TEST SUMMARY
================================================================================
📊 Pipeline Test Results:
   ✅ Product concept generated: FocusFlow Timer
   ✅ Experiment created: exp_1234567890
   ✅ Ad variants generated: 3
   🚀 Ads posted to Meta: 3

🎯 Next Steps:
   1. View ads in Meta Ads Manager
   2. Monitor performance metrics
   3. Check landing page at frontend
   4. Collect leads and analyze

💰 Estimated Costs:
   - Ad generation (LLM + images): ~$0.10 - $0.20
   - Meta ads budget: $20/day
   - Total for 5 days: $100

✅ Pipeline test completed successfully!
```

## Troubleshooting

### "Module not found" errors

Make sure you're running from the repo root and dependencies are installed:

```bash
cd repo_src/backend-raindrop
npm install
cd ../..
```

### "Missing required environment variables"

Check your `.env` file has the required keys:

```bash
cat .env | grep -E "(FREEPIK|PIPEBOARD|META)"
```

### "Failed to generate images"

- Check FREEPIK_API_KEY is valid
- Verify you have API credits
- Try with `--skip-meta` to test other parts

### "Meta API error"

- Use `--mock-meta` flag to test without real posting
- Verify PIPEBOARD_API_TOKEN, META_AD_ACCOUNT_ID, META_PAGE_ID
- Check Meta Business Manager access

## Integration with Backend

This test script demonstrates how the backend services work together:

1. **AI Product Generator** (`ai-product-generator.ts`)
2. **Ad Variant Generator** (`ad-variant-generator.ts`)
3. **Freepik Image Service** (`freepik.ts`)
4. **Meta Ads Client** (`meta-ads-client.ts`)
5. **Landing Page Service** (`landing-page-service.ts`)

The actual backend API (`src/api/index.ts`) provides HTTP endpoints that wrap these services.

## Next Steps

After validating the pipeline:

1. Run the full backend API server
2. Test via HTTP endpoints
3. Connect frontend to backend
4. Add metrics monitoring
5. Implement ad optimization logic

## Support

For issues or questions:
- Check the main project README
- Review service documentation in `repo_src/backend-raindrop/src/services/`
- Look at the v1 design doc: `docs/guides/v1-design.md`
