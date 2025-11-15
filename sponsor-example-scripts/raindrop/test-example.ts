/**
 * Test Example for Raindrop Ad Optimizer
 *
 * This demonstrates how to call the /optimize-ads endpoint.
 * Note: This requires the Raindrop service to be running.
 */

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

type OptimizeResponse = {
  suggestedHeadlines: string[];
  suggestedBodies: string[];
  strategyNotes: string;
};

async function testAdOptimizer(baseUrl: string) {
  const request: OptimizeRequest = {
    productName: "Smart Home Hub",
    audience: "Tech-savvy millennials aged 25-40",
    samples: [
      {
        id: "ad-1",
        copy: "Transform your home with AI - Get 30% off today!",
        impressions: 10000,
        clicks: 250,
        spend: 125.50,
      },
      {
        id: "ad-2",
        copy: "Smart living made simple. Control everything from your phone.",
        impressions: 8500,
        clicks: 320,
        spend: 110.00,
      },
      {
        id: "ad-3",
        copy: "Join 10,000+ homeowners who upgraded to smart living",
        impressions: 9200,
        clicks: 180,
        spend: 98.50,
      },
    ],
  };

  console.log("Sending request to:", `${baseUrl}/optimize-ads`);
  console.log("Request data:", JSON.stringify(request, null, 2));

  try {
    const response = await fetch(`${baseUrl}/optimize-ads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: OptimizeResponse = await response.json();

    console.log("\n✅ Success! Optimization results:");
    console.log("\n📝 Suggested Headlines:");
    result.suggestedHeadlines.forEach((headline, i) => {
      console.log(`  ${i + 1}. ${headline}`);
    });

    console.log("\n📝 Suggested Bodies:");
    result.suggestedBodies.forEach((body, i) => {
      console.log(`  ${i + 1}. ${body}`);
    });

    console.log("\n💡 Strategy Notes:");
    console.log(result.strategyNotes);
  } catch (error) {
    console.error("❌ Error calling ad optimizer:", error);
  }
}

// Example usage:
// Uncomment when Raindrop service is deployed
// testAdOptimizer("https://your-raindrop-url.raindrop.app");

// For local development (after running `raindrop dev`):
// testAdOptimizer("http://localhost:8787");

console.log("🚀 Raindrop Ad Optimizer Test Example");
console.log("To run this test:");
console.log("1. Deploy your Raindrop service: npm run deploy");
console.log("2. Update the URL in this file");
console.log("3. Run: npx tsx test-example.ts");
