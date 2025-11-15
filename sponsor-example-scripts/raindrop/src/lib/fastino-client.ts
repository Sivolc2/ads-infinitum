// lib/fastino-client.ts
// Fastino API client for GLiNER-2 entity extraction and text classification

export type FastinoTask = "extract_entities" | "classify_text" | "extract_json";

export interface FastinoResponse<T = any> {
  result: T;
}

export interface FastinoConfig {
  apiKey: string;
  baseUrl?: string;
}

export class FastinoClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: FastinoConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://api.fastino.ai";
  }

  private async request<T = any>(body: any): Promise<FastinoResponse<T>> {
    const res = await fetch(`${this.baseUrl}/gliner-2`, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Fastino API error (${res.status}): ${errorText}`);
    }

    return res.json() as Promise<FastinoResponse<T>>;
  }

  /**
   * Classify text into predefined categories
   */
  async classifyText(
    text: string,
    categories: string[],
    threshold: number = 0.5
  ): Promise<string> {
    const body = {
      task: "classify_text" as FastinoTask,
      text,
      schema: {
        categories,
      },
      threshold,
    };

    const res = await this.request<{ categories: string }>(body);
    return res.result.categories;
  }

  /**
   * Extract structured JSON data from unstructured text
   */
  async extractJson<T = any>(
    text: string,
    schema: Record<string, string[]>,
    threshold: number = 0.4
  ): Promise<T> {
    const body = {
      task: "extract_json" as FastinoTask,
      text,
      schema,
      threshold,
    };

    const res = await this.request<T>(body);
    return res.result;
  }

  /**
   * Extract entities from text
   */
  async extractEntities(
    text: string,
    entityTypes: string[],
    threshold: number = 0.5
  ): Promise<Array<{ type: string; text: string; score: number }>> {
    const body = {
      task: "extract_entities" as FastinoTask,
      text,
      entity_types: entityTypes,
      threshold,
    };

    const res = await this.request<{
      entities: Array<{ type: string; text: string; score: number }>;
    }>(body);
    return res.result.entities;
  }
}

/**
 * Helper function to create a Fastino client from environment
 */
export function createFastinoClient(apiKey?: string): FastinoClient {
  const key = apiKey || process.env.FASTINO_API_KEY;

  if (!key) {
    throw new Error(
      "FASTINO_API_KEY is required. Set it as an environment variable or pass it to createFastinoClient()"
    );
  }

  return new FastinoClient({ apiKey: key });
}
