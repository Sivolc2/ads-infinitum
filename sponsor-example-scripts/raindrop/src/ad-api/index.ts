import { Service } from '@liquidmetal-ai/raindrop-framework';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { QueueSendOptions } from '@liquidmetal-ai/raindrop-framework';
import { KvCachePutOptions, KvCacheGetOptions } from '@liquidmetal-ai/raindrop-framework';
import { BucketPutOptions, BucketListOptions } from '@liquidmetal-ai/raindrop-framework';
import { Env } from './raindrop.gen';
import { createFastinoClient } from '../lib/fastino-client';
import { LeadEnrichmentWorker } from '../workers/lead-enrichment';
import { AdQualityAggregator } from '../workers/ad-quality-aggregator';
import { Lead, UserProfile, EnrichLeadRequest, EnrichLeadResponse, AdQualityStats } from '../types/lead-intelligence';
import { generateAdImages, imageToDataUrl, imageToBuffer, ImageGenProvider } from '../lib/image-gen';

// Create Hono app with middleware
const app = new Hono<{ Bindings: Env }>();

// Add request logging middleware
app.use('*', logger());

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// === Basic API Routes ===
app.get('/api/hello', (c) => {
  return c.json({ message: 'Hello from Hono!' });
});

app.get('/api/hello/:name', (c) => {
  const name = c.req.param('name');
  return c.json({ message: `Hello, ${name}!` });
});

// Example POST endpoint
app.post('/api/echo', async (c) => {
  const body = await c.req.json();
  return c.json({ received: body });
});

// === Ad Optimizer Endpoint ===
type AdSample = {
  id: string;
  copy: string;
  impressions: number;
  clicks: number;
  spend: number;
};

type OptimizeRequest = {
  productName: string;
  audience: string;
  samples: AdSample[];
};

type OptimizeResponse = {
  suggestedHeadlines: string[];
  suggestedBodies: string[];
  strategyNotes: string;
};

