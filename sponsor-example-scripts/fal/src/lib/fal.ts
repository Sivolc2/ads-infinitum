// src/lib/fal.ts
import { fal } from "@fal-ai/client";

export type FalImage = {
  url: string;
  content_type: string;
  width: number;
  height: number;
};

export async function generateFalAdImages(options: {
  productName: string;
  audience: string;
  angle: string;          // e.g. "anxiety relief", "productivity", "aesthetic desk setup"
  numImages?: number;
}): Promise<FalImage[]> {
  const { productName, audience, angle, numImages = 2 } = options;

  const prompt = [
    `Kickstarter / paid social hero image for a new product called "${productName}".`,
    `Target audience: ${audience}.`,
    `Positioning angle: ${angle}.`,
    `Clean, eye-catching composition, no heavy text, looks great in a mobile feed.`,
  ].join(" ");

  const result = await fal.subscribe("fal-ai/flux/dev", {
    input: {
      prompt,
      image_size: "landscape_4_3",  // 1200x900-ish
      num_images: numImages,
      guidance_scale: 3.5,
      enable_safety_checker: true,
      output_format: "jpeg",
    },
    logs: false,
  });

  // result.data.images is the standard output schema for this model
  return (result.data as any).images as FalImage[];
}
