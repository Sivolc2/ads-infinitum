// src/services/ad-api.ts
import { Service } from "@liquidmetal-ai/raindrop-framework";
import { Env } from "../../raindrop.gen";

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

export type OptimizeResponse = {
  suggestedHeadlines: string[];
  suggestedBodies: string[];
  strategyNotes: string;
};

export default class AdOptimizerService extends Service<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/optimize-ads") {
      return new Response("Not Found", { status: 404 });
    }

    const body = (await request.json()) as OptimizeRequest;

    const aiResponse = await this.env.AI.run("llama-3.3-70b", {
      model: "llama-3.3-70b",
      messages: [
        {
          role: "system",
          content:
            "You are a senior performance marketer. You analyze A/B test results and propose new ad copy and strategy tweaks.",
        },
        {
          role: "user",
          content: [
            `Product: ${body.productName}`,
            `Audience: ${body.audience}`,
            "",
            "Here are recent ad variants with stats as JSON:",
            JSON.stringify(body.samples, null, 2),
            "",
            "1) Identify which copy patterns work best.",
            "2) Suggest 3 new short headlines and 3 body variations.",
            "3) Give a short bullet list of strategy tweaks for audience targeting and creative testing.",
            "Return valid JSON with keys: suggestedHeadlines, suggestedBodies, strategyNotes.",
          ].join("\n"),
        },
      ],
      max_tokens: 400,
      response_format: { type: "json_object" },
    });

    // Depending on the model type, you may need to inspect aiResponse.choices[0].message.content, etc.
    const parsed = JSON.parse(
      (aiResponse as any).choices?.[0]?.message?.content ?? "{}"
    ) as OptimizeResponse;

    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" },
    });
  }
}
