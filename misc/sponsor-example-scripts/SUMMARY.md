# Test Script Summary

## What Was Created

### 1. Core Pipeline Test Script
**File:** `test-core-pipeline.ts`

A comprehensive end-to-end test that validates the entire Ad Infinitum pipeline:

**Pipeline Flow:**
```
Product Generation → Ad Creation → Meta Posting → Metrics → Landing Page
```

**Features:**
- ✅ Generates product concepts using AI or mock data
- ✅ Creates ad experiments with budget/CPL configuration
- ✅ Generates ad variants (copy + images using Freepik)
- ✅ Posts ads to Meta (with mock mode support)
- ✅ Pulls performance metrics from Meta
- ✅ Prepares landing page data
- ✅ Detailed logging and progress tracking
- ✅ Error handling and validation
- ✅ Cost estimation

**Modes:**
- Real mode: Posts actual ads to Meta
- Mock mode: Simulates Meta API calls
- Skip Meta: Tests only product + ad generation

### 2. Setup Verification Script
**File:** `verify-setup.ts`

Quick sanity check before running the full pipeline:
- Checks environment variables
- Validates all imports
- Tests service instantiation
- Runs mock product generation

### 3. Shell Wrapper
**File:** `run-test.sh`

Convenience script that:
- Ensures correct working directory
- Validates .env file exists
- Checks dependencies are installed
- Executes the test with proper paths

### 4. Documentation

**README.md** - Complete usage guide with:
- Setup instructions
- Usage examples
- Configuration options
- Troubleshooting
- Expected output samples

**VERIFICATION.md** - Detailed verification checklist:
- Implemented features
- Pipeline flow validation
- Testing recommendations
- Known limitations

**SUMMARY.md** - This file!

## How to Use

### Quick Test (Recommended First Run)

```bash
# 1. Verify setup
npx tsx misc/sponsor-example-scripts/verify-setup.ts

# 2. Run pipeline test in mock mode
./misc/sponsor-example-scripts/run-test.sh --mock-meta
```

### Full Test with Real Meta

```bash
# Make sure you have Meta credentials in .env
./misc/sponsor-example-scripts/run-test.sh
```

### Custom Tests

```bash
# Just product + ad generation (no Meta)
./misc/sponsor-example-scripts/run-test.sh --skip-meta

# Quick test with 2 variants
./misc/sponsor-example-scripts/run-test.sh --mock-meta --num-variants=2

# Use mock product (no AI)
./misc/sponsor-example-scripts/run-test.sh --mock-product --mock-meta
```

## What Gets Tested

### ✅ Product Generation Service
- Generates creative product concepts
- Uses OpenRouter AI or mock data
- Creates proper data structures
- Generates unique IDs and timestamps

### ✅ Ad Variant Generation Service
- Generates ad copy using LLM
- Creates images using Freepik API
- Produces multiple unique variants
- Combines copy + images into complete ads

### ✅ Meta Ads Integration
- Creates campaigns, ad sets, creatives
- Uploads images to Meta
- Posts ads with proper targeting
- Returns Meta IDs for tracking
- Supports mock mode for testing

### ✅ Metrics Collection
- Pulls performance data from Meta
- Calculates CTR, CPL, CPC
- Tracks impressions, clicks, leads, spend
- Works with both real and mock data

### ✅ Landing Page Integration
- Prepares product data for frontend
- Structures ad performance info
- Shows how data flows to website

## Services Integrated

The test script uses these backend services:

1. **ai-product-generator.ts** - Product concept generation
2. **ad-variant-generator.ts** - Ad creation orchestration
3. **openrouter.ts** - LLM integration for copy
4. **raindrop-llm.ts** - Alternative LLM provider
5. **freepik.ts** - Image generation via Freepik
6. **fal.ts** - Alternative image provider
7. **image-gen.ts** - Image generation coordination
8. **meta-ads-client.ts** - Meta Ads API integration
9. **landing-page-service.ts** - Landing page data management

Plus all the data models from `models/*.ts`.

## Configuration

### Required Environment Variables
```bash
FREEPIK_API_KEY=your_key_here
```

### Optional (for real Meta posting)
```bash
PIPEBOARD_API_TOKEN=your_token_here
META_AD_ACCOUNT_ID=act_xxxxxxxxxxxxx
META_PAGE_ID=xxxxxxxxxxxxx
```

### Optional (for AI product generation)
```bash
LM_API_KEY=your_openrouter_key
```

## Expected Output

When you run the test, you'll see:

```
🚀 AD INFINITUM - CORE PIPELINE TEST
Testing: Product Generation → Ad Creation → Meta Posting → Metrics → Landing Page

================================================================================
STEP 1: GENERATE PRODUCT CONCEPT
================================================================================
📦 Using mock product generator
✅ Generated Product Concept:
   ID: pc_1731705123456
   Title: FocusFlow Timer
   ...

================================================================================
STEP 2: CREATE EXPERIMENT
================================================================================
✅ Created Experiment:
   ID: exp_1731705123789
   Goal: leads
   Budget per day: $ 20
   ...

[... continues through all 6 steps ...]

================================================================================
TEST SUMMARY
================================================================================
📊 Pipeline Test Results:
   ✅ Product concept generated: FocusFlow Timer
   ✅ Experiment created: exp_1731705123789
   ✅ Ad variants generated: 3
   🚀 Ads posted to Meta: 3 (or 🧪 mock mode)

✅ Pipeline test completed successfully!
```

## Cost Estimates

### Per Test Run
- **LLM (OpenRouter):** ~$0.01-0.02 per run
- **Images (Freepik):** ~$0.00-0.05 per run (depends on plan)
- **Meta Ads:** User-configurable budget (default: $20/day)

### Mock Mode
- **Cost:** $0 (no external API calls)

## Troubleshooting

### "Module not found"
```bash
cd repo_src/backend-raindrop
npm install
cd ../..
```

### "Missing environment variables"
Check your `.env` file in repo root has required keys

### "TypeScript errors"
The backend uses ESM modules. Make sure you're using Node 18+

### "Freepik API error"
Verify your FREEPIK_API_KEY is valid and has credits

### "Meta API error"
Use `--mock-meta` flag to bypass Meta API

## Next Steps

After validating the pipeline works:

1. **Run the backend API server:**
   ```bash
   cd repo_src/backend-raindrop
   npm run dev
   ```

2. **Test via HTTP endpoints:**
   ```bash
   curl http://localhost:8787/health
   curl -X POST http://localhost:8787/api/ai/generate-product
   ```

3. **Connect the frontend:**
   - Update VITE_API_URL to point to backend
   - Test product creation flow
   - View ads in dashboard

4. **Add real storage:**
   - Configure SmartBuckets for data persistence
   - Or connect to a database

5. **Implement metrics loop:**
   - Periodic metrics collection
   - Ad performance evaluation
   - Budget optimization

6. **Deploy:**
   - Deploy backend to Cloudflare Workers
   - Deploy frontend to Vercel/similar
   - Configure production env vars

## Questions?

- Check the main README in repo root
- Review the v1 design doc: `docs/guides/v1-design.md`
- Look at service documentation in `repo_src/backend-raindrop/src/services/`

## Credits

This test script validates the core pipeline described in the v1-design.md, updated to use:
- Freepik instead of fal.ai for images (can switch back via IMAGE_PROVIDER env var)
- Raindrop AI or OpenRouter for LLM (configurable via LLM_PROVIDER env var)
- Pipeboard MCP for Meta Ads integration
