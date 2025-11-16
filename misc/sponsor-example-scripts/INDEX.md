# Sponsor Example Scripts - Index

Complete test suite for validating the Ad Infinitum core pipeline.

## 📁 Files in This Directory

### 🚀 Executable Scripts

1. **`test-core-pipeline.ts`** (15KB)
   - **Purpose:** End-to-end pipeline test
   - **What it does:** Product generation → Ad creation → Meta posting → Metrics → Landing page
   - **Run:** `./run-test.sh --mock-meta`

2. **`verify-setup.ts`** (4.1KB)
   - **Purpose:** Quick setup verification
   - **What it does:** Checks env vars, imports, service instantiation
   - **Run:** `npx tsx verify-setup.ts`

3. **`run-test.sh`** (1KB)
   - **Purpose:** Convenience wrapper script
   - **What it does:** Sets up paths and runs test-core-pipeline.ts
   - **Run:** `./run-test.sh [options]`

### 📖 Documentation

4. **`README.md`** (8.5KB)
   - **Purpose:** Complete usage guide
   - **Contains:** Setup, usage, examples, troubleshooting, expected output

5. **`SUMMARY.md`** (7.2KB)
   - **Purpose:** High-level overview
   - **Contains:** What was created, how to use, services integrated, cost estimates

6. **`VERIFICATION.md`** (5.3KB)
   - **Purpose:** Implementation checklist
   - **Contains:** What's implemented, pipeline validation, testing recommendations

7. **`MISSING_IMPLEMENTATIONS.md`** (8.3KB)
   - **Purpose:** Gap analysis
   - **Contains:** What's missing, recommendations, priorities, testing guidance

8. **`INDEX.md`** (this file)
   - **Purpose:** Navigation and quick reference

### ⚙️ Configuration

9. **`package.json`** (648B)
   - **Purpose:** npm scripts and dependencies
   - **Contains:** Test shortcuts, dependency list

## 🎯 Quick Start

### First Time Setup

```bash
# 1. Install dependencies
cd repo_src/backend-raindrop
npm install
cd ../..

# 2. Verify setup
npx tsx misc/sponsor-example-scripts/verify-setup.ts

# 3. Run test in mock mode
./misc/sponsor-example-scripts/run-test.sh --mock-meta
```

### Common Commands

```bash
# Quick test (recommended)
./misc/sponsor-example-scripts/run-test.sh --mock-meta

# Full test with real Meta
./misc/sponsor-example-scripts/run-test.sh

# Just ad generation (no Meta)
./misc/sponsor-example-scripts/run-test.sh --skip-meta

# Custom variant count
./misc/sponsor-example-scripts/run-test.sh --mock-meta --num-variants=2
```

## 📚 Where to Start Reading

**If you want to...**

- **Run the test quickly:** Start with `README.md` → Quick Start section
- **Understand what's tested:** Read `SUMMARY.md` → What Gets Tested
- **Check implementation status:** Read `VERIFICATION.md` → Implemented Services
- **Find missing pieces:** Read `MISSING_IMPLEMENTATIONS.md` → Priority Recommendations
- **Navigate files:** You're already here! (INDEX.md)

## 🔍 What Each Script Tests

### test-core-pipeline.ts

**Pipeline Steps:**

1. **Product Generation** (Step 1)
   - ✅ AI or mock product concept
   - ✅ Data structure validation
   - ✅ ID generation

2. **Experiment Creation** (Step 2)
   - ✅ Budget configuration
   - ✅ CPL thresholds
   - ✅ Experiment setup

3. **Ad Variant Generation** (Step 3)
   - ✅ LLM copy generation
   - ✅ Freepik image generation
   - ✅ Copy + image combination
   - ✅ Multiple variants

4. **Meta Ads Posting** (Step 4)
   - ✅ Campaign creation
   - ✅ Ad set creation
   - ✅ Creative upload
   - ✅ Ad posting
   - ✅ Mock mode support

