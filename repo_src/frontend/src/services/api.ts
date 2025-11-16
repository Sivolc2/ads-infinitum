import type {
  ProductConcept,
  ProductWithMetrics,
  AdExperiment,
  ExperimentWithMetrics,
  AdVariant,
  AdVariantWithMetrics,
  AdMetricsSnapshot,
  LandingPage,
  Lead,
  UserProfile,
  BuildContract,
  OptimizationConfig,
  OptimizationStatus,
  OptimizationResult,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    const json = await response.json();

    // Backend wraps responses in { success, data } format
    if (json && typeof json === 'object' && 'success' in json) {
      if (!json.success) {
        throw new Error(json.message || json.error || 'API request failed');
      }
      return json.data as T;
    }

    return json;
  }

  // Product Concepts
  async getProducts(): Promise<ProductWithMetrics[]> {
    return this.request<ProductWithMetrics[]>('/products');
  }

  async getProduct(id: string): Promise<ProductConcept> {
    return this.request<ProductConcept>(`/products/${id}`);
  }

  async createProduct(data: Partial<ProductConcept>): Promise<ProductConcept> {
    return this.request<ProductConcept>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: Partial<ProductConcept>): Promise<ProductConcept> {
    return this.request<ProductConcept>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string): Promise<void> {
    return this.request<void>(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Ad Experiments
  async getExperiments(productId?: string): Promise<ExperimentWithMetrics[]> {
    const query = productId ? `?product_id=${productId}` : '';
    return this.request<ExperimentWithMetrics[]>(`/experiments${query}`);
  }

  async getExperiment(id: string): Promise<AdExperiment> {
    return this.request<AdExperiment>(`/experiments/${id}`);
  }

  async createExperiment(data: Partial<AdExperiment>): Promise<AdExperiment> {
    return this.request<AdExperiment>('/experiments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateExperiment(id: string, data: Partial<AdExperiment>): Promise<AdExperiment> {
    return this.request<AdExperiment>(`/experiments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Optimization
  async getOptimizationStatus(experimentId: string): Promise<OptimizationStatus> {
    return this.request<OptimizationStatus>(`/experiments/${experimentId}/optimization/status`);
  }

  async updateOptimizationConfig(experimentId: string, config: Partial<OptimizationConfig>): Promise<void> {
    return this.request<void>(`/experiments/${experimentId}/optimization/config`, {
      method: 'PATCH',
      body: JSON.stringify(config),
    });
  }

  async triggerOptimizationEvaluation(experimentId: string): Promise<OptimizationResult> {
    return this.request<OptimizationResult>(`/experiments/${experimentId}/optimization/evaluate`, {
      method: 'POST',
    });
  }

  // Ad Variants
  async getAdVariants(experimentId?: string): Promise<AdVariantWithMetrics[]> {
    const query = experimentId ? `?experiment_id=${experimentId}` : '';
    return this.request<AdVariantWithMetrics[]>(`/ad-variants${query}`);
  }

  async getAdVariant(id: string): Promise<AdVariant> {
    return this.request<AdVariant>(`/ad-variants/${id}`);
  }

  async createAdVariant(data: Partial<AdVariant>): Promise<AdVariant> {
    return this.request<AdVariant>('/ad-variants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdVariant(id: string, data: Partial<AdVariant>): Promise<AdVariant> {
    return this.request<AdVariant>(`/ad-variants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Metrics
  async getMetrics(adId: string): Promise<AdMetricsSnapshot[]> {
    return this.request<AdMetricsSnapshot[]>(`/metrics?ad_id=${adId}`);
  }

  async getLatestMetrics(adId: string): Promise<AdMetricsSnapshot> {
    return this.request<AdMetricsSnapshot>(`/metrics/latest?ad_id=${adId}`);
  }

  // Landing Pages
  async getLandingPages(productId?: string): Promise<LandingPage[]> {
    const query = productId ? `?product_id=${productId}` : '';
    return this.request<LandingPage[]>(`/landing-pages${query}`);
  }

  async getLandingPage(id: string): Promise<LandingPage> {
    return this.request<LandingPage>(`/landing-pages/${id}`);
  }

  async updateLandingPage(id: string, data: Partial<LandingPage>): Promise<LandingPage> {
    return this.request<LandingPage>(`/landing-pages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Leads
  async getLeads(productId?: string): Promise<Lead[]> {
    const query = productId ? `?product_id=${productId}` : '';
    return this.request<Lead[]>(`/leads${query}`);
  }

  async getLead(id: string): Promise<Lead> {
    return this.request<Lead>(`/leads/${id}`);
  }

  // User Profiles
  async getUserProfiles(leadId?: string): Promise<UserProfile[]> {
    const query = leadId ? `?lead_id=${leadId}` : '';
    return this.request<UserProfile[]>(`/user-profiles${query}`);
  }

  async getUserProfile(id: string): Promise<UserProfile> {
    return this.request<UserProfile>(`/user-profiles/${id}`);
  }

  // Build Contracts
  async getBuildContracts(productId?: string): Promise<BuildContract[]> {
    const query = productId ? `?product_id=${productId}` : '';
    return this.request<BuildContract[]>(`/build-contracts${query}`);
  }

  async getBuildContract(id: string): Promise<BuildContract> {
    return this.request<BuildContract>(`/build-contracts/${id}`);
  }

  async createBuildContract(data: Partial<BuildContract>): Promise<BuildContract> {
    return this.request<BuildContract>('/build-contracts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<{
    total_products: number;
    active_experiments: number;
    total_leads: number;
    total_spend_usd: number;
    validated_products: number;
    avg_cpl_usd: number;
  }> {
    return this.request('/dashboard/stats');
  }
}

export const apiClient = new ApiClient();
export default apiClient;
