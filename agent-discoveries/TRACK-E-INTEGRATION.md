# Track E Integration Guide

This document explains how the agent-discoveries Lovable app integrates with the Track E backend for dynamic product landing pages.

## Overview

The integration allows you to create new product pages that automatically fetch data from the Track E backend API. If the API is unavailable, pages fall back to mock data so you can develop and test without the backend running.

## Architecture

```
Track E Backend (backend-raindrop)
      ↓
   API Call (with fallback)
      ↓
  ProductPage Component
      ↓
  Rendered Landing Page
```

## Files Created

### 1. Type Definitions
**File:** `src/types/landing-page.ts`

Defines TypeScript interfaces matching the Track E backend schema:
- `LandingPage` - Main landing page data
- `Pledge` - Funding pledge data
- `AdExperiment` - Ad variant experiment data
- `LandingPageStats` - Engagement metrics
- `FundingProgress` - Funding progress data

### 2. Data Fetching Layer
**File:** `src/lib/landing-page-data.ts`

Functions for fetching data from Track E backend:

**Main Functions:**
- `getLandingPageForProduct(productId)` - Fetches or creates landing page
- `getAdExperiments(productId)` - Gets ad variant data (currently mock, pending Track D)
- `getLandingPageStats(landingPageId)` - Gets engagement stats
- `getFundingProgress(landingPageId)` - Gets funding progress
- `recordLike(landingPageId)` - Records a like
- `recordDislike(landingPageId)` - Records a dislike
- `createPledge(landingPageId, pledge)` - Creates a funding pledge

**Fallback Behavior:**
All functions try the Track E API first, then fall back to mock data if:
- API is unreachable
- API returns an error
- Network request fails

### 3. Generic Product Page Component
**File:** `src/components/ProductPage.tsx`

Reusable component that renders a product landing page from Track E data:

**Features:**
- Fetches data on mount
- Loading state
- Error handling
- Parses markdown pitch into sections
- Displays ad experiments in grid
- Highlights winning variant
- Multiple CTA sections

### 4. Example Page
**File:** `src/pages/TestProduct.tsx`

Example usage showing how to create a new product page:

```tsx
import ProductPage from "@/components/ProductPage";

const TestProduct = () => {
  return <ProductPage productId="pc_test_123" />;
};
```

## Adding New Products

### Option 1: Create a New Page File (Recommended)

1. Create a new page file in `src/pages/`:
   ```tsx
   // src/pages/MyNewProduct.tsx
   import ProductPage from "@/components/ProductPage";

   const MyNewProduct = () => {
     return <ProductPage productId="pc_your_product_id" />;
   };

   export default MyNewProduct;
   ```

2. Add route in `src/App.tsx`:
   ```tsx
   import MyNewProduct from "./pages/MyNewProduct";

   // In routes:
   <Route path="/my-new-product" element={<MyNewProduct />} />
   ```

3. Add to product gallery in `src/pages/Index.tsx`:
   ```tsx
   {
     id: 5,
     title: "My New Product",
     description: "Product description",
     image: myProductImage,
     cpl: "$2.50",
     targetPrice: "$29",
     targetAudience: "Target audience",
     link: "/my-new-product",
     available: true
   }
   ```

### Option 2: Use Dynamic Routes (Future Enhancement)

Could create a single route with product ID parameter:
```tsx
<Route path="/product/:productId" element={<DynamicProduct />} />
```

## Environment Configuration

Create `.env` file (copy from `.env.example`):

```bash
# Track E Backend API URL
VITE_TRACK_E_API_URL=http://localhost:8787
```

**Default:** If not set, defaults to `http://localhost:8787`

## Running the App

### With Track E Backend

1. Start the Track E backend:
   ```bash
   cd ../repo_src/backend-raindrop
   npm run dev
   ```

2. Start the frontend:
   ```bash
   cd agent-discoveries
   npm run dev
   ```

3. Visit: http://localhost:8080/test-product

The page will fetch real data from Track E API.

