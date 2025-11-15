// src/lib/freelancer.ts

const getBaseUrl = () => process.env.FLN_URL || "https://www.freelancer.com";
const getApiEndpoint = () => `${getBaseUrl()}/api`;

export type FreelancerProject = {
  id: number;
  title: string;
  description?: string;
  type?: string;
  status?: string;
  owner_id?: number;
  time_submitted?: number;
  budget?: {
    minimum: number;
    maximum: number;
  };
  currency?: {
    code: string;
    sign: string;
  };
  bid_stats?: {
    bid_count: number;
    bid_avg: number;
  };
};

export type ProjectSearchParams = {
  query?: string;
  skills?: number[];
  min_budget?: number;
  max_budget?: number;
  limit?: number;
  offset?: number;
};

export type PostJobParams = {
  title: string;
  description: string;
  currency: string;
  budget: {
    minimum: number;
    maximum: number;
  };
  jobs: number[]; // skill/job category IDs
  type?: "fixed" | "hourly";
};

export class FreelancerClient {
  private headers: HeadersInit;
  private apiEndpoint: string;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.FREELANCER_API_KEY;
    if (!key) {
      throw new Error("FREELANCER_API_KEY environment variable is not set");
    }

    this.apiEndpoint = getApiEndpoint();
    this.headers = {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Get current authenticated user information
   */
  async getSelf(): Promise<any> {
    const response = await fetch(`${this.apiEndpoint}/users/0.1/self`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return data.result;
  }

  /**
   * Search for active projects
   */
  async searchProjects(params: ProjectSearchParams = {}): Promise<FreelancerProject[]> {
    const searchParams = new URLSearchParams();

    if (params.query) searchParams.append("query", params.query);
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.offset) searchParams.append("offset", params.offset.toString());
    if (params.min_budget) searchParams.append("min_budget", params.min_budget.toString());
    if (params.max_budget) searchParams.append("max_budget", params.max_budget.toString());

    if (params.skills) {
      params.skills.forEach((skillId) => {
        searchParams.append("jobs[]", skillId.toString());
      });
    }

    searchParams.append("compact", "false");

    const response = await fetch(
      `${this.apiEndpoint}/projects/0.1/projects/active?${searchParams}`,
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to search projects: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return data.result.projects || [];
  }

  /**
   * Get details of a specific project
   */
  async getProjectDetails(projectId: number): Promise<FreelancerProject> {
    const response = await fetch(
      `${this.apiEndpoint}/projects/0.1/projects?projects[]=${projectId}`,
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get project details: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const projects = data.result.projects || [];

    if (projects.length === 0) {
      throw new Error(`Project ${projectId} not found`);
    }

    return projects[0];
  }

  /**
   * Get available job categories/skills
   */
  async getJobCategories(): Promise<Array<{ id: number; name: string }>> {
    const response = await fetch(`${this.apiEndpoint}/projects/0.1/jobs?jobs=true`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get job categories: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const result = data.result;

    // Handle different response formats
    return Array.isArray(result) ? result : result.jobs || [];
  }

  /**
   * Post a new job/project
   * Note: This requires special API permissions and may not work with all API keys
   */
  async postJob(params: PostJobParams): Promise<any> {
    const jobData = {
      title: params.title,
      description: params.description,
      currency: {
        id: params.currency === "USD" ? 1 : 1, // You'd need currency ID mapping
      },
      budget: {
        minimum: params.budget.minimum,
        maximum: params.budget.maximum,
      },
      jobs: params.jobs.map((id) => ({ id })),
      type: params.type || "fixed",
    };

    const response = await fetch(`${this.apiEndpoint}/projects/0.1/projects`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(jobData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to post job: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.result;
  }

  /**
   * Monitor a project for changes
   */
  async monitorProject(
    projectId: number,
    callback: (project: FreelancerProject) => void,
    intervalSeconds: number = 60
  ): Promise<() => void> {
    let lastBidCount = 0;

    const check = async () => {
      try {
        const project = await this.getProjectDetails(projectId);
        const currentBidCount = project.bid_stats?.bid_count || 0;

        if (currentBidCount !== lastBidCount) {
          lastBidCount = currentBidCount;
          callback(project);
        }
      } catch (error) {
        console.error("Error monitoring project:", error);
      }
    };

    // Initial check
    await check();

    // Set up interval
    const intervalId = setInterval(check, intervalSeconds * 1000);

    // Return cleanup function
    return () => clearInterval(intervalId);
  }
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, code: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
  }).format(amount);
}

/**
 * Format timestamp to readable date
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}
