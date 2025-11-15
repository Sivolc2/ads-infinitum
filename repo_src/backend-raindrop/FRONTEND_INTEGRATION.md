# Frontend Integration Guide

## Backend Configuration for Frontend

The Ad Infinitum backend is configured to work with the frontend at `./repo_src/frontend/`.

### Backend Details
- **URL**: `http://localhost:8787`
- **CORS**: Enabled for all origins (configured for development)
- **API Base Path**: `/api` and `/internal`

### Frontend Configuration

The frontend at `./repo_src/frontend/` is configured to:
- Run on: `http://localhost:5173`
- Proxy API calls to: `http://localhost:8787`

### Starting Both Servers

#### Option 1: Separate Terminals
```bash
# Terminal 1 - Backend
cd backend-raindrop
npm run dev

# Terminal 2 - Frontend
cd repo_src/frontend
npm run dev
```

#### Option 2: Using Root Commands
```bash
# Backend
pnpm dev:raindrop

# Frontend (from root)
cd repo_src/frontend && npm run dev
```

### API Endpoints for Frontend

#### Track A: Core Data
```typescript
// Products
GET    /api/products              // List all products
POST   /api/products              // Create product
GET    /api/products/:id          // Get product
PATCH  /api/products/:id          // Update product
DELETE /api/products/:id          // Delete product

// Experiments
GET    /api/experiments?product_id=xxx  // List experiments
POST   /api/experiments                 // Create experiment
GET    /api/experiments/:id             // Get experiment
PATCH  /api/experiments/:id             // Update experiment
GET    /api/experiments/:id/variants    // List ad variants
POST   /api/experiments/:id/variants    // Create ad variant

// Leads
POST   /api/leads                 // Create lead
GET    /api/leads/:id             // Get lead
GET    /api/leads?product_id=xxx  // List by product
GET    /api/leads?ad_id=xxx       // List by ad
```

#### Track C: Ad Generation
```typescript
// Generate Ad Variants
POST /internal/generate-ad-variants
Body: {
  product_concept: ProductConcept,
  experiment_id?: string,
  num_variants?: number
}

// Test Data
POST /internal/test-product-concept  // Get sample product
GET  /internal/config                // Check backend status
GET  /internal/estimate-cost?num_variants=3
```

#### Track E: Landing Pages
```typescript
// Landing Pages
GET  /api/landing/:productId           // Get/create landing page
GET  /api/landing/id/:id               // Get by landing page ID
POST /api/landing/:id/like             // Like product
POST /api/landing/:id/dislike          // Dislike product
POST /api/landing/:id/pledge           // Create pledge
GET  /api/landing/:id/stats            // Get engagement stats
GET  /api/landing/:id/funding-progress // Get funding progress
GET  /api/landing/:id/pledges          // List all pledges
```

### Environment Variables

Frontend should configure these in `.env`:
```bash
VITE_API_URL=http://localhost:8787
```

Backend is already configured with:
```bash
LLM_PROVIDER=openrouter              # or 'raindrop'
IMAGE_PROVIDER=freepik               # or 'fal'
OPENROUTER_API_KEY=your_key_here     # Optional
FREEPIK_API_KEY=your_key_here        # Optional
```

### Sample API Calls from Frontend

#### Example 1: Create Product
```typescript
const response = await fetch('http://localhost:8787/api/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'SmartDesk Pro',
    tagline: 'Your AI workspace',
    description: 'AI-powered desk companion for remote workers',
    hypothesis: 'Remote workers need better focus tools',
    target_audience: 'Remote workers, 25-45'
  })
});

const product = await response.json();
// { success: true, data: { id: 'pc_xxx', ... } }
```

#### Example 2: Generate Ad Variants
```typescript
const response = await fetch('http://localhost:8787/internal/generate-ad-variants', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product_concept: product.data,
    num_variants: 3
  })
});

const result = await response.json();
// { success: true, variants: [...], generated_at: '...' }
```

#### Example 3: Create Landing Page
```typescript
const response = await fetch(`http://localhost:8787/api/landing/${productId}`);
const landingPage = await response.json();
// { success: true, data: { id: 'lp_xxx', ... } }
```

### TypeScript Types

Frontend can import or replicate these types:

```typescript
// From backend-raindrop/src/models/types.ts
interface ProductConcept {
  id: string;
  title: string;
  tagline: string;
  description: string;
  hypothesis: string;
  target_audience: string;
  status: "draft" | "testing" | "validated" | "killed" | "handoff";
  created_by: "agent" | "human";
  created_at: string;
  updated_at: string;
}

interface AdVariant {
  id: string;
  experiment_id: string;
  product_id: string;
  platform: "meta";
  headline: string;
  body: string;
  image_url: string;
  cta: string;
  status: "draft" | "active" | "paused" | "deleted";
  created_by: "agent" | "human";
  created_at: string;
  updated_at: string;
}

interface LandingPage {
  id: string;
  product_id: string;
  lovable_url?: string;
  hero_image_url: string;
  gallery_image_urls: string[];
  pitch_markdown: string;
  estimate_cost_to_deliver_usd?: number;
  call_to_action: string;
  likes_count: number;
  dislikes_count: number;
  created_at: string;
  updated_at: string;
}
```

### CORS Configuration

Backend CORS is configured in `src/api/index.ts`:
```typescript
app.use('*', cors({
  origin: '*',  // Allows all origins for development
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));
```

For production, update to:
```typescript
origin: 'https://your-frontend-domain.com'
```

### Testing Backend from Frontend

Use this utility to test backend connectivity:

```typescript
// utils/api.ts
export async function testBackendConnection() {
  try {
    const response = await fetch('http://localhost:8787/health');
    const data = await response.json();
    console.log('✅ Backend connected:', data);
    return true;
  } catch (error) {
    console.error('❌ Backend connection failed:', error);
    return false;
  }
}

// Check on app load
testBackendConnection();
```

### Error Handling

Backend returns consistent error format:
```typescript
{
  success: false,
  error: 'Error type',
  message: 'Detailed error message'
}
```

Frontend should handle:
```typescript
async function apiCall(url: string, options: RequestInit) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || data.error);
  }

  return data;
}
```

### Development Workflow

1. **Start Backend**: Runs on port 8787 with mock data storage
2. **Start Frontend**: Runs on port 5173, proxies API to backend
3. **Hot Reload**: Both support hot reload during development
4. **State**: Backend uses in-memory storage (resets on restart)

### No Dependencies on aimi_creative_lab_superpowers_demo

✅ **Confirmed**: Backend has **zero dependencies** on `aimi_creative_lab_superpowers_demo`
- No imports
- No path references
- No configuration dependencies
- Fully standalone

The frontend being built at `./repo_src/frontend/` will work seamlessly with the backend.

### Quick Start Checklist

For frontend developers:

- [ ] Backend running on `http://localhost:8787`
- [ ] Test `/health` endpoint returns 200 OK
- [ ] Test `/internal/config` shows provider status
- [ ] Frontend configured to proxy to port 8787
- [ ] CORS working (no preflight errors)
- [ ] Can create products via `/api/products`
- [ ] Can generate ads via `/internal/generate-ad-variants`

### Support

If frontend has integration issues:
1. Check backend logs in terminal
2. Verify CORS headers in browser devtools
3. Test endpoints with `curl` first
4. Check `TESTING_RESULTS.md` for backend status
5. Review `INTEGRATION.md` for complete API docs
