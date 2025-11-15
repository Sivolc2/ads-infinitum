# Ad Infinitum Backend - API Documentation

Complete API reference for Track A endpoints.

## Base URL

**Local**: `http://localhost:8787`
**Production**: `https://<your-app>.raindrop.dev`

## Authentication

Currently, authentication is not implemented (hackathon MVP). In production, you would add:
- API keys for service-to-service calls
- OAuth for user-facing endpoints

## Response Format

All endpoints return JSON in this format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "count": 10  // (for list endpoints)
}
```

### Error Response
```json
{
  "success": false,
  "error": "Short error message",
  "message": "Detailed error description"
}
```

---

## Products API

### List Products

`GET /api/products`

**Query Parameters:**
- `status` (optional): Filter by status (`draft`, `testing`, `validated`, `killed`, `handoff`)

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "pc_1731679200123_abc",
      "title": "AI Desk Buddy",
      "tagline": "Your smart productivity partner",
      "description": "An AI-powered desk device...",
      "hypothesis": "Remote workers need better focus tools",
      "target_audience": "Remote workers, ages 25-45",
      "status": "testing",
      "created_by": "agent",
      "created_at": "2025-11-15T14:00:00Z",
      "updated_at": "2025-11-15T14:00:00Z"
    }
  ]
}
```

### Get Product

`GET /api/products/:id`

**Response:**
```json
{
  "success": true,
  "data": { /* ProductConcept */ }
}
```

### Create Product

`POST /api/products`

**Request Body:**
```json
{
  "title": "AI Desk Buddy",
  "tagline": "Your smart productivity partner",
  "description": "An AI-powered desk device that helps you stay focused...",
  "hypothesis": "Remote workers struggle with distractions and need ambient AI assistance",
  "target_audience": "Remote workers and digital nomads, ages 25-45",
  "status": "draft",
  "created_by": "agent"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": { /* Created ProductConcept with id, timestamps */ }
}
```

### Update Product

`PATCH /api/products/:id`

**Request Body:** (all fields optional)
```json
{
  "status": "testing",
  "title": "Updated title"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Updated ProductConcept */ }
}
```

### Delete Product

`DELETE /api/products/:id`

**Response:**
```json
{
  "success": true,
  "message": "Product deleted"
}
```

---

## Experiments API

### List Experiments

`GET /api/experiments?product_id=pc_123`

**Query Parameters:**
- `product_id` (required): Filter by product ID

**Response:**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": "exp_1731679200456_xyz",
      "product_id": "pc_123",
      "platform": "meta",
      "goal": "leads",
      "budget_total_usd": 100,
      "budget_per_day_usd": 10,
      "min_leads_for_decision": 10,
      "target_cpl_threshold_usd": 1.0,
      "status": "running",
      "round": 1,
      "created_at": "2025-11-15T14:00:00Z",
      "updated_at": "2025-11-15T14:00:00Z"
    }
  ]
}
```

### Get Experiment

`GET /api/experiments/:id`

**Response:**
```json
{
  "success": true,
  "data": { /* AdExperiment */ }
}
```

### Create Experiment

`POST /api/experiments`

**Request Body:**
```json
{
  "product_id": "pc_123",
  "platform": "meta",
  "goal": "leads",
  "budget_total_usd": 100,
  "budget_per_day_usd": 10,
  "min_leads_for_decision": 10,
  "target_cpl_threshold_usd": 1.0,
  "status": "pending",
  "round": 1
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": { /* Created AdExperiment */ }
}
```

### Update Experiment

`PATCH /api/experiments/:id`

**Request Body:** (all fields optional)
```json
{
  "status": "paused",
  "budget_total_usd": 150
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Updated AdExperiment */ }
}
```

---

## Ad Variants API

### List Ad Variants

`GET /api/experiments/:experimentId/variants`

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "ad_1731679200789_abc",
      "experiment_id": "exp_123",
      "product_id": "pc_123",
      "platform": "meta",
      "meta_campaign_id": "123456789",
      "meta_adset_id": "987654321",
      "meta_ad_id": "555555555",
      "headline": "Transform Your Workspace with AI",
      "body": "Stay focused and productive with smart ambient assistance...",
      "image_url": "https://fal.ai/image123.png",
      "cta": "Sign Up",
      "status": "active",
      "created_by": "agent",
      "created_at": "2025-11-15T14:00:00Z",
      "updated_at": "2025-11-15T14:00:00Z"
    }
  ]
}
```

