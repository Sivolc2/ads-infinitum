/**
 * Example TypeScript MCP Client for Ads Infinitum
 *
 * This demonstrates how to connect to MCPTotal-hosted MCP servers
 * and orchestrate tools across multiple providers.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFileSync } from "fs";

// Types for our ad optimization workflow
interface AdVariant {
  id: string;
  headline: string;
  body: string;
  impressions: number;
  clicks: number;
  spend: number;
}

interface OptimizationResult {
  suggestedHeadlines: string[];
  suggestedBodies: string[];
  strategyNotes: string;
  generatedImages?: string[];
}

/**
 * MCPTotal Client Wrapper
 * Handles authentication and routing to MCPTotal gateway
 */
class MCPTotalClient {
  private config: any;
  private clients: Map<string, Client> = new Map();

  constructor(configPath: string) {
    const configData = readFileSync(configPath, "utf-8");
    this.config = JSON.parse(configData);

    // Replace environment variables
    const token = process.env.MCPTOTAL_API_TOKEN;
    if (!token) {
      throw new Error("MCPTOTAL_API_TOKEN environment variable not set");
    }

    this.config = JSON.parse(
      configData.replace(/\$\{MCPTOTAL_API_TOKEN\}/g, token)
    );
  }

  /**
   * Initialize connection to a specific MCP server through MCPTotal
   */
  async connectToServer(serverName: string): Promise<Client> {
    const clientConfig = this.config.clients["ads-infinitum-agent"];
    const serverConfig = clientConfig.servers[serverName];

    if (!serverConfig) {
      throw new Error(`Server ${serverName} not found in config`);
    }

    // Create MCP client with MCPTotal gateway endpoint
    const transport = new StdioClientTransport({
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-fetch",
        serverConfig.url,
      ],
      env: {
        ...process.env,
        MCP_SERVER_TOKEN: serverConfig.token,
      },
    });

    const client = new Client(
      {
        name: `ads-infinitum-${serverName}`,
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
    this.clients.set(serverName, client);

    console.log(`✓ Connected to ${serverName} via MCPTotal`);
    return client;
  }

  /**
   * Get a connected client for a specific server
   */
  getClient(serverName: string): Client | undefined {
    return this.clients.get(serverName);
  }

  /**
   * Disconnect all clients
   */
  async disconnect(): Promise<void> {
    for (const [name, client] of this.clients.entries()) {
      await client.close();
      console.log(`✓ Disconnected from ${name}`);
    }
    this.clients.clear();
  }
}

/**
 * Example: Optimize ad campaign using multiple MCP servers
 */
async function optimizeAdCampaign(
  mcpClient: MCPTotalClient,
  productName: string,
  audience: string,
  variants: AdVariant[]
): Promise<OptimizationResult> {

  // Step 1: Use Raindrop MCP to analyze variants and get suggestions
  console.log("\n📊 Step 1: Analyzing variants with Raindrop MCP...");
  const raindropClient = mcpClient.getClient("raindrop");
  if (!raindropClient) {
    throw new Error("Raindrop client not connected");
  }

  const optimizationResponse = await raindropClient.request(
    {
      method: "tools/call",
      params: {
        name: "optimize_ads",
        arguments: {
          productName,
          audience,
          samples: variants,
        },
      },
    },
    {}
  );

  const suggestions = optimizationResponse.content as any;

  // Step 2: Use Daft MCP for parallel prompt engineering on variants
  console.log("\n🔄 Step 2: Running parallel analysis with Daft MCP...");
  const daftClient = mcpClient.getClient("daft-marketing");
  if (daftClient) {
    await daftClient.request(
      {
        method: "tools/call",
        params: {
          name: "analyze_variants",
          arguments: {
            variants: variants.map(v => ({
              copy: `${v.headline} - ${v.body}`,
              ctr: v.clicks / (v.impressions || 1),
              cpc: v.spend / (v.clicks || 1),
            })),
          },
        },
      },
      {}
    );
  }

  // Step 3: Use Freepik MCP to generate images for top variants
  console.log("\n🎨 Step 3: Generating creative images with Freepik MCP...");
  const freepikClient = mcpClient.getClient("freepik");
  const generatedImages: string[] = [];

  if (freepikClient) {
    for (const headline of suggestions.suggestedHeadlines.slice(0, 2)) {
      const imageResponse = await freepikClient.request(
        {
          method: "tools/call",
          params: {
            name: "generate_image",
            arguments: {
              prompt: `${productName} campaign: ${headline}, ${audience}, solarpunk aesthetic`,
            },
          },
        },
        {}
      );
      generatedImages.push((imageResponse.content as any).base64);
    }
  }

  return {
    suggestedHeadlines: suggestions.suggestedHeadlines,
    suggestedBodies: suggestions.suggestedBodies,
    strategyNotes: suggestions.strategyNotes,
    generatedImages,
  };
}

/**
 * Main execution
 */
async function main() {
  console.log("🚀 Ads Infinitum - MCPTotal Integration Example\n");

  // Initialize MCPTotal client
  const mcpClient = new MCPTotalClient("./mcp-config.json");

  try {
    // Connect to all required MCP servers
    await mcpClient.connectToServer("raindrop");
    await mcpClient.connectToServer("daft-marketing");
    await mcpClient.connectToServer("freepik");

    // Example ad variants data
    const variants: AdVariant[] = [
      {
        id: "var_1",
        headline: "Build Tomorrow's Hardware Today",
        body: "Join 500+ makers in our solarpunk hardware lab",
        impressions: 10000,
        clicks: 250,
        spend: 125.50,
      },
      {
        id: "var_2",
        headline: "Your Hardware Idea, Our Lab",
        body: "From prototype to production in weeks, not months",
        impressions: 9500,
        clicks: 380,
        spend: 142.30,
      },
    ];

    // Run optimization
    const result = await optimizeAdCampaign(
      mcpClient,
      "Solarpunk Hardware Lab",
      "Makers, hardware enthusiasts, sustainable tech advocates",
      variants
    );

    // Display results
    console.log("\n✨ Optimization Results:\n");
    console.log("📝 Suggested Headlines:");
    result.suggestedHeadlines.forEach((h, i) =>
      console.log(`   ${i + 1}. ${h}`)
    );

    console.log("\n📝 Suggested Body Copy:");
    result.suggestedBodies.forEach((b, i) =>
      console.log(`   ${i + 1}. ${b}`)
    );

    console.log(`\n💡 Strategy Notes:\n${result.strategyNotes}`);

    if (result.generatedImages && result.generatedImages.length > 0) {
      console.log(`\n🎨 Generated ${result.generatedImages.length} campaign images`);
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    // Clean up connections
    await mcpClient.disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { MCPTotalClient, optimizeAdCampaign };