### Without Track E Backend (Mock Mode)

1. Just start the frontend:
   ```bash
   npm run dev
   ```

2. Visit: http://localhost:8080/test-product

The page will use mock data. Console will show:
```
Track E API unavailable, using mock data: [error]
```

## Data Flow Example

### Real Data (Backend Running)

1. User visits `/test-product`
2. `ProductPage` component mounts
3. Calls `getLandingPageForProduct("pc_test_123")`
4. Fetches from `http://localhost:8787/api/landing/pc_test_123`
5. Backend returns landing page data (or creates if doesn't exist)
6. Component renders with real data

### Mock Data (Backend Not Running)

1. User visits `/test-product`
2. `ProductPage` component mounts
3. Calls `getLandingPageForProduct("pc_test_123")`
4. Fetch fails (connection refused)
5. Returns mock data with placeholder values
6. Component renders with mock data
7. Console shows warning

## Track E API Endpoints Used

Based on `backend-raindrop/TRACK-E-README.md`:

- `GET /api/landing/:productId` - Get/create landing page
- `GET /api/landing/id/:id` - Get by landing page ID
- `GET /api/landing/:id/stats` - Get engagement stats
- `GET /api/landing/:id/funding-progress` - Get funding progress
- `POST /api/landing/:id/like` - Record like
- `POST /api/landing/:id/dislike` - Record dislike
- `POST /api/landing/:id/pledge` - Create pledge

## Ad Experiment Data

Currently uses mock ad experiments because Track D integration is pending.

**TODO:** Connect to Track D API:
```typescript
// In src/lib/landing-page-data.ts
export async function getAdExperiments(productId: string) {
  // Replace with Track D API call
  const response = await fetch(`${TRACK_D_API}/api/ad-variants/${productId}`);
  return response.json();
}
```

## Pitch Markdown Parsing

The component parses `pitch_markdown` from Track E:

**Input:**
```markdown
# Product Title

Product description

## How It Works

Details about the product

## Key Features

- Feature 1
- Feature 2
```

**Output:**
- Hero section: Title + first paragraph
- Sections: Remaining ## headers become sections
- Lists: Detected and rendered as bullet points

## Customization

### Styling
Product pages use the same design system as existing pages:
- Tailwind classes
- shadcn/ui components
- Theme colors (`brand`, `foreground`, `muted-foreground`)

### Layout
To customize the layout, edit `src/components/ProductPage.tsx`:
- Add/remove sections
- Change grid layouts
- Modify CTA placements
- Adjust responsive breakpoints

## Troubleshooting

### "Product Not Found" Error
- Check that `productId` is correct
- Verify Track E backend is running
- Check backend logs for errors

### Images Not Loading
- Ensure `hero_image_url` is accessible
- Check CORS settings on image host
- Verify gallery images are valid URLs

### Mock Data Always Shows
- Check `.env` has correct `VITE_TRACK_E_API_URL`
- Verify backend is running on that URL
- Check browser console for network errors

### Ad Experiments Missing
- This is expected - Track D integration pending
- Mock experiments will show as placeholder

## Next Steps

1. **Connect Track D** - Replace mock ad experiments with real data
2. **Add Interactions** - Wire up like/dislike/pledge buttons
3. **Dynamic Routes** - Use URL params instead of separate files
4. **Image Management** - Integrate with image upload/storage
5. **Real-time Updates** - Add WebSocket for live metrics

## Contract Summary

The integration expects Track E to provide:

```typescript
interface LandingPage {
  id: string;
  product_id: string;
  lovable_url: string;
  hero_image_url: string;
  gallery_image_urls: string[];
  pitch_markdown: string;
  estimate_cost_to_deliver_usd?: number;
  call_to_action: string;
  likes_count: number;
  dislikes_count: number;
  pledge_count: number;
  pledge_total_usd: number;
  funding_goal_usd?: number;
  created_at: string;
  updated_at: string;
}
```

See `src/types/landing-page.ts` for complete type definitions.
