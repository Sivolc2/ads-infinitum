// Main API entry point for Ad Infinitum backend
// Track A: Backend Core + Track C: Ad Creation Engine

import { Service } from '@liquidmetal-ai/raindrop-framework';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Track C imports
import { generateAdVariants, estimateGenerationCost } from '../services/ad-variant-generator';
import {
  GenerateAdVariantsRequest,
  GenerateAdVariantsResponse,
} from '../models/types';

// Track A imports
import { ProductService } from '../services/product-service';
import { AdExperimentManager } from '../services/experiment-service';
import { MetricsCollectorService } from '../services/metrics-service';
import { LeadIngestionService } from '../services/lead-service';
import { LandingPageService } from '../services/landing-page-service';
import { BuildContractService } from '../services/build-contract-service';
import { generateProductConcept } from '../services/ai-product-generator';

import {
  ProductConcept,
  CreateProductConceptSchema,
  UpdateProductConceptSchema,
  CreateAdExperimentSchema,
  UpdateAdExperimentSchema,
  CreateAdVariantSchema,
  UpdateAdVariantSchema,
  CreateAdMetricsSnapshotSchema,
  CreateLeadSchema,
} from '../models';

import {
  CreateBuildContractSchema,
  UpdateBuildContractSchema,
} from '../models/build-contract';

import {
  CreatePledgeSchema,
} from '../models/landing-page';

// Define environment bindings
interface Env {
  // LLM Provider (toggleable)
  LLM_PROVIDER?: string;  // 'raindrop' or 'openrouter' (default: 'raindrop')
  OPENROUTER_API_KEY?: string;  // Only needed if LLM_PROVIDER='openrouter'

  // Image Provider (toggleable)
  IMAGE_PROVIDER?: string;  // 'freepik' or 'fal' (default: 'freepik')
  FREEPIK_API_KEY?: string;  // For Freepik image generation
  FAL_KEY?: string;  // For fal.ai image generation

  // Track A Raindrop bindings
  AD_DATA: any;  // SmartBucket or SmartSQL
  APP_CACHE: any;  // KV Cache
  LEAD_INGESTION: any;  // Queue
  AI: any;  // Raindrop AI
}

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*',  // TODO: Restrict in production
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ===== Health Check =====
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'Ad Infinitum Backend (Track A + C)',
    timestamp: new Date().toISOString()
  });
});

