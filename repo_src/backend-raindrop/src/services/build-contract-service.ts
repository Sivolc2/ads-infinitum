import {
  BuildContract,
  CreateBuildContract,
  UpdateBuildContract,
  generateBuildContractId,
  BuildContractSchema,
} from '../models/build-contract';

/**
 * BuildContractService manages build contracts for validated products
 */
export class BuildContractService {
  private bucket: any; // SmartBucket instance
  private BUILD_CONTRACTS_PREFIX = 'build-contracts/';

  constructor(bucket: any) {
    this.bucket = bucket;
  }

  /**
   * Create a new build contract
   */
  async create(data: CreateBuildContract): Promise<BuildContract> {
    const contract: BuildContract = {
      ...data,
      id: generateBuildContractId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const validated = BuildContractSchema.parse(contract);

    const key = `${this.BUILD_CONTRACTS_PREFIX}${validated.id}`;
    await this.bucket.put(key, JSON.stringify(validated), {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: {
        type: 'build-contract',
        product_id: validated.product_id,
        status: validated.status,
      },
    });

    return validated;
  }

  /**
   * Get build contract by ID
   */
  async get(id: string): Promise<BuildContract | null> {
    const key = `${this.BUILD_CONTRACTS_PREFIX}${id}`;
    const object = await this.bucket.get(key);

    if (!object) {
      return null;
    }

    const data = JSON.parse(await object.text());
    return BuildContractSchema.parse(data);
  }

  /**
   * Update build contract
   */
  async update(data: UpdateBuildContract): Promise<BuildContract | null> {
    const existing = await this.get(data.id);
    if (!existing) {
      return null;
    }

    const updated: BuildContract = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };

    const validated = BuildContractSchema.parse(updated);

    const key = `${this.BUILD_CONTRACTS_PREFIX}${validated.id}`;
    await this.bucket.put(key, JSON.stringify(validated), {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: {
        type: 'build-contract',
        product_id: validated.product_id,
        status: validated.status,
      },
    });

    return validated;
  }

  /**
   * Delete build contract
   */
  async delete(id: string): Promise<boolean> {
    const key = `${this.BUILD_CONTRACTS_PREFIX}${id}`;
    const exists = await this.bucket.get(key);

    if (!exists) {
      return false;
    }

    await this.bucket.delete(key);
    return true;
  }

  /**
   * List all build contracts
   */
  async list(): Promise<BuildContract[]> {
    const listResult = await this.bucket.list({
      prefix: this.BUILD_CONTRACTS_PREFIX,
      limit: 1000,
    });

    const contracts: BuildContract[] = [];

    for (const obj of listResult.objects) {
      const object = await this.bucket.get(obj.key);
      if (object) {
        const data = JSON.parse(await object.text());
        const contract = BuildContractSchema.parse(data);
        contracts.push(contract);
      }
    }

    return contracts.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  /**
   * List build contracts by product
   */
  async listByProduct(productId: string): Promise<BuildContract[]> {
    const allContracts = await this.list();
    return allContracts.filter((c) => c.product_id === productId);
  }

  /**
   * List build contracts by status
   */
  async listByStatus(status: BuildContract['status']): Promise<BuildContract[]> {
    const allContracts = await this.list();
    return allContracts.filter((c) => c.status === status);
  }
}
