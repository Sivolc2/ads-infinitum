# Track B - Fastino Lead Intelligence

**Owner:** Track B Team
**Status:** ✅ Implemented
**Last Updated:** 2025-11-15

## Overview

Track B implements lead intelligence using Fastino's GLiNER-2 API to enrich raw lead data from Meta ads and landing pages. The system transforms unstructured form data into structured UserProfiles with segments, sentiment analysis, problem tags, and feature requests.

## Architecture

```
┌─────────────────┐
│   Raw Lead      │
│   (Meta/Form)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ POST /internal/ │
│  enrich-lead    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ LeadEnrichment  │
│     Worker      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Fastino Client  │
│  (GLiNER-2)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  UserProfile    │
│   (Enriched)    │
└─────────────────┘

Multiple Leads → AdQualityAggregator → GET /internal/ad-quality/:adId
```

## Components

### 1. Fastino Client (`src/lib/fastino-client.ts`)

A TypeScript client for the Fastino GLiNER-2 API with methods:
- `extractJson()` - Extract structured JSON from unstructured text
- `classifyText()` - Classify text into predefined categories
- `extractEntities()` - Extract named entities from text

### 2. Lead Enrichment Worker (`src/workers/lead-enrichment.ts`)

Processes raw leads through Fastino to extract:
- **Segments**: User roles (creator, student, freelancer, etc.)
- **Interest Level**: high, medium, or low
- **Budget Band**: low, mid, or high
- **Problem Tags**: Pain points mentioned
- **Feature Requests**: Desired features
- **Sentiment**: excited, neutral, skeptical, or negative

### 3. Ad Quality Aggregator (`src/workers/ad-quality-aggregator.ts`)

Aggregates enriched lead data to generate quality metrics per ad:
- Total leads count
- Average interest level
- High interest rate
- Sentiment breakdown
- Quality score (0-100)
- Top segments, problems, and feature requests
- Budget distribution

### 4. Type Definitions (`src/types/lead-intelligence.ts`)

TypeScript interfaces for:
- `Lead` - Raw lead data structure
- `UserProfile` - Enriched lead profile
- `AdQualityStats` - Aggregated quality metrics
- Request/response types for endpoints

## API Endpoints

### POST `/internal/enrich-lead`

Enriches a raw lead using Fastino.

**Request:**
```json
{
  "lead": {
    "id": "lead_001",
    "product_id": "prod_xyz",
    "ad_id": "ad_001",
    "landing_page_id": null,
    "source": "meta_lead_form",
    "email": "user@example.com",
    "name": "John Doe",
    "raw_form_data": {
      "What problem are you trying to solve?": "I need help with task management",
      "What is your role?": "Freelance designer",
      "Budget range?": "Mid-range, $50-150"
    },
    "created_at": "2025-11-15T10:00:00Z"
  }
}
```

**Response:**
```json
{
  "lead_id": "lead_001",
  "profile": {
    "id": "usr_001",
    "lead_id": "lead_001",
    "segments": ["freelancer", "designer"],
    "interest_level": "high",
    "budget_band": "mid",
    "problem_tags": ["task management", "organization"],
    "feature_requests": ["calendar integration"],
    "sentiment": "excited",
    "created_at": "2025-11-15T10:00:00Z",
    "updated_at": "2025-11-15T10:00:00Z"
  },
  "enrichment_time_ms": 1234
}
```

### GET `/internal/ad-quality/:adId`

Returns aggregated quality stats for an ad.

**Response:**
```json
{
  "ad_id": "ad_001",
  "total_leads": 25,
  "avg_interest_level": 0.72,
  "sentiment_breakdown": {
    "excited": 15,
    "neutral": 7,
    "skeptical": 2,
    "negative": 1
  },
  "high_interest_rate": 0.60,
  "quality_score": 73.5,
  "top_segments": ["freelancer", "creator", "student"],
  "top_problem_tags": ["task management", "organization", "time tracking"],
  "top_feature_requests": ["calendar integration", "mobile app"],
  "budget_distribution": {
    "low": 5,
    "mid": 15,
    "high": 5
  },
  "last_updated": "2025-11-15T10:30:00Z"
}
```

