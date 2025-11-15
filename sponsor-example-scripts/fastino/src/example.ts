// src/example.ts
import { config } from "dotenv";
import { classifyInterest, extractFeedbackFields } from "./lib/fastino.js";

// Load environment variables from .env file
config();

// Helper to add delay between API calls
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log("🔍 Fastino GLiNER-2 API Example\n");
  console.log("=" .repeat(50));

  // Example 1: Classify user interest level
  console.log("\n📊 Example 1: Classify User Interest Level");
  console.log("-".repeat(50));

  const messages = [
    "This looks interesting, tell me more about pricing",
    "I absolutely need this for my startup! When can I pre-order?",
    "Not really for me, thanks",
    "Your product stopped working after 2 days, very disappointed"
  ];

  for (const message of messages) {
    try {
      console.log(`\n💬 Message: "${message}"`);
      const interest = await classifyInterest(message);
      console.log(`✅ Interest Level: ${interest}`);
      await sleep(500); // Small delay between requests
    } catch (error: any) {
      console.error(`❌ Error:`, error.message);
    }
  }

  // Example 2: Extract structured feedback fields
  console.log("\n\n📝 Example 2: Extract Structured Feedback");
  console.log("-".repeat(50));

  const feedbackTexts = [
    "I love the SolarPanel X3 idea! Would be amazing if it had built-in battery storage though.",
    "The SmartLens Pro is exciting but I'm confused about the pricing tiers. Can you clarify?",
    "Really frustrated with the AquaFilter 2000 - the app keeps crashing when I try to set schedules."
  ];

  for (const text of feedbackTexts) {
    try {
      console.log(`\n💬 Feedback: "${text}"`);
      const feedback = await extractFeedbackFields(text);
      console.log(`✅ Extracted data:`);
      console.log(`   Product: ${feedback[0]?.product || "N/A"}`);
      console.log(`   Sentiment: ${feedback[0]?.sentiment || "N/A"}`);
      console.log(`   Feature Request: ${feedback[0]?.feature_request || "N/A"}`);
      await sleep(500); // Small delay between requests
    } catch (error: any) {
      console.error(`❌ Error:`, error.message);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("✨ Done!");
  process.exit(0); // Ensure clean exit
}

main();
