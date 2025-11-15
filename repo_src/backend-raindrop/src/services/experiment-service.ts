import {
  AdExperiment,
  CreateAdExperiment,
  UpdateAdExperiment,
  generateExperimentId,
  AdExperimentSchema,
  AdVariant,
  CreateAdVariant,
  UpdateAdVariant,
  generateAdVariantId,
  AdVariantSchema,
} from '../models';

/**
 * AdExperimentManager handles experiment and ad variant operations
 * Manages the full lifecycle of ad experiments and their variants
 */
export class AdExperimentManager {
  private bucket: any; // SmartBucket instance
  private cache: any; // KV Cache instance
  private EXPERIMENTS_PREFIX = 'experiments/';
  private VARIANTS_PREFIX = 'ad-variants/';

  constructor(bucket: any, cache: any) {
    this.bucket = bucket;
    this.cache = cache;
  }

  // ===== EXPERIMENT OPERATIONS =====

  /**
   * Create a new experiment
   */
  async createExperiment(data: CreateAdExperiment): Promise<AdExperiment> {
    const experiment: AdExperiment = {
      ...data,
      id: generateExperimentId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const validated = AdExperimentSchema.parse(experiment);

    const key = `${this.EXPERIMENTS_PREFIX}${validated.id}`;
    await this.bucket.put(key, JSON.stringify(validated), {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: {
        type: 'experiment',
        product_id: validated.product_id,
        status: validated.status,
      },
    });

    await this.cache.put(
      `experiment:${validated.id}`,
      JSON.stringify(validated),
      { expirationTtl: 1800 } // 30 minutes
    );

    return validated;
  }

  /**
   * Get experiment by ID
   */
  async getExperiment(id: string): Promise<AdExperiment | null> {
    // Try cache first
    const cached = await this.cache.get(`experiment:${id}`, { type: 'json' });
    if (cached) {
      return AdExperimentSchema.parse(cached);
    }

    const key = `${this.EXPERIMENTS_PREFIX}${id}`;
    const object = await this.bucket.get(key);

    if (!object) {
      return null;
    }

    const data = JSON.parse(await object.text());
    const validated = AdExperimentSchema.parse(data);

    await this.cache.put(
      `experiment:${id}`,
      JSON.stringify(validated),
      { expirationTtl: 1800 }
    );

    return validated;
  }

  /**
   * List experiments by product
   */
  async listExperimentsByProduct(productId: string): Promise<AdExperiment[]> {
    const listResult = await this.bucket.list({
      prefix: this.EXPERIMENTS_PREFIX,
      limit: 1000,
    });

    const experiments: AdExperiment[] = [];

    for (const obj of listResult.objects) {
      const object = await this.bucket.get(obj.key);
      if (object) {
        const data = JSON.parse(await object.text());
        const experiment = AdExperimentSchema.parse(data);

        if (experiment.product_id === productId) {
          experiments.push(experiment);
        }
      }
    }

    return experiments.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  /**
   * Update experiment
   */
  async updateExperiment(
    data: UpdateAdExperiment
  ): Promise<AdExperiment | null> {
    const existing = await this.getExperiment(data.id);
    if (!existing) {
      return null;
    }

    const updated: AdExperiment = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };

    const validated = AdExperimentSchema.parse(updated);

    const key = `${this.EXPERIMENTS_PREFIX}${validated.id}`;
    await this.bucket.put(key, JSON.stringify(validated), {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: {
        type: 'experiment',
        product_id: validated.product_id,
        status: validated.status,
      },
    });

    await this.cache.delete(`experiment:${validated.id}`);

    return validated;
  }

  // ===== AD VARIANT OPERATIONS =====

  /**
   * Create a new ad variant
   */
  async createAdVariant(data: CreateAdVariant): Promise<AdVariant> {
    const variant: AdVariant = {
      ...data,
      id: generateAdVariantId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const validated = AdVariantSchema.parse(variant);

    const key = `${this.VARIANTS_PREFIX}${validated.id}`;
    await this.bucket.put(key, JSON.stringify(validated), {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: {
        type: 'ad-variant',
        experiment_id: validated.experiment_id,
        product_id: validated.product_id,
        status: validated.status,
      },
    });

    return validated;
  }

  /**
   * Get ad variant by ID
   */
  async getAdVariant(id: string): Promise<AdVariant | null> {
    const key = `${this.VARIANTS_PREFIX}${id}`;
    const object = await this.bucket.get(key);

    if (!object) {
      return null;
    }

    const data = JSON.parse(await object.text());
    return AdVariantSchema.parse(data);
  }

  /**
   * List ad variants by experiment
   */
  async listAdVariantsByExperiment(experimentId: string): Promise<AdVariant[]> {
    const listResult = await this.bucket.list({
      prefix: this.VARIANTS_PREFIX,
      limit: 1000,
    });

    const variants: AdVariant[] = [];

    for (const obj of listResult.objects) {
      const object = await this.bucket.get(obj.key);
      if (object) {
        const data = JSON.parse(await object.text());
        const variant = AdVariantSchema.parse(data);

        if (variant.experiment_id === experimentId) {
          variants.push(variant);
        }
      }
    }

    return variants.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  /**
   * Update ad variant
   */
  async updateAdVariant(data: UpdateAdVariant): Promise<AdVariant | null> {
    const existing = await this.getAdVariant(data.id);
    if (!existing) {
      return null;
    }

    const updated: AdVariant = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };

    const validated = AdVariantSchema.parse(updated);

    const key = `${this.VARIANTS_PREFIX}${validated.id}`;
    await this.bucket.put(key, JSON.stringify(validated), {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: {
        type: 'ad-variant',
        experiment_id: validated.experiment_id,
        product_id: validated.product_id,
        status: validated.status,
      },
    });

    return validated;
  }

  /**
   * Pause an experiment (sets status to paused and pauses all active variants)
   */
  async pauseExperiment(experimentId: string): Promise<boolean> {
    const experiment = await this.getExperiment(experimentId);
    if (!experiment) {
      return false;
    }

    // Update experiment status
    await this.updateExperiment({
      id: experimentId,
      status: 'paused',
    });

    // Pause all active variants
    const variants = await this.listAdVariantsByExperiment(experimentId);
    for (const variant of variants) {
      if (variant.status === 'active') {
        await this.updateAdVariant({
          id: variant.id,
          status: 'paused',
        });
      }
    }

    return true;
  }

  /**
   * Resume an experiment (sets status to running and activates paused variants)
   */
  async resumeExperiment(experimentId: string): Promise<boolean> {
    const experiment = await this.getExperiment(experimentId);
    if (!experiment || experiment.status !== 'paused') {
      return false;
    }

    // Update experiment status
    await this.updateExperiment({
      id: experimentId,
      status: 'running',
    });

    // Reactivate paused variants
    const variants = await this.listAdVariantsByExperiment(experimentId);
    for (const variant of variants) {
      if (variant.status === 'paused') {
        await this.updateAdVariant({
          id: variant.id,
          status: 'active',
        });
      }
    }

    return true;
  }
}
