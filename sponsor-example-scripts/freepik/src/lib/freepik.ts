// src/lib/freepik.ts
export type GeneratedImage = {
  base64: string;
  has_nsfw: boolean;
};

export async function generateCampaignImage(prompt: string): Promise<GeneratedImage[]> {
  const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY;

  if (!FREEPIK_API_KEY) {
    throw new Error("FREEPIK_API_KEY environment variable is not set");
  }

  const res = await fetch("https://api.freepik.com/v1/ai/text-to-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-freepik-api-key": FREEPIK_API_KEY,
    },
    body: JSON.stringify({
      prompt,
      negative_prompt: "blurry, low quality, text artifacts, watermark",
      num_images: 1,
      image: { size: "square_1_1" },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Freepik error: ${res.status} – ${text}`);
  }

  const json = await res.json();
  return json.data as GeneratedImage[];
}
