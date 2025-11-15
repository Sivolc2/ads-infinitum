// src/example.ts
import { config } from "dotenv";
import { generateFalAdImages } from "./lib/fal.js";
import { writeFile } from "fs/promises";
import { join } from "path";

// Load environment variables from .env file
config();

async function main() {
  const productName = "SolarPanel X3";
  const audience = "eco-conscious tech enthusiasts, 25-45, urban professionals";
  const angle = "sustainable productivity for remote work";

  console.log("⚡ Generating ad creatives with fal.ai FLUX.1...");
  console.log(`Product: ${productName}`);
  console.log(`Audience: ${audience}`);
  console.log(`Angle: ${angle}\n`);

  try {
    const images = await generateFalAdImages({
      productName,
      audience,
      angle,
      numImages: 2,
    });

    if (images.length > 0) {
      console.log(`✅ Generated ${images.length} image(s) successfully!\n`);

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        console.log(`Image ${i + 1}:`);
        console.log(`   URL: ${img.url}`);
        console.log(`   Size: ${img.width}x${img.height}`);
        console.log(`   Type: ${img.content_type}\n`);

        // Download and save the image
        const response = await fetch(img.url);
        const buffer = Buffer.from(await response.arrayBuffer());
        const filename = `fal-generated-${Date.now()}-${i + 1}.jpg`;
        const filepath = join(process.cwd(), filename);

        await writeFile(filepath, buffer);
        console.log(`💾 Image ${i + 1} saved to: ${filename}\n`);
      }

      console.log("📝 Use in your ad pipeline:");
      console.log(`   <img src="${images[0].url}" alt="ad creative" />`);
    } else {
      console.log("⚠️  No images were generated");
    }
  } catch (error) {
    console.error("❌ Error generating images:", error);
    process.exit(1);
  }
}

main();
