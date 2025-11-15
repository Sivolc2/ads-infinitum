# Freelancer.com API Example

This example demonstrates how to use the Freelancer.com API to search for projects, post jobs, and monitor project activity.

## Features

- **Authentication**: Connect to Freelancer API with API key
- **Search Projects**: Find projects by keywords, budget, and skills
- **Get Project Details**: Fetch detailed information about specific projects
- **Post Jobs**: Create new project listings (requires special permissions)
- **Monitor Projects**: Track project updates and bid activity in real-time

## Setup

1. Get your API key from [Freelancer.com API](https://www.freelancer.com/api)
   - Sign in to your account
   - Go to https://accounts.freelancer.com/settings/develop
   - Create a new application or use existing credentials

2. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Add your API key to the `.env` file:
   ```
   FREELANCER_API_KEY=your_actual_api_key_here
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Run all examples:
```bash
npm run dev
```

### Search for projects:
```bash
npm run search
```

### Post a job example:
```bash
npm run post
```

### Build and run:
```bash
npm run build
npm start
```

## What Each Example Does

### `example.ts` - Complete Demo
Demonstrates all core functionality:
- Get authenticated user info
- Search for projects by keyword
- Get detailed project information
- Fetch available job categories

### `search-example.ts` - Advanced Search
Shows different ways to search for projects:
- Search by budget range
- Search by required skills
- Filter by multiple criteria

### `post-job-example.ts` - Job Posting & Monitoring
Demonstrates:
- Preparing job data with proper format
- Posting a new project (requires permissions)
- Monitoring project for bid updates

## API Features Used

### Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/users/0.1/self` | Get current user info |
| `/projects/0.1/projects/active` | Search active projects |
| `/projects/0.1/projects` | Get project details, post new projects |
| `/projects/0.1/jobs` | Get available job categories/skills |

### Search Parameters

- `query`: Keyword search
- `min_budget`, `max_budget`: Budget range filter
- `jobs[]`: Filter by skill/category IDs
- `limit`, `offset`: Pagination

## Integration Example

Here's how to integrate into your ad-to-hardware pipeline:

```typescript
import { FreelancerClient } from './lib/freelancer.js';

const client = new FreelancerClient();

// When ad validation shows demand for a product concept:
async function findManufacturingHelp(productName: string, budget: number) {
  const projects = await client.searchProjects({
    query: `hardware manufacturing ${productName}`,
    max_budget: budget,
    limit: 20
  });

  // Filter for relevant freelancers
  return projects.filter(p =>
    p.bid_stats && p.bid_stats.bid_count > 3
  );
}

// Or post a job for hardware prototyping:
async function postPrototypeJob(productSpecs: any) {
  const categories = await client.getJobCategories();
  const hardware = categories.find(c =>
    c.name.includes('Electronics') || c.name.includes('Engineering')
  );

  await client.postJob({
    title: `Prototype ${productSpecs.name}`,
    description: productSpecs.description,
    currency: 'USD',
    budget: { minimum: 1000, maximum: 5000 },
    jobs: hardware ? [hardware.id] : []
  });
}
```

## Important Notes

### About Posting Jobs

⚠️ **Posting projects requires elevated API permissions:**

1. Most API keys only have read access by default
2. To post jobs, you need to apply for elevated access at https://www.freelancer.com/api
3. Alternatively, use the web interface: https://www.freelancer.com/post-project

The example code shows how posting would work, but it will likely fail with a 403 error unless you have the right permissions.

### Sandbox Environment

For testing, use the Freelancer sandbox:

```env
FLN_URL=https://www.freelancer-sandbox.com
```

Note: You'll need separate sandbox credentials.

## Use Cases in Ads-to-Hardware Pipeline

1. **Demand Validation**: Search for existing projects similar to your validated ad concept
2. **Partner Discovery**: Find freelancers with relevant manufacturing/engineering skills
3. **Outsourcing**: Post jobs for prototype development, CAD design, or manufacturing setup
4. **Market Research**: Monitor project trends to identify high-demand product categories
5. **Bid Intelligence**: Track average costs for hardware development work

## Resources

- [Freelancer API Documentation](https://developers.freelancer.com/)
- [OAuth2 Authentication](https://developers.freelancer.com/docs/authentication)
- [Application Dashboard](https://accounts.freelancer.com/settings/develop)
- [API Forum](https://www.freelancer.com/community/developers)

## Troubleshooting

### Authentication Failed
- Token may be expired → get a new one from the dashboard
- Using client ID instead of access token → use OAuth2 flow

### Permission Denied (403)
- Your API key lacks required permissions
- Apply for elevated access at https://www.freelancer.com/api
- Use web interface for posting jobs instead

### Connection Timeout
- Check internet connection
- Try sandbox environment
- Verify API endpoint URL is correct

## Next Steps

After successful testing:

1. Integrate project search into your demand validation pipeline
2. Automate freelancer outreach for prototyping work
3. Build a dashboard to monitor relevant hardware projects
4. Create a bidding bot for manufacturing opportunities
5. Track market rates for hardware development work