// ===== Dashboard Stats =====
app.get('/api/dashboard/stats', async (c) => {
  try {
    const productService = new ProductService(c.env.AD_DATA, c.env.APP_CACHE);

    // Get all products
    const products = await productService.list();

    // Count products by status
    const productsByStatus = products.reduce((acc: any, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});

    // Get all experiments across all products
    const experimentManager = new AdExperimentManager(c.env.AD_DATA, c.env.APP_CACHE);
    const allExperiments = [];

    for (const product of products) {
      const experiments = await experimentManager.listExperimentsByProduct(product.id);
      allExperiments.push(...experiments);
    }

    // Count experiments by status
    const experimentsByStatus = allExperiments.reduce((acc: any, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    }, {});

    return c.json({
      success: true,
      data: {
        products: {
          total: products.length,
          byStatus: productsByStatus
        },
        experiments: {
          total: allExperiments.length,
          byStatus: experimentsByStatus
        },
        leads: {
          total: 0 // TODO: Implement lead counting
        }
      }
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to load dashboard stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// =====================================================
// TRACK A: BACKEND CORE API ENDPOINTS
// =====================================================

// ===== PRODUCT ENDPOINTS =====

app.get('/api/products', async (c) => {
  try {
    const status = c.req.query('status') as any;
    const productService = new ProductService(c.env.AD_DATA, c.env.APP_CACHE);
    const products = await productService.list(status ? { status } : undefined);

    // Add metrics to each product (default to 0 for new products)
    const productsWithMetrics = products.map(product => ({
      ...product,
      total_experiments: 0,
      total_leads: 0,
      avg_cpl_usd: 0,
      total_spend_usd: 0
    }));

    return c.json({ success: true, count: productsWithMetrics.length, data: productsWithMetrics });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to list products',
      message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.get('/api/products/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const productService = new ProductService(c.env.AD_DATA, c.env.APP_CACHE);
    const product = await productService.get(id);
    if (!product) return c.json({ success: false, error: 'Product not found' }, 404);
    return c.json({ success: true, data: product });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to get product',
      message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.post('/api/products', async (c) => {
  try {
    const body = await c.req.json();
    const validated = CreateProductConceptSchema.parse(body);
    const productService = new ProductService(c.env.AD_DATA, c.env.APP_CACHE);
    const product = await productService.create(validated);
    return c.json({ success: true, data: product }, 201);
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create product',
      message: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});

app.patch('/api/products/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const validated = UpdateProductConceptSchema.parse({ ...body, id });
    const productService = new ProductService(c.env.AD_DATA, c.env.APP_CACHE);
    const product = await productService.update(validated);
    if (!product) return c.json({ success: false, error: 'Product not found' }, 404);
    return c.json({ success: true, data: product });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to update product',
      message: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});

app.delete('/api/products/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const productService = new ProductService(c.env.AD_DATA, c.env.APP_CACHE);
    const success = await productService.delete(id);
    if (!success) return c.json({ success: false, error: 'Product not found' }, 404);
    return c.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to delete product',
      message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ===== AI PRODUCT GENERATION ENDPOINT =====

app.post('/api/ai/generate-product', async (c) => {
  try {
    // Get configuration from environment
    const llmProvider = c.env.LLM_PROVIDER || 'raindrop';
    const useRaindrop = llmProvider.toLowerCase() === 'raindrop';
    const openrouterApiKey = c.env.OPENROUTER_API_KEY;

    // Check LLM provider requirements
    if (useRaindrop && !c.env.AI) {
      return c.json({
        success: false,
        error: 'Raindrop AI not available. Set LLM_PROVIDER=openrouter to use OpenRouter instead.'
      }, 500);
    }

    if (!useRaindrop && !openrouterApiKey) {
      return c.json({
        success: false,
        error: 'OPENROUTER_API_KEY must be configured when LLM_PROVIDER=openrouter'
      }, 500);
    }

    console.log(`🤖 Generating AI product concept using ${useRaindrop ? 'Raindrop AI' : 'OpenRouter'}...`);

    // Generate product concept using AI
    const product = await generateProductConcept({
      openrouterApiKey,
      raindropAI: useRaindrop ? c.env.AI : undefined,
      useRaindrop
    });

    // Save the product to storage
    const productService = new ProductService(c.env.AD_DATA, c.env.APP_CACHE);
    const savedProduct = await productService.create({
      title: product.title,
      tagline: product.tagline,
      description: product.description,
      hypothesis: product.hypothesis,
      target_audience: product.target_audience,
      status: 'draft',
      created_by: 'agent'
    });

    console.log(`✅ Generated product: ${savedProduct.title}`);

    return c.json({
      success: true,
      product: savedProduct
    }, 201);

  } catch (error) {
    console.error('❌ Error generating product:', error);
    return c.json({
      success: false,
      error: 'Failed to generate product',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// ===== EXPERIMENT ENDPOINTS =====

app.get('/api/experiments', async (c) => {
  try {
    const productId = c.req.query('product_id');
    const experimentManager = new AdExperimentManager(c.env.AD_DATA, c.env.APP_CACHE);

    if (productId) {
      // Get experiments for a specific product
      const experiments = await experimentManager.listExperimentsByProduct(productId);
      return c.json({ success: true, count: experiments.length, data: experiments });
    } else {
      // Get all experiments across all products
      const productService = new ProductService(c.env.AD_DATA, c.env.APP_CACHE);
      const products = await productService.list();
      const allExperiments = [];

      for (const product of products) {
        const experiments = await experimentManager.listExperimentsByProduct(product.id);
        allExperiments.push(...experiments);
      }

      return c.json({ success: true, count: allExperiments.length, data: allExperiments });
    }
  } catch (error) {
    return c.json({ success: false, error: 'Failed to list experiments',
      message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.get('/api/experiments/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const experimentManager = new AdExperimentManager(c.env.AD_DATA, c.env.APP_CACHE);
    const experiment = await experimentManager.getExperiment(id);
    if (!experiment) return c.json({ success: false, error: 'Experiment not found' }, 404);
    return c.json({ success: true, data: experiment });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to get experiment',
      message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.post('/api/experiments', async (c) => {
  try {
    const body = await c.req.json();
    const validated = CreateAdExperimentSchema.parse(body);
    const experimentManager = new AdExperimentManager(c.env.AD_DATA, c.env.APP_CACHE);
    const experiment = await experimentManager.createExperiment(validated);
    return c.json({ success: true, data: experiment }, 201);
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create experiment',
      message: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});

app.patch('/api/experiments/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const validated = UpdateAdExperimentSchema.parse({ ...body, id });
    const experimentManager = new AdExperimentManager(c.env.AD_DATA, c.env.APP_CACHE);
    const experiment = await experimentManager.updateExperiment(validated);
    if (!experiment) return c.json({ success: false, error: 'Experiment not found' }, 404);
    return c.json({ success: true, data: experiment });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to update experiment',
      message: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});

app.get('/api/experiments/:id/variants', async (c) => {
  try {
    const id = c.req.param('id');
    const experimentManager = new AdExperimentManager(c.env.AD_DATA, c.env.APP_CACHE);
    const variants = await experimentManager.listAdVariantsByExperiment(id);
    return c.json({ success: true, count: variants.length, data: variants });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to list variants',
      message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.post('/api/experiments/:id/variants', async (c) => {
  try {
    const experimentId = c.req.param('id');
    const body = await c.req.json();
    const validated = CreateAdVariantSchema.parse({ ...body, experiment_id: experimentId });
    const experimentManager = new AdExperimentManager(c.env.AD_DATA, c.env.APP_CACHE);
    const variant = await experimentManager.createAdVariant(validated);
    return c.json({ success: true, data: variant }, 201);
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create variant',
      message: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});

// ===== AD VARIANT ENDPOINTS =====

app.get('/api/ad-variants', async (c) => {
  try {
    const experimentId = c.req.query('experiment_id');
    const experimentManager = new AdExperimentManager(c.env.AD_DATA, c.env.APP_CACHE);

    if (experimentId) {
      // Get variants for a specific experiment
      const variants = await experimentManager.listAdVariantsByExperiment(experimentId);
      return c.json({ success: true, count: variants.length, data: variants });
    } else {
      // Get all variants across all experiments
      const productService = new ProductService(c.env.AD_DATA, c.env.APP_CACHE);
      const products = await productService.list();
      const allVariants = [];

      for (const product of products) {
        const experiments = await experimentManager.listExperimentsByProduct(product.id);
        for (const experiment of experiments) {
          const variants = await experimentManager.listAdVariantsByExperiment(experiment.id);
          allVariants.push(...variants);
        }
      }

      return c.json({ success: true, count: allVariants.length, data: allVariants });
    }
  } catch (error) {
    return c.json({ success: false, error: 'Failed to list ad variants',
      message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.get('/api/ad-variants/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const experimentManager = new AdExperimentManager(c.env.AD_DATA, c.env.APP_CACHE);
    const variant = await experimentManager.getAdVariant(id);
    if (!variant) return c.json({ success: false, error: 'Ad variant not found' }, 404);
    return c.json({ success: true, data: variant });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to get ad variant',
      message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.post('/api/ad-variants', async (c) => {
  try {
    const body = await c.req.json();
    const validated = CreateAdVariantSchema.parse(body);
    const experimentManager = new AdExperimentManager(c.env.AD_DATA, c.env.APP_CACHE);
    const variant = await experimentManager.createAdVariant(validated);
    return c.json({ success: true, data: variant }, 201);
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create ad variant',
      message: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});

app.patch('/api/ad-variants/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const validated = UpdateAdVariantSchema.parse({ ...body, id });
    const experimentManager = new AdExperimentManager(c.env.AD_DATA, c.env.APP_CACHE);
    const variant = await experimentManager.updateAdVariant(validated);
    if (!variant) return c.json({ success: false, error: 'Ad variant not found' }, 404);
    return c.json({ success: true, data: variant });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to update ad variant',
      message: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});

// ===== LEAD ENDPOINTS =====

app.post('/api/leads', async (c) => {
  try {
    const body = await c.req.json();
    const validated = CreateLeadSchema.parse(body);
    const leadService = new LeadIngestionService(c.env.AD_DATA, c.env.LEAD_INGESTION);
    const lead = await leadService.ingestLead(validated);
    return c.json({ success: true, data: lead }, 201);
  } catch (error) {
    return c.json({ success: false, error: 'Failed to ingest lead',
      message: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});

app.get('/api/leads/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const leadService = new LeadIngestionService(c.env.AD_DATA, c.env.LEAD_INGESTION);
    const lead = await leadService.getLead(id);
    if (!lead) return c.json({ success: false, error: 'Lead not found' }, 404);
    return c.json({ success: true, data: lead });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to get lead',
      message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.get('/api/leads', async (c) => {
  try {
    const productId = c.req.query('product_id');
    const adId = c.req.query('ad_id');
    const leadService = new LeadIngestionService(c.env.AD_DATA, c.env.LEAD_INGESTION);

    if (productId) {
      // Get leads for a specific product
      const leads = await leadService.listLeadsByProduct(productId);
      return c.json({ success: true, count: leads.length, data: leads });
    } else if (adId) {
      // Get leads for a specific ad
      const leads = await leadService.listLeadsByAd(adId);
      return c.json({ success: true, count: leads.length, data: leads });
    } else {
      // Get all leads across all products
      const productService = new ProductService(c.env.AD_DATA, c.env.APP_CACHE);
      const products = await productService.list();
      const allLeads = [];

      for (const product of products) {
        const leads = await leadService.listLeadsByProduct(product.id);
        allLeads.push(...leads);
      }

      // Sort by created_at descending
      allLeads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return c.json({ success: true, count: allLeads.length, data: allLeads });
    }
  } catch (error) {
    return c.json({ success: false, error: 'Failed to list leads',
      message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ===== AI AUTOMATION ENDPOINTS =====

/**
 * POST /api/ai/generate-product
 *
 * Generate a new product concept using AI
 */
app.post('/api/ai/generate-product', async (c) => {
  try {
    // Get configuration from environment
    const llmProvider = c.env.LLM_PROVIDER || 'raindrop';
    const useRaindrop = llmProvider.toLowerCase() === 'raindrop';
    const openrouterApiKey = c.env.OPENROUTER_API_KEY;

    console.log(`🤖 Generating AI product concept using ${useRaindrop ? 'Raindrop AI' : 'OpenRouter'}...`);

    // Generate product concept using AI (with fallback to mock for dev)
    const product = await generateProductConcept({
      openrouterApiKey,
      raindropAI: useRaindrop ? c.env.AI : undefined,
      useRaindrop
    });

    // Save the product to storage
    const productService = new ProductService(c.env.AD_DATA, c.env.APP_CACHE);
    const savedProduct = await productService.create({
      title: product.title,
      tagline: product.tagline,
      description: product.description,
      hypothesis: product.hypothesis,
      target_audience: product.target_audience,
      status: 'draft',
      created_by: 'agent'
    });

    console.log(`✅ Generated product: ${savedProduct.title}`);

    return c.json({
      success: true,
      product: savedProduct
    }, 201);

  } catch (error) {
    console.error('❌ Error generating product:', error);
    return c.json({
      success: false,
      error: 'Failed to generate product',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/ai/run-experiment
 *
 * Run a complete experiment: generate ads, create experiment, deploy to Meta
 */
app.post('/api/ai/run-experiment', async (c) => {
  try {
    const { product_id } = await c.req.json();

    if (!product_id) {
      return c.json({ success: false, error: 'product_id is required' }, 400);
    }

    const productService = new ProductService(c.env.AD_DATA, c.env.APP_CACHE);
    const experimentManager = new AdExperimentManager(c.env.AD_DATA, c.env.APP_CACHE);

    // Get product
    const product = await productService.get(product_id);
    if (!product) {
      return c.json({ success: false, error: 'Product not found' }, 404);
    }

    // Determine experiment round
    const existingExperiments = await experimentManager.listExperimentsByProduct(product_id);
    const round = existingExperiments.length + 1;

    // Create experiment
    const experiment = await experimentManager.createExperiment({
      product_id,
      round,
      platform: 'meta_ads',
      goal: 'leads',
      budget_per_day_usd: 50,
      budget_total_usd: 500,
      target_cpl_threshold_usd: 5,
      min_leads_for_decision: 10,
      status: 'pending',
    });

    // Generate ad variants
    const llmProvider = c.env.LLM_PROVIDER || 'raindrop';
    const useRaindrop = llmProvider.toLowerCase() === 'raindrop';
    const imageProvider = (c.env.IMAGE_PROVIDER || 'freepik') as 'freepik' | 'fal';
    const openrouterApiKey = c.env.OPENROUTER_API_KEY;
    const imageApiKey = imageProvider === 'freepik' ? c.env.FREEPIK_API_KEY : c.env.FAL_KEY;

    const variants = await generateAdVariants({
      productConcept: product,
      experimentId: experiment.id,
      numVariants: 3,
      openrouterApiKey,
      imageApiKey,
      imageProvider,
      raindropAI: useRaindrop ? c.env.AI : undefined,
      env: c.env,
    });

    // Update experiment status
    await experimentManager.updateExperiment({
      id: experiment.id,
      status: 'running',
    });

    // Update product status
    await productService.update({
      id: product_id,
      status: 'testing',
    });

    return c.json({
      success: true,
      experiment_id: experiment.id,
      num_variants: variants.length,
      estimated_cost: 2.5,
      budget_per_day: experiment.budget_per_day_usd,
      target_cpl: experiment.target_cpl_threshold_usd,
    });
  } catch (error) {
    console.error('Error running experiment:', error);
    return c.json({
      success: false,
      error: 'Failed to run experiment',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ===== LANDING PAGE ENDPOINTS =====

app.get('/api/landing-pages', async (c) => {
  try {
    const productId = c.req.query('product_id');

    if (productId) {
      // Get landing page for a specific product
      const productService = new ProductService(c.env.AD_DATA, c.env.APP_CACHE);
      const product = await productService.get(productId);

      if (!product) {
        return c.json({ success: false, error: 'Product not found' }, 404);
      }

      const landingPage = await landingPageService.getOrCreateForProduct(productId, product);
      return c.json({ success: true, count: 1, data: [landingPage] });
    } else {
      // Get all landing pages
      const productService = new ProductService(c.env.AD_DATA, c.env.APP_CACHE);
      const products = await productService.list();
      const landingPages = [];

      for (const product of products) {
        const page = await landingPageService.getOrCreateForProduct(product.id, product);
        landingPages.push(page);
      }

      return c.json({ success: true, count: landingPages.length, data: landingPages });
    }
  } catch (error) {
    return c.json({ success: false, error: 'Failed to list landing pages',
      message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.get('/api/landing-pages/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const landingPage = await landingPageService.get(id);

    if (!landingPage) {
      return c.json({ success: false, error: 'Landing page not found' }, 404);
    }

    return c.json({ success: true, data: landingPage });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to get landing page',
      message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.patch('/api/landing-pages/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    // Get existing landing page
    const existing = await landingPageService.get(id);
    if (!existing) {
      return c.json({ success: false, error: 'Landing page not found' }, 404);
    }

    // Update the landing page (this is a simple implementation, landingPageService doesn't have an update method)
    // For now, just return the existing page
    return c.json({ success: true, data: existing });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to update landing page',
      message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ===== USER PROFILE ENDPOINTS =====

app.get('/api/user-profiles', async (c) => {
  try {
    const leadId = c.req.query('lead_id');
    const leadService = new LeadIngestionService(c.env.AD_DATA, c.env.LEAD_INGESTION);

    if (leadId) {
      // Get profile for a specific lead
      const profile = await leadService.getUserProfileByLead(leadId);
      return c.json({ success: true, count: profile ? 1 : 0, data: profile ? [profile] : [] });
    } else {
      // Get all user profiles
      const listResult = await c.env.AD_DATA.list({
        prefix: 'user-profiles/',
        limit: 1000,
      });

      const profiles = [];
      for (const obj of listResult.objects) {
        const object = await c.env.AD_DATA.get(obj.key);
        if (object) {
          const data = JSON.parse(await object.text());
          profiles.push(data);
        }
      }

      // Sort by created_at descending
      profiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return c.json({ success: true, count: profiles.length, data: profiles });
    }
  } catch (error) {
    return c.json({ success: false, error: 'Failed to list user profiles',
      message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.get('/api/user-profiles/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const leadService = new LeadIngestionService(c.env.AD_DATA, c.env.LEAD_INGESTION);
    const profile = await leadService.getUserProfile(id);
    if (!profile) return c.json({ success: false, error: 'User profile not found' }, 404);
    return c.json({ success: true, data: profile });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to get user profile',
      message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ===== BUILD CONTRACT ENDPOINTS =====

app.get('/api/build-contracts', async (c) => {
  try {
    const productId = c.req.query('product_id');
    const status = c.req.query('status') as any;
    const buildContractService = new BuildContractService(c.env.AD_DATA);

    if (productId) {
      // Get contracts for a specific product
      const contracts = await buildContractService.listByProduct(productId);
      return c.json({ success: true, count: contracts.length, data: contracts });
    } else if (status) {
      // Get contracts by status
      const contracts = await buildContractService.listByStatus(status);
      return c.json({ success: true, count: contracts.length, data: contracts });
    } else {
      // Get all contracts
      const contracts = await buildContractService.list();
      return c.json({ success: true, count: contracts.length, data: contracts });
    }
  } catch (error) {
    return c.json({ success: false, error: 'Failed to list build contracts',
      message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.get('/api/build-contracts/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const buildContractService = new BuildContractService(c.env.AD_DATA);
    const contract = await buildContractService.get(id);
    if (!contract) return c.json({ success: false, error: 'Build contract not found' }, 404);
    return c.json({ success: true, data: contract });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to get build contract',
      message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.post('/api/build-contracts', async (c) => {
  try {
    const body = await c.req.json();
    const validated = CreateBuildContractSchema.parse(body);
    const buildContractService = new BuildContractService(c.env.AD_DATA);
    const contract = await buildContractService.create(validated);
    return c.json({ success: true, data: contract }, 201);
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create build contract',
      message: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});

app.patch('/api/build-contracts/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const validated = UpdateBuildContractSchema.parse({ ...body, id });
    const buildContractService = new BuildContractService(c.env.AD_DATA);
    const contract = await buildContractService.update(validated);
    if (!contract) return c.json({ success: false, error: 'Build contract not found' }, 404);
    return c.json({ success: true, data: contract });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to update build contract',
      message: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});

app.delete('/api/build-contracts/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const buildContractService = new BuildContractService(c.env.AD_DATA);
    const success = await buildContractService.delete(id);
    if (!success) return c.json({ success: false, error: 'Build contract not found' }, 404);
    return c.json({ success: true, message: 'Build contract deleted' });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to delete build contract',
      message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// =====================================================
// TRACK C: AD VARIANT GENERATION ENDPOINTS
// =====================================================

// ===== Track C: Ad Variant Generation Endpoint =====

/**
 * POST /internal/generate-ad-variants
 *
 * Generate complete ad variants (copy + images) for a product concept
 *
 * Request body:
 * {
 *   "product_concept": { ... ProductConcept object ... },
 *   "experiment_id": "exp_...",  // optional
 *   "num_variants": 3  // optional, default: 3
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "variants": [ ... AdVariant[] ... ],
 *   "generated_at": "2025-11-15T..."
 * }
 */
app.post('/internal/generate-ad-variants', async (c) => {
  try {
    // Parse request body
    const body = await c.req.json<GenerateAdVariantsRequest>();

    // Validate required fields
    if (!body.product_concept) {
      return c.json<GenerateAdVariantsResponse>({
        success: false,
        variants: [],
        generated_at: new Date().toISOString(),
        error: 'product_concept is required'
      }, 400);
    }

    const { product_concept, experiment_id, num_variants } = body;

    // Validate product concept has required fields
    if (!product_concept.title || !product_concept.description ||
        !product_concept.target_audience || !product_concept.hypothesis) {
      return c.json<GenerateAdVariantsResponse>({
        success: false,
        variants: [],
        generated_at: new Date().toISOString(),
        error: 'product_concept must have title, description, target_audience, and hypothesis'
      }, 400);
    }

    // Get configuration from environment
    const llmProvider = c.env.LLM_PROVIDER || 'raindrop';
    const useRaindrop = llmProvider.toLowerCase() === 'raindrop';
    const imageProvider = (c.env.IMAGE_PROVIDER || 'freepik') as 'freepik' | 'fal';
    const openrouterApiKey = c.env.OPENROUTER_API_KEY;
    const imageApiKey = imageProvider === 'freepik' ? c.env.FREEPIK_API_KEY : c.env.FAL_KEY;

    if (!imageApiKey) {
      return c.json<GenerateAdVariantsResponse>({
        success: false,
        variants: [],
        generated_at: new Date().toISOString(),
        error: `${imageProvider === 'freepik' ? 'FREEPIK_API_KEY' : 'FAL_KEY'} must be configured`
      }, 500);
    }

    // Check LLM provider requirements
    if (useRaindrop) {
      if (!c.env.AI) {
        return c.json<GenerateAdVariantsResponse>({
          success: false,
          variants: [],
          generated_at: new Date().toISOString(),
          error: 'Raindrop AI (env.AI) not available. Set LLM_PROVIDER=openrouter to use OpenRouter instead.'
        }, 500);
      }
      console.log(`📦 Generating ad variants using Raindrop AI (deepseek-r1) for: ${product_concept.title}`);
    } else {
      if (!openrouterApiKey) {
        return c.json<GenerateAdVariantsResponse>({
          success: false,
          variants: [],
          generated_at: new Date().toISOString(),
          error: 'OPENROUTER_API_KEY must be configured when LLM_PROVIDER=openrouter'
        }, 500);
      }
      console.log(`📦 Generating ad variants using OpenRouter for: ${product_concept.title}`);
    }

    // Generate ad variants with selected LLM and image providers
    const variants = await generateAdVariants({
      productConcept: product_concept,
      experimentId: experiment_id,
      numVariants: num_variants || 3,
      openrouterApiKey,
      imageApiKey,
      imageProvider,
      raindropAI: useRaindrop ? c.env.AI : undefined,
      env: c.env
    });

    // Return success response
    return c.json<GenerateAdVariantsResponse>({
      success: true,
      variants,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error generating ad variants:', error);

    return c.json<GenerateAdVariantsResponse>({
      success: false,
      variants: [],
      generated_at: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, 500);
  }
});

// ===== Cost Estimation Endpoint =====

/**
 * GET /internal/estimate-cost?num_variants=3
 *
 * Estimate the cost of generating ad variants
 * Useful for budgeting and planning
 */
app.get('/internal/estimate-cost', (c) => {
  const numVariants = parseInt(c.req.query('num_variants') || '3');

  if (isNaN(numVariants) || numVariants < 1 || numVariants > 10) {
    return c.json({
      error: 'num_variants must be between 1 and 10'
    }, 400);
  }

  const estimate = estimateGenerationCost(numVariants);

  return c.json({
    num_variants: numVariants,
    cost_breakdown: estimate,
    notes: [
      'LLM cost: Raindrop AI (deepseek-r1) or OpenRouter (Claude 3.5) for copy generation',
      'Image cost: Freepik text-to-image for ad creatives',
      'Costs are estimates and may vary based on actual usage and plan'
    ]
  });
});

// ===== Test/Debug Endpoints =====

/**
 * POST /internal/test-product-concept
 *
 * Create a test product concept for quick testing
 */
app.post('/internal/test-product-concept', (c) => {
  const testConcept: ProductConcept = {
    id: `pc_test_${Date.now()}`,
    title: 'AI Desk Companion',
    tagline: 'Your smart productivity partner',
    description: 'An AI-powered desk device that helps you stay focused, organized, and productive throughout your workday.',
    hypothesis: 'Remote workers struggle with distraction and task management. This product provides ambient AI assistance without being intrusive.',
    target_audience: 'Remote workers and digital nomads, ages 25-45, who value productivity and wellness',
    status: 'draft',
    created_by: 'human',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return c.json({
    success: true,
    product_concept: testConcept,
    message: 'Use this product_concept in your /internal/generate-ad-variants request'
  });
});

/**
 * GET /internal/config
 *
 * Check configuration status
 */
app.get('/internal/config', (c) => {
  const llmProvider = c.env.LLM_PROVIDER || 'raindrop';
  const useRaindrop = llmProvider.toLowerCase() === 'raindrop';

  const imageProvider = (c.env.IMAGE_PROVIDER || 'freepik');
  const useFreepik = imageProvider.toLowerCase() === 'freepik';

  return c.json({
    service: 'Ad Infinitum Backend (Tracks A + C + E)',
    version: '1.0.0',
    llm_provider: useRaindrop ? 'Raindrop AI (deepseek-r1)' : 'OpenRouter',
    image_provider: useFreepik ? 'Freepik' : 'fal.ai',
    environment: {
      llm_provider: llmProvider,
      image_provider: imageProvider,
      has_raindrop_ai: !!c.env.AI,
      has_openrouter_key: !!c.env.OPENROUTER_API_KEY,
      has_freepik_key: !!c.env.FREEPIK_API_KEY,
      has_fal_key: !!c.env.FAL_KEY,
      llm_status: useRaindrop
        ? (c.env.AI ? '✅ Raindrop AI available' : '❌ Raindrop AI not available')
        : (c.env.OPENROUTER_API_KEY ? '✅ OpenRouter configured' : '❌ OpenRouter key missing'),
      image_status: useFreepik
        ? (c.env.FREEPIK_API_KEY ? '✅ Freepik configured' : '❌ Freepik key missing')
        : (c.env.FAL_KEY ? '✅ fal.ai configured' : '❌ fal.ai key missing')
    },
    endpoints: [
      'POST /internal/generate-ad-variants - Generate ad variants',
      'GET /internal/estimate-cost - Estimate generation cost',
      'POST /internal/test-product-concept - Get test data',
      'GET /internal/config - This endpoint',
      'GET /health - Health check'
    ],
    notes: [
      'LLM: Set LLM_PROVIDER=raindrop (default) or openrouter',
      'Image: Set IMAGE_PROVIDER=freepik (default) or fal',
      'Raindrop AI uses deepseek-r1 model',
      'Freepik provides 1024x1024 images, fal.ai provides 1200x900'
    ]
  });
});

// =====================================================
// TRACK E: LANDING PAGE + FUNDING ENDPOINTS
// =====================================================

// Global landing page service instance (in-memory for demo)
const landingPageService = new LandingPageService();

/**
 * GET /api/landing/:productId
 *
 * Get or create landing page for a product
 */
app.get('/api/landing/:productId', async (c) => {
  try {
    const productId = c.req.param('productId');

    // Get product first
    const productService = new ProductService(c.env.AD_DATA, c.env.APP_CACHE);
    const product = await productService.get(productId);

    if (!product) {
      return c.json({
        success: false,
        error: 'Product not found'
      }, 404);
    }

    // Get or create landing page
    const landingPage = await landingPageService.getOrCreateForProduct(
      productId,
      product
    );

    return c.json({
      success: true,
      data: landingPage
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to get landing page',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/landing/id/:id
 *
 * Get landing page by ID (alternative endpoint)
 */
app.get('/api/landing/id/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const landingPage = await landingPageService.get(id);

    if (!landingPage) {
      return c.json({
        success: false,
        error: 'Landing page not found'
      }, 404);
    }

    return c.json({
      success: true,
      data: landingPage
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to get landing page',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/landing/:id/like
 *
 * Like a landing page
 */
app.post('/api/landing/:id/like', async (c) => {
  try {
    const id = c.req.param('id');
    const landingPage = await landingPageService.like(id);

    if (!landingPage) {
      return c.json({
        success: false,
        error: 'Landing page not found'
      }, 404);
    }

    return c.json({
      success: true,
      data: landingPage,
      message: 'Like recorded'
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to like landing page',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/landing/:id/dislike
 *
 * Dislike a landing page
 */
app.post('/api/landing/:id/dislike', async (c) => {
  try {
    const id = c.req.param('id');
    const landingPage = await landingPageService.dislike(id);

    if (!landingPage) {
      return c.json({
        success: false,
        error: 'Landing page not found'
      }, 404);
    }

    return c.json({
      success: true,
      data: landingPage,
      message: 'Dislike recorded'
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to dislike landing page',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /api/landing/:id/pledge
 *
 * Create a pledge for a landing page
 */
app.post('/api/landing/:id/pledge', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const validated = CreatePledgeSchema.parse(body);

    const pledge = await landingPageService.createPledge(id, validated);

    if (!pledge) {
      return c.json({
        success: false,
        error: 'Landing page not found'
      }, 404);
    }

    // Get updated landing page
    const landingPage = await landingPageService.get(id);

    return c.json({
      success: true,
      data: {
        pledge,
        landing_page: landingPage
      },
      message: 'Pledge recorded'
    }, 201);
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to create pledge',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 400);
  }
});

/**
 * GET /api/landing/:id/stats
 *
 * Get stats for a landing page
 */
app.get('/api/landing/:id/stats', async (c) => {
  try {
    const id = c.req.param('id');
    const stats = await landingPageService.getStats(id);

    if (!stats) {
      return c.json({
        success: false,
        error: 'Landing page not found'
      }, 404);
    }

    return c.json({
      success: true,
      data: stats
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to get stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/landing/:id/funding-progress
 *
 * Get funding progress for a landing page
 */
app.get('/api/landing/:id/funding-progress', async (c) => {
  try {
    const id = c.req.param('id');
    const progress = await landingPageService.getFundingProgress(id);

    return c.json({
      success: true,
      data: progress
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to get funding progress',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/landing/:id/pledges
 *
 * Get pledges for a landing page
 */
app.get('/api/landing/:id/pledges', async (c) => {
  try {
    const id = c.req.param('id');
    const pledges = await landingPageService.getPledges(id);

    return c.json({
      success: true,
      count: pledges.length,
      data: pledges
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to get pledges',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// ===== Export Raindrop Service =====

export default class extends Service<Env> {
  async fetch(request: Request): Promise<Response> {
    return app.fetch(request, this.env);
  }
}