## Setup

### 1. Environment Variables

Add to your Raindrop environment or `.env`:

```bash
FASTINO_API_KEY=your_fastino_api_key_here
```

### 2. Install Dependencies

```bash
cd sponsor-example-scripts/raindrop
npm install
```

### 3. Build

```bash
npm run build
```

### 4. Deploy

```bash
npm run deploy
```

Or run locally:

```bash
npm run dev
```

## Testing

Run the test script:

```bash
# Set environment variables
export RAINDROP_URL=http://localhost:8787  # or your deployed URL

# Run tests with tsx
npx tsx test-lead-intelligence.ts
```

The test script will:
1. Enrich a single lead
2. Get quality stats for ad_001
3. Enrich multiple leads with varying quality for ad_002
4. Get quality stats for ad_002 showing aggregated metrics

## Quality Score Algorithm

The quality score (0-100) is calculated using:

```
qualityScore = (
  interestScore × 0.4 +     // 40% weight on high interest rate
  sentimentScore × 0.4 +    // 40% weight on sentiment
  volumeScore × 0.2         // 20% weight on lead volume
) × 100
```

Where:
- **interestScore**: Percentage of high-interest leads (0-1)
- **sentimentScore**: Weighted average of sentiments
  - excited = 1.0
  - neutral = 0.5
  - skeptical = 0.25
  - negative = 0.0
- **volumeScore**: Logarithmic scale of lead count (maxes at 100 leads)

## Integration with Other Tracks

### Inputs from Track A (Meta Ads)
- Raw lead data from Meta Lead Forms
- Ad IDs to associate leads with specific ads

### Outputs to Track C (Orchestration)
- Enriched UserProfile data for decision making
- Quality scores to prioritize high-performing ads
- Segment and problem insights for targeting

## Data Storage

**Current Implementation:** In-memory storage (for demo)
- `profilesStore`: Map<lead_id, UserProfile>
- `adLeadsStore`: Map<ad_id, lead_ids[]>

**Production Recommendation:**
- Use Raindrop SmartBuckets for persistent storage
- Or integrate with external database (PostgreSQL, Supabase, etc.)
- Add indexing on ad_id for faster queries

## Error Handling

- Missing Fastino API key returns 500 with clear message
- Failed enrichment continues with other leads in batch
- Empty ad stats return valid structure with zeros
- All errors logged to console for debugging

## Performance

- Average enrichment time: ~500-1500ms per lead
- Batch processing includes 100ms delay between requests to avoid rate limiting
- Quality aggregation is O(n) where n = number of leads

## Future Enhancements

1. **Persistent Storage**: Migrate to SmartBuckets or database
2. **Batch Endpoints**: Add bulk enrichment endpoint
3. **Webhooks**: Push notifications when quality thresholds met
4. **Caching**: Cache enriched profiles for faster re-queries
5. **Analytics**: Time-series tracking of quality trends
6. **A/B Testing**: Compare quality across ad variants

## Troubleshooting

### "FASTINO_API_KEY not configured"
- Ensure FASTINO_API_KEY is set in your Raindrop environment
- Check `.env` file or Raindrop dashboard settings

### "Lead enrichment failed"
- Verify Fastino API is accessible
- Check API key is valid and has credits
- Ensure lead data has meaningful text to analyze

### Empty quality stats
- Verify leads were enriched first via `/enrich-lead`
- Check ad_id matches between enrichment and quality requests
- Ensure in-memory storage hasn't been cleared (on restart)

## Resources

- [Fastino API Documentation](https://fastino.ai/docs)
- [GLiNER-2 API Reference](https://fastino.ai/api-reference/gliner-2)
- [Raindrop Framework Docs](https://raindrop.dev/docs)
- [Design Document](../../docs/guides/v1-design.md)