5. **Metrics Collection** (Step 5)
   - ✅ Insights retrieval
   - ✅ CTR, CPL, CPC calculation
   - ✅ Lead tracking

6. **Landing Page Update** (Step 6)
   - ✅ Data preparation
   - ✅ JSON structure
   - ✅ Info passing

### verify-setup.ts

**Verification Checks:**

1. ✅ Environment variables loaded
2. ✅ All service imports work
3. ✅ Services can be instantiated
4. ✅ Mock product generation works

## 📊 Expected Results

### Success Indicators

When test runs successfully, you'll see:

```
✅ Product concept generated: [Product Title]
✅ Experiment created: exp_xxxxx
✅ Ad variants generated: 3
✅ Ads posted to Meta: 3 (or mock mode)
✅ Metrics retrieved for X ad(s)
✅ Landing page data prepared
```

### What Gets Created

- 1 ProductConcept object
- 1 AdExperiment object
- 3 AdVariant objects (copy + images)
- 3 Meta campaigns/adsets/ads (if not mocked)
- 3 MetricsSnapshot objects (if pulled)
- 1 Landing page data structure

## 🛠️ Configuration

### Required Environment Variables

```bash
FREEPIK_API_KEY=your_key_here
```

### Optional Variables

```bash
# For real Meta posting
PIPEBOARD_API_TOKEN=your_token
META_AD_ACCOUNT_ID=act_xxxxx
META_PAGE_ID=xxxxx

# For AI product generation
LM_API_KEY=your_openrouter_key

# For landing page CTAs
AD_CTA_URL=https://yoursite.com/reserve
```

## 🎓 Learning Path

### Beginner: Just Want to See It Work

1. Read `README.md` → Quick Start
2. Run `verify-setup.ts`
3. Run `./run-test.sh --mock-meta`
4. Check output matches expected results

### Intermediate: Want to Understand the Flow

1. Read `SUMMARY.md` → Pipeline Flow
2. Read `test-core-pipeline.ts` source
3. Run with different flags to see variations
4. Check `VERIFICATION.md` for details

### Advanced: Want to Extend or Fix

1. Read `MISSING_IMPLEMENTATIONS.md`
2. Check backend service source code
3. Add missing features as needed
4. Create additional test scripts

## 🔗 Related Files

### Backend Services (in repo_src/backend-raindrop/src/services/)

- `ai-product-generator.ts` - Product generation
- `ad-variant-generator.ts` - Ad creation
- `meta-ads-client.ts` - Meta integration
- `freepik.ts` - Image generation
- `openrouter.ts` - LLM integration
- `landing-page-service.ts` - Landing pages
- And more...

### Design Documents

- `docs/guides/v1-design.md` - Original system design
- Main project README

## 🤔 Troubleshooting

### Common Issues

**"Module not found"**
→ Run: `cd repo_src/backend-raindrop && npm install`

**"Missing environment variables"**
→ Check `.env` file in repo root

**"Freepik API error"**
→ Verify FREEPIK_API_KEY is valid

**"Meta API error"**
→ Use `--mock-meta` flag

**"TypeScript errors"**
→ Ensure Node.js 18+ and tsx is installed

See `README.md` → Troubleshooting for more details.

## 💡 Tips

1. **Always start with verify-setup.ts** to catch issues early
2. **Use mock mode first** to test without costs
3. **Test with --num-variants=2** for faster iteration
4. **Check logs carefully** - they show detailed progress
5. **Read MISSING_IMPLEMENTATIONS.md** if something doesn't work

## 🎯 Next Steps After Testing

1. Run the backend API server
2. Test via HTTP endpoints
3. Connect frontend to backend
4. Add missing features from MISSING_IMPLEMENTATIONS.md
5. Deploy to production

## 📞 Support

- Check documentation in this directory
- Review service source code
- Read v1-design.md
- Check main project README

---

**Last Updated:** 2025-11-15

**Status:** ✅ Ready to use

**Test Coverage:** Core pipeline (Product → Ads → Meta → Metrics → Landing Page)
