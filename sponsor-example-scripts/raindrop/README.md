# Raindrop Ad Optimizer Example

This is a Raindrop service that uses AI to optimize advertising copy based on performance data.

## Overview

The Ad Optimizer service exposes a POST endpoint at `/optimize-ads` that:
- Accepts ad performance statistics
- Analyzes which copy patterns work best
- Uses AI (llama-3.3-70b) to generate improved ad copy and strategy recommendations

## Prerequisites

1. Install Raindrop CLI:
   ```bash
   npm install -g @liquidmetal-ai/raindrop-cli
   ```

2. Authenticate with Raindrop:
   ```bash
   raindrop login
   ```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run locally:
   ```bash
   npm run dev
   ```

3. Deploy to production:
   ```bash
   npm run deploy
   ```

## API Usage

### Endpoint: POST /optimize-ads

**Request Body:**
```json
{
  "productName": "Smart Home Hub",
  "audience": "Tech-savvy millennials",
  "samples": [
    {
      "id": "ad-1",
      "copy": "Transform your home with AI",
      "impressions": 10000,
      "clicks": 250,
      "spend": 125.50
    },
    {
      "id": "ad-2",
      "copy": "Smart living made simple",
      "impressions": 8500,
      "clicks": 320,
      "spend": 110.00
    }
  ]
}
```

**Response:**
```json
{
  "suggestedHeadlines": [
    "AI-Powered Home, Simplified",
    "Your Smart Home Awaits",
    "Transform Every Room Instantly"
  ],
  "suggestedBodies": [
    "Control everything from one app...",
    "Easy setup, powerful features...",
    "Join 10,000+ happy homeowners..."
  ],
  "strategyNotes": "- Focus on ease of use\n- Emphasize social proof\n- Test urgency messaging"
}
```

## Example cURL Request

```bash
curl -X POST https://your-raindrop-url/optimize-ads \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "Smart Home Hub",
    "audience": "Tech-savvy millennials",
    "samples": [
      {
        "id": "ad-1",
        "copy": "Transform your home with AI",
        "impressions": 10000,
        "clicks": 250,
        "spend": 125.50
      }
    ]
  }'
```

## Project Structure

```
.
├── raindrop.manifest          # Raindrop application configuration
├── src/
│   └── services/
│       └── ad-api.ts         # Main service implementation
├── package.json
├── tsconfig.json
└── README.md
```

## Features

- **AI-Powered Analysis**: Uses llama-3.3-70b to analyze ad performance
- **Structured Output**: Returns JSON-formatted recommendations
- **Performance Metrics**: Considers impressions, clicks, CTR, and spend
- **Strategy Insights**: Provides actionable targeting and creative testing advice

## Learn More

- [Raindrop Documentation](https://raindrop.dev/docs)
- [Raindrop Developer Hub](https://developer.raindrop.dev)

## License

MIT
