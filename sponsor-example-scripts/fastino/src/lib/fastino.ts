// lib/fastino.ts
export type FastinoTask = "extract_entities" | "classify_text" | "extract_json";

export interface FastinoResponse<T = any> {
  result: T;
}

async function fastinoRequest<T = any>(body: any): Promise<FastinoResponse<T>> {
  // Get API key at runtime (after dotenv.config() has run)
  const FASTINO_API_KEY = process.env.FASTINO_API_KEY;

  if (!FASTINO_API_KEY) {
    throw new Error(`FASTINO_API_KEY is not set. Make sure you have a .env file with FASTINO_API_KEY=your_key`);
  }

  const res = await fetch("https://api.fastino.ai/gliner-2", {
    method: "POST",
    headers: {
      "x-api-key": FASTINO_API_KEY,
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

// Classify text as interest level for your product lab
export async function classifyInterest(message: string) {
  const body = {
    task: "classify_text" as FastinoTask,
    text: message,
    schema: {
      categories: ["high_interest", "curious", "uninterested", "complaint"],
    },
    threshold: 0.5, // optional, default ~0.5
  };

  const res = await fastinoRequest<{ categories: string }>(body);
  return res.result.categories; // e.g. "high_interest"
}

// Extract product + sentiment info from freeform text
export async function extractFeedbackFields(text: string) {
  const body = {
    task: "extract_json" as FastinoTask,
    text,
    schema: {
      feedback: [
        "product::str::Product name or type",
        "sentiment::str::User sentiment (happy, frustrated, confused, excited)",
        "feature_request::str::Requested feature or improvement"
      ]
    },
    threshold: 0.4
  };

  const res = await fastinoRequest<{
    feedback: Array<{
      product: string;
      sentiment: string;
      feature_request: string
    }>
  }>(body);
  return res.result.feedback;
}