### Create Ad Variant

`POST /api/experiments/:experimentId/variants`

**Request Body:**
```json
{
  "product_id": "pc_123",
  "platform": "meta",
  "headline": "Transform Your Workspace with AI",
  "body": "Stay focused and productive with smart ambient assistance...",
  "image_url": "https://fal.ai/image123.png",
  "cta": "Sign Up",
  "status": "draft",
  "created_by": "agent"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": { /* Created AdVariant */ }
}
```

---

## Leads API

### Ingest Lead

`POST /api/leads`

**Request Body:**
```json
{
  "product_id": "pc_123",
  "ad_id": "ad_789",
  "source": "meta_lead_form",
  "email": "user@example.com",
  "name": "John Doe",
  "raw_form_data": {
    "phone": "+1234567890",
    "interest": "high"
  }
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "lead_1731679201111_xyz",
    "product_id": "pc_123",
    "ad_id": "ad_789",
    "source": "meta_lead_form",
    "email": "user@example.com",
    "name": "John Doe",
    "raw_form_data": { ... },
    "created_at": "2025-11-15T14:00:00Z"
  }
}
```

### Get Lead

`GET /api/leads/:id`

**Response:**
```json
{
  "success": true,
  "data": { /* Lead */ }
}
```

### List Leads

`GET /api/leads?product_id=pc_123`
`GET /api/leads?ad_id=ad_789`

**Query Parameters:**
- `product_id` OR `ad_id` (required): Filter by product or ad

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [ /* Array of Leads */ ]
}
```

---

## Metrics API

*(Note: Metrics endpoints are nested under experiments/variants)*

### Record Metrics

`POST /api/experiments/:experimentId/variants/:variantId/metrics`

**Request Body:**
```json
{
  "impressions": 10000,
  "clicks": 250,
  "leads": 25,
  "spend_usd": 50.00
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "ams_1731679202222_xyz",
    "ad_id": "ad_789",
    "pulled_at": "2025-11-15T14:00:00Z",
    "impressions": 10000,
    "clicks": 250,
    "leads": 25,
    "spend_usd": 50.00,
    "ctr": 0.025,
    "cpl_usd": 2.00,
    "cpc_usd": 0.20
  }
}
```

### Get Metrics History

`GET /api/experiments/:experimentId/variants/:variantId/metrics`

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [ /* Array of AdMetricsSnapshot, sorted by pulled_at */ ]
}
```

### Get Latest Metrics

`GET /api/experiments/:experimentId/variants/:variantId/metrics/latest`

**Response:**
```json
{
  "success": true,
  "data": { /* Most recent AdMetricsSnapshot */ }
}
```

---

## Status Codes

- `200 OK`: Successful GET/PATCH/DELETE
- `201 Created`: Successful POST
- `400 Bad Request`: Invalid request body or query parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## Error Examples

### Validation Error
```json
{
  "success": false,
  "error": "Failed to create product",
  "message": "Invalid input: title is required"
}
```

### Not Found
```json
{
  "success": false,
  "error": "Product not found"
}
```

---

## Rate Limits

*(Not implemented in hackathon MVP)*

In production, rate limits would be:
- 100 requests/minute per IP for public endpoints
- 1000 requests/minute for authenticated service accounts

---

## Webhooks

*(Not implemented in Track A)*

Track D (Meta Ads Integration) handles webhook subscriptions for:
- Lead form submissions
- Ad performance updates

---

## SDK & Client Libraries

Coming soon:
- TypeScript/JavaScript SDK
- Python SDK

For now, use standard HTTP clients:

```typescript
// TypeScript example
const response = await fetch('http://localhost:8787/api/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'AI Desk Buddy',
    // ...
  })
});

const result = await response.json();
```

---

## Support

For issues or questions:
- GitHub Issues: [repo link]
- Raindrop Docs: https://raindrop.dev/docs