app.post('/optimize-ads', async (c) => {
  try {
    const body = await c.req.json<OptimizeRequest>();

    if (!body.productName || !body.audience || !body.samples) {
      return c.json({ error: 'productName, audience, and samples are required' }, 400);
    }

    const aiResponse = await c.env.AI.run('llama-3.3-70b', {
      model: 'llama-3.3-70b',
      messages: [
        {
          role: 'system',
          content: 'You are a senior performance marketer. You analyze A/B test results and propose new ad copy and strategy tweaks.',
        },
        {
          role: 'user',
          content: [
            `Product: ${body.productName}`,
            `Audience: ${body.audience}`,
            '',
            'Here are recent ad variants with stats as JSON:',
            JSON.stringify(body.samples, null, 2),
            '',
            '1) Identify which copy patterns work best.',
            '2) Suggest 3 new short headlines and 3 body variations.',
            '3) Give a short bullet list of strategy tweaks for audience targeting and creative testing.',
            'Return valid JSON with keys: suggestedHeadlines, suggestedBodies, strategyNotes.',
          ].join('\n'),
        },
      ],
      max_tokens: 400,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(
      (aiResponse as any).choices?.[0]?.message?.content ?? '{}'
    ) as OptimizeResponse;

    return c.json(parsed);
  } catch (error) {
    return c.json({
      error: 'Ad optimization failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// === Image Generation Endpoint ===
type GenerateImagesRequest = {
  productName: string;
  audience: string;
  angle: string;
  numImages?: number;
  provider?: ImageGenProvider;  // 'fal' or 'freepik'
};

type GenerateImagesResponse = {
  images: Array<{
    url?: string;
    base64?: string;
    dataUrl: string;
    width?: number;
    height?: number;
    provider: string;
  }>;
  provider: string;
  generationTime: number;
};

app.post('/generate-images', async (c) => {
  try {
    const body = await c.req.json<GenerateImagesRequest>();

    if (!body.productName || !body.audience || !body.angle) {
      return c.json({
        error: 'productName, audience, and angle are required'
      }, 400);
    }

    const provider = body.provider || 'fal';
    console.log(`🎨 Generating images with ${provider}...`);

    const startTime = Date.now();

    const images = await generateAdImages({
      productName: body.productName,
      audience: body.audience,
      angle: body.angle,
      numImages: body.numImages || 2,
      provider,
    });

    const generationTime = Date.now() - startTime;

    const response: GenerateImagesResponse = {
      images: images.map(img => ({
        url: img.url,
        base64: img.base64,
        dataUrl: imageToDataUrl(img),
        width: img.width,
        height: img.height,
        provider: img.provider,
      })),
      provider,
      generationTime,
    };

    console.log(`✅ Generated ${images.length} images in ${generationTime}ms`);

    return c.json(response);
  } catch (error) {
    console.error('Image generation failed:', error);
    return c.json({
      error: 'Image generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// === Track B: Lead Intelligence Endpoints ===

// In-memory storage for demo purposes
// In production, use SmartBuckets or external database
const profilesStore = new Map<string, UserProfile>();
const adLeadsStore = new Map<string, string[]>(); // ad_id -> lead_ids[]

/**
 * POST /internal/enrich-lead
 * Enriches a raw lead using Fastino to extract user profile data
 */
app.post('/internal/enrich-lead', async (c) => {
  try {
    const body = await c.req.json<EnrichLeadRequest>();

    if (!body.lead) {
      return c.json({ error: 'lead is required' }, 400);
    }

    const startTime = Date.now();

    // Get Fastino API key from environment
    const fastinoApiKey = c.env.FASTINO_API_KEY;
    if (!fastinoApiKey) {
      return c.json({
        error: 'FASTINO_API_KEY not configured',
        message: 'Set FASTINO_API_KEY in your Raindrop environment variables'
      }, 500);
    }

    // Create Fastino client and enrichment worker
    const fastinoClient = createFastinoClient(fastinoApiKey);
    const enrichmentWorker = new LeadEnrichmentWorker(fastinoClient);

    // Enrich the lead
    const profile = await enrichmentWorker.enrichLead(body.lead);

    // Store in memory (in production, persist to database)
    profilesStore.set(profile.lead_id, profile);

    // Track which leads belong to which ad
    if (body.lead.ad_id) {
      const adLeads = adLeadsStore.get(body.lead.ad_id) || [];
      if (!adLeads.includes(body.lead.id)) {
        adLeads.push(body.lead.id);
        adLeadsStore.set(body.lead.ad_id, adLeads);
      }
    }

    const enrichmentTime = Date.now() - startTime;

    const response: EnrichLeadResponse = {
      lead_id: body.lead.id,
      profile,
      enrichment_time_ms: enrichmentTime,
    };

    return c.json(response);
  } catch (error) {
    console.error('Lead enrichment failed:', error);
    return c.json({
      error: 'Lead enrichment failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /internal/ad-quality/:adId
 * Returns quality stats for an ad based on its enriched leads
 */
app.get('/internal/ad-quality/:adId', async (c) => {
  try {
    const adId = c.req.param('adId');

    if (!adId) {
      return c.json({ error: 'adId is required' }, 400);
    }

    // Get lead IDs for this ad
    const leadIds = adLeadsStore.get(adId) || [];

    // Get profiles for these leads
    const profiles = leadIds
      .map(leadId => profilesStore.get(leadId))
      .filter((p): p is UserProfile => p !== undefined);

    // Aggregate quality stats
    const aggregator = new AdQualityAggregator();
    const stats = aggregator.aggregateAdQuality({
      ad_id: adId,
      profiles,
    });

    return c.json(stats);
  } catch (error) {
    console.error('Ad quality aggregation failed:', error);
    return c.json({
      error: 'Ad quality aggregation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// === RPC Examples: Service calling Actor ===
// Example: Call an actor method
/*
app.post('/api/actor-call', async (c) => {
  try {
    const { message, actorName } = await c.req.json();

    if (!actorName) {
      return c.json({ error: 'actorName is required' }, 400);
    }

    // Get actor namespace and create actor instance
    // Note: Replace MY_ACTOR with your actual actor binding name
    const actorNamespace = c.env.MY_ACTOR; // This would be bound in raindrop.manifest
    const actorId = actorNamespace.idFromName(actorName);
    const actor = actorNamespace.get(actorId);

    // Call actor method (assuming actor has a 'processMessage' method)
    const response = await actor.processMessage(message);

    return c.json({
      success: true,
      actorName,
      response
    });
  } catch (error) {
    return c.json({
      error: 'Failed to call actor',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});
*/

// Example: Get actor state
/*
app.get('/api/actor-state/:actorName', async (c) => {
  try {
    const actorName = c.req.param('actorName');

    // Get actor instance
    const actorNamespace = c.env.MY_ACTOR;
    const actorId = actorNamespace.idFromName(actorName);
    const actor = actorNamespace.get(actorId);

    // Get actor state (assuming actor has a 'getState' method)
    const state = await actor.getState();

    return c.json({
      success: true,
      actorName,
      state
    });
  } catch (error) {
    return c.json({
      error: 'Failed to get actor state',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});
*/

// === SmartBucket Examples ===
// Example: Upload file to SmartBucket
/*
app.post('/api/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const description = formData.get('description') as string;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Upload to SmartBucket (Replace MY_SMARTBUCKET with your binding name)
    const smartbucket = c.env.MY_SMARTBUCKET;
    const arrayBuffer = await file.arrayBuffer();

    const putOptions: BucketPutOptions = {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
      },
      customMetadata: {
        originalName: file.name,
        size: file.size.toString(),
        description: description || '',
        uploadedAt: new Date().toISOString()
      }
    };

    const result = await smartbucket.put(file.name, new Uint8Array(arrayBuffer), putOptions);

    return c.json({
      success: true,
      message: 'File uploaded successfully',
      key: result.key,
      size: result.size,
      etag: result.etag
    });
  } catch (error) {
    return c.json({
      error: 'Failed to upload file',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});
*/

// Example: Get file from SmartBucket
/*
app.get('/api/file/:filename', async (c) => {
  try {
    const filename = c.req.param('filename');

    // Get file from SmartBucket
    const smartbucket = c.env.MY_SMARTBUCKET;
    const file = await smartbucket.get(filename);

    if (!file) {
      return c.json({ error: 'File not found' }, 404);
    }

    return new Response(file.body, {
      headers: {
        'Content-Type': file.httpMetadata?.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Object-Size': file.size.toString(),
        'X-Object-ETag': file.etag,
        'X-Object-Uploaded': file.uploaded.toISOString(),
      }
    });
  } catch (error) {
    return c.json({
      error: 'Failed to retrieve file',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});
*/

// Example: Search SmartBucket documents
/*
app.post('/api/search', async (c) => {
  try {
    const { query, page = 1, pageSize = 10 } = await c.req.json();

    if (!query) {
      return c.json({ error: 'Query is required' }, 400);
    }

    const smartbucket = c.env.MY_SMARTBUCKET;

    // For initial search
    if (page === 1) {
      const requestId = `search-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const results = await smartbucket.search({
        input: query,
        requestId
      });

      return c.json({
        success: true,
        message: 'Search completed',
        query,
        results: results.results,
        pagination: {
          ...results.pagination,
          requestId
        }
      });
    } else {
      // For paginated results
      const { requestId } = await c.req.json();
      if (!requestId) {
        return c.json({ error: 'Request ID required for pagination' }, 400);
      }

      const paginatedResults = await smartbucket.getPaginatedResults({
        requestId,
        page,
        pageSize
      });

      return c.json({
        success: true,
        message: 'Paginated results',
        query,
        results: paginatedResults.results,
        pagination: paginatedResults.pagination
      });
    }
  } catch (error) {
    return c.json({
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});
*/

// Example: Chunk search for finding specific sections
/*
app.post('/api/chunk-search', async (c) => {
  try {
    const { query } = await c.req.json();

    if (!query) {
      return c.json({ error: 'Query is required' }, 400);
    }

    const smartbucket = c.env.MY_SMARTBUCKET;
    const requestId = `chunk-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const results = await smartbucket.chunkSearch({
      input: query,
      requestId
    });

    return c.json({
      success: true,
      message: 'Chunk search completed',
      query,
      results: results.results
    });
  } catch (error) {
    return c.json({
      error: 'Chunk search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});
*/

// Example: Document chat/Q&A
/*
app.post('/api/document-chat', async (c) => {
  try {
    const { objectId, query } = await c.req.json();

    if (!objectId || !query) {
      return c.json({ error: 'objectId and query are required' }, 400);
    }

    const smartbucket = c.env.MY_SMARTBUCKET;
    const requestId = `chat-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const response = await smartbucket.documentChat({
      objectId,
      input: query,
      requestId
    });

    return c.json({
      success: true,
      message: 'Document chat completed',
      objectId,
      query,
      answer: response.answer
    });
  } catch (error) {
    return c.json({
      error: 'Document chat failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});
*/

// Example: List objects in bucket
/*
app.get('/api/list', async (c) => {
  try {
    const url = new URL(c.req.url);
    const prefix = url.searchParams.get('prefix') || undefined;
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined;

    const smartbucket = c.env.MY_SMARTBUCKET;

    const listOptions: BucketListOptions = {
      prefix,
      limit
    };

    const result = await smartbucket.list(listOptions);

    return c.json({
      success: true,
      objects: result.objects.map(obj => ({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded,
        etag: obj.etag
      })),
      truncated: result.truncated,
      cursor: result.truncated ? result.cursor : undefined
    });
  } catch (error) {
    return c.json({
      error: 'List failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});
*/

// === KV Cache Examples ===
// Example: Store data in KV cache
/*
app.post('/api/cache', async (c) => {
  try {
    const { key, value, ttl } = await c.req.json();

    if (!key || value === undefined) {
      return c.json({ error: 'key and value are required' }, 400);
    }

    const cache = c.env.MY_CACHE;

    const putOptions: KvCachePutOptions = {};
    if (ttl) {
      putOptions.expirationTtl = ttl;
    }

    await cache.put(key, JSON.stringify(value), putOptions);

    return c.json({
      success: true,
      message: 'Data cached successfully',
      key
    });
  } catch (error) {
    return c.json({
      error: 'Cache put failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});
*/

// Example: Get data from KV cache
/*
app.get('/api/cache/:key', async (c) => {
  try {
    const key = c.req.param('key');

    const cache = c.env.MY_CACHE;

    const getOptions: KvCacheGetOptions<'json'> = {
      type: 'json'
    };

    const value = await cache.get(key, getOptions);

    if (value === null) {
      return c.json({ error: 'Key not found in cache' }, 404);
    }

    return c.json({
      success: true,
      key,
      value
    });
  } catch (error) {
    return c.json({
      error: 'Cache get failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});
*/

// === Queue Examples ===
// Example: Send message to queue
/*
app.post('/api/queue/send', async (c) => {
  try {
    const { message, delaySeconds } = await c.req.json();

    if (!message) {
      return c.json({ error: 'message is required' }, 400);
    }

    const queue = c.env.MY_QUEUE;

    const sendOptions: QueueSendOptions = {};
    if (delaySeconds) {
      sendOptions.delaySeconds = delaySeconds;
    }

    await queue.send(message, sendOptions);

    return c.json({
      success: true,
      message: 'Message sent to queue'
    });
  } catch (error) {
    return c.json({
      error: 'Queue send failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});
*/

// === Environment Variable Examples ===
app.get('/api/config', (c) => {
  return c.json({
    hasEnv: !!c.env,
    availableBindings: {
      // These would be true if the resources are bound in raindrop.manifest
      // MY_ACTOR: !!c.env.MY_ACTOR,
      // MY_SMARTBUCKET: !!c.env.MY_SMARTBUCKET,
      // MY_CACHE: !!c.env.MY_CACHE,
      // MY_QUEUE: !!c.env.MY_QUEUE,
    },
    // Example access to environment variables:
    // MY_SECRET_VAR: c.env.MY_SECRET_VAR // This would be undefined if not set
  });
});

export default class extends Service<Env> {
  async fetch(request: Request): Promise<Response> {
    return app.fetch(request, this.env);
  }
}
