# Ad Infinitum - Frontend Interface

A comprehensive dashboard for the Ad Infinitum self-evolving product scout system.

## Overview

This frontend provides a complete interface for managing and monitoring:

- **Product Concepts**: AI-generated product ideas being tested
- **Ad Experiments**: Meta ads campaigns with performance tracking
- **Ad Variants**: Individual ad creatives with detailed metrics
- **Landing Pages**: Kickstarter-style pages for validated products
- **Leads & Profiles**: AI-enriched user data with sentiment analysis
- **Build Contracts**: Handoff specifications for freelancer platforms

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **React Router** for navigation
- **Recharts** for data visualization
- **date-fns** for date formatting
- Modern CSS with CSS Variables

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
cd repo_src/frontend
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

### Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

## Project Structure

```
src/
├── components/          # Reusable components
│   └── Layout.tsx      # Main layout with sidebar navigation
├── pages/              # Page components
│   ├── Dashboard.tsx   # Overview with key metrics
│   ├── Products.tsx    # Product concepts management
│   ├── Experiments.tsx # Ad experiments tracking
│   ├── AdVariants.tsx  # Ad variants with metrics
│   ├── LandingPages.tsx # Landing pages viewer
│   ├── Leads.tsx       # Leads and user profiles
│   └── BuildContracts.tsx # Build handoff specs
├── services/           # API and services
│   └── api.ts         # API client
├── styles/            # CSS files
│   ├── Global.css     # Global styles and variables
│   ├── Layout.css     # Layout styles
│   ├── Dashboard.css  # Dashboard page styles
│   └── ...           # Page-specific styles
├── types/             # TypeScript types
│   └── index.ts      # Data contracts from v1-design.md
├── App.tsx            # Main app with routing
└── main.tsx          # Entry point
```

## Key Features

### Dashboard
- Real-time statistics overview
- Quick links to all sections
- System flow visualization

### Product Concepts
- Grid view of all product ideas
- Status filtering (draft, testing, validated, killed, handoff)
- Key metrics per product (experiments, leads, CPL, spend)
- Links to experiments and landing pages

### Ad Experiments
- List of all experiments with detailed metrics
- Status tracking and filtering
- Budget and threshold information
- Success indicators when targets are hit

### Ad Variants
- Visual grid of ad creatives
- Performance metrics (impressions, clicks, leads, CTR, CPL)
- Image preview with modal for details
- Status management (active, paused, deleted)

### Landing Pages
- Kickstarter-style product pages
- Hero images and galleries
- Cost estimates
- Like/dislike feedback
- CTA tracking

### Leads & Profiles
- Table view of all captured leads
- AI-enriched profiles with:
  - Interest level
  - Sentiment analysis
  - Segments and problem tags
  - Feature requests
- Source tracking (Meta vs. Landing Page)

### Build Contracts
- Handoff specifications for validated products
- Platform selection (Freelancer.com, Upwork)
- Budget and timeline tracking
- Full markdown specifications
- Job posting status

## Design System

### Color Palette

- **Primary**: Purple gradient (#667eea → #764ba2)
- **Success**: Green (#10b981)
- **Warning**: Orange (#f59e0b)
- **Danger**: Red (#ef4444)
- **Info**: Blue (#3b82f6)

### Typography

- **Font Family**: System font stack (SF Pro, Segoe UI, etc.)
- **Headings**: Bold, high contrast
- **Body**: Medium weight, readable line height

### Components

All components follow a consistent design language:
- Dark theme optimized for extended use
- Hover effects for interactivity
- Smooth transitions
- Responsive grid layouts
- Accessible focus states

## API Integration

The frontend expects a REST API at `/api` (configurable via `VITE_API_BASE_URL`) with these endpoints:

### Products
- `GET /products` - List all products with metrics
- `GET /products/:id` - Get single product
- `POST /products` - Create product
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product

### Experiments
- `GET /experiments?product_id=:id` - List experiments
- `GET /experiments/:id` - Get experiment
- `POST /experiments` - Create experiment
- `PUT /experiments/:id` - Update experiment

### Ad Variants
- `GET /ad-variants?experiment_id=:id` - List variants
- `GET /ad-variants/:id` - Get variant
- `POST /ad-variants` - Create variant
- `PUT /ad-variants/:id` - Update variant

### Metrics
- `GET /metrics?ad_id=:id` - Get metrics history
- `GET /metrics/latest?ad_id=:id` - Get latest metrics

### Landing Pages
- `GET /landing-pages?product_id=:id` - List pages
- `GET /landing-pages/:id` - Get page
- `PUT /landing-pages/:id` - Update page (likes/dislikes)

### Leads
- `GET /leads?product_id=:id` - List leads
- `GET /leads/:id` - Get lead
- `GET /user-profiles?lead_id=:id` - Get profiles

### Build Contracts
- `GET /build-contracts?product_id=:id` - List contracts
- `GET /build-contracts/:id` - Get contract
- `POST /build-contracts` - Create contract

### Dashboard
- `GET /dashboard/stats` - Get overview statistics

## Development Notes

### Type Safety

All data structures are typed according to the contracts in `v1-design.md`. See `src/types/index.ts` for the complete type definitions.

### State Management

Currently using React's built-in state management with hooks. For more complex state needs, consider adding:
- React Query / TanStack Query for server state
- Zustand or Redux for global client state

### Testing

To add tests:

```bash
npm run test
```

Uses Vitest (configured but no tests yet).

### Linting

```bash
npm run lint
```

## Browser Support

- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions

## License

See main project LICENSE file.

## Related Documentation

- [v1-design.md](../../docs/guides/v1-design.md) - System architecture and data contracts
- [Backend README](../backend/README_backend.md) - Backend API documentation
