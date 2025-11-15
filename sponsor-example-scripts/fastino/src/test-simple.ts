// Simple test to debug API calls
import { config } from "dotenv";
config();

const FASTINO_API_KEY = process.env.FASTINO_API_KEY!;

async function testSingleCall() {
  console.log("Testing single Fastino API call...");
  console.log(`API Key: ${FASTINO_API_KEY.substring(0, 15)}...`);

  const body = {
    task: "classify_text",
    text: "This is a test message",
    schema: {
      categories: ["positive", "negative", "neutral"],
    },
    threshold: 0.5
  };

  console.log("\nRequest body:", JSON.stringify(body, null, 2));
  console.log("\nSending request...");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch("https://api.fastino.ai/gliner-2", {
      method: "POST",
      headers: {
        "x-api-key": FASTINO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log(`Response status: ${res.status}`);
    console.log(`Response headers:`, Object.fromEntries(res.headers.entries()));

    const text = await res.text();
    console.log(`Response body (raw): ${text}`);

    const json = JSON.parse(text);
    console.log(`Response body (parsed):`, json);

    if (json.result) {
      console.log(`\n✅ SUCCESS! Result:`, json.result);
    }

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('❌ Request timed out after 10 seconds');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testSingleCall().then(() => {
  console.log("\n✅ Test complete");
  process.exit(0);
});
