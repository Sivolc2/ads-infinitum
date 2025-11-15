// src/example.ts
import { config } from "dotenv";
import { generateCampaignImage } from "./lib/freepik.js";
import { writeFile } from "fs/promises";
import { join } from "path";

// Load environment variables from .env file
config();

async function main() {
  const productName = "SmartLens Pro";
  const prompt = `Solarpunk hardware lab product shot, ${productName}, vibrant, optimistic, for a Kickstarter hero image`;

  console.log("🎨 Generating campaign image with Freepik...");
  console.log(`Prompt: ${prompt}\n`);

  try {
    const images = await generateCampaignImage(prompt);

    if (images.length > 0) {
      const [img] = images;
      console.log("✅ Image generated successfully!");
      console.log(`   NSFW detected: ${img.has_nsfw}`);
      console.log(`   Base64 length: ${img.base64.length} characters`);

      // Save the image to a file
      const buffer = Buffer.from(img.base64, "base64");
      const filename = `generated-${Date.now()}.png`;
      const filepath = join(process.cwd(), filename);

      await writeFile(filepath, buffer);
      console.log(`\n💾 Image saved to: ${filename}`);
      console.log(`\n📝 You can use it in HTML as:`);
      console.log(`   <img src="data:image/png;base64,${img.base64.substring(0, 50)}..." />`);
    } else {
      console.log("⚠️  No images were generated");
    }
  } catch (error) {
    console.error("❌ Error generating image:", error);
    process.exit(1);
  }
}

main();
