import {
  ProductConcept,
  CreateProductConcept,
  UpdateProductConcept,
  generateProductId,
  createTimestamps,
  ProductConceptSchema,
} from '../models';

/**
 * ProductService handles CRUD operations for ProductConcepts
 * Uses SmartBucket for storage
 */
export class ProductService {
  private bucket: any; // SmartBucket instance
  private cache: any; // KV Cache instance
  private COLLECTION_PREFIX = 'products/';

  constructor(bucket: any, cache: any) {
    this.bucket = bucket;
    this.cache = cache;
  }

  /**
   * Create a new product concept
   */
  async create(data: CreateProductConcept): Promise<ProductConcept> {
    const product: ProductConcept = {
      ...data,
      id: generateProductId(),
      ...createTimestamps(),
    };

    // Validate
    const validated = ProductConceptSchema.parse(product);

    // Store in bucket
    const key = `${this.COLLECTION_PREFIX}${validated.id}`;
    await this.bucket.put(key, JSON.stringify(validated), {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: {
        type: 'product',
        status: validated.status,
        created_by: validated.created_by,
      },
    });

    // Cache the product
    await this.cache.put(
      `product:${validated.id}`,
      JSON.stringify(validated),
      { expirationTtl: 3600 } // 1 hour
    );

    return validated;
  }

  /**
   * Get product by ID
   */
  async get(id: string): Promise<ProductConcept | null> {
    // Try cache first
    const cached = await this.cache.get(`product:${id}`, { type: 'json' });
    if (cached) {
      return ProductConceptSchema.parse(cached);
    }

    // Fallback to bucket
    const key = `${this.COLLECTION_PREFIX}${id}`;
    const object = await this.bucket.get(key);

    if (!object) {
      return null;
    }

    const data = JSON.parse(await object.text());
    const validated = ProductConceptSchema.parse(data);

    // Update cache
    await this.cache.put(
      `product:${id}`,
      JSON.stringify(validated),
      { expirationTtl: 3600 }
    );

    return validated;
  }

  /**
   * List all products with optional filtering
   */
  async list(options?: {
    status?: ProductConcept['status'];
    limit?: number;
  }): Promise<ProductConcept[]> {
    const listResult = await this.bucket.list({
      prefix: this.COLLECTION_PREFIX,
      limit: options?.limit || 100,
    });

    const products: ProductConcept[] = [];

    for (const obj of listResult.objects) {
      const object = await this.bucket.get(obj.key);
      if (object) {
        const data = JSON.parse(await object.text());
        const product = ProductConceptSchema.parse(data);

        // Apply status filter if provided
        if (!options?.status || product.status === options.status) {
          products.push(product);
        }
      }
    }

    // Sort by updated_at descending
    return products.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }

  /**
   * Update an existing product
   */
  async update(data: UpdateProductConcept): Promise<ProductConcept | null> {
    const existing = await this.get(data.id);
    if (!existing) {
      return null;
    }

    const updated: ProductConcept = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };

    const validated = ProductConceptSchema.parse(updated);

    // Update in bucket
    const key = `${this.COLLECTION_PREFIX}${validated.id}`;
    await this.bucket.put(key, JSON.stringify(validated), {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: {
        type: 'product',
        status: validated.status,
        created_by: validated.created_by,
      },
    });

    // Invalidate cache
    await this.cache.delete(`product:${validated.id}`);

    return validated;
  }

  /**
   * Delete a product
   */
  async delete(id: string): Promise<boolean> {
    const key = `${this.COLLECTION_PREFIX}${id}`;

    try {
      await this.bucket.delete(key);
      await this.cache.delete(`product:${id}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get products by status
   */
  async getByStatus(status: ProductConcept['status']): Promise<ProductConcept[]> {
    return this.list({ status });
  }
}
