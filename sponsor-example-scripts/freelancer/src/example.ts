// src/example.ts
import { config } from "dotenv";

// Load environment variables FIRST before importing anything that uses them
config();

import { FreelancerClient, formatCurrency, formatDate } from "./lib/freelancer.js";

async function main() {
  console.log("🔧 Freelancer.com API Example\n");
  console.log("=" .repeat(70));

  try {
    const client = new FreelancerClient();

    // 1. Get authenticated user info
    console.log("\n1️⃣  Getting authenticated user info...");
    const user = await client.getSelf();
    console.log(`✅ Authenticated as: ${user.username}`);
    console.log(`   Display Name: ${user.display_name}`);
    console.log(`   User ID: ${user.id}`);

    // 2. Search for projects
    console.log("\n2️⃣  Searching for Python projects...");
    const projects = await client.searchProjects({
      query: "python api",
      limit: 5,
    });

    console.log(`✅ Found ${projects.length} projects:\n`);

    projects.forEach((project, index) => {
      const minBudget = project.budget?.minimum || 0;
      const maxBudget = project.budget?.maximum || 0;
      const currency = project.currency?.code || "USD";
      const bidCount = project.bid_stats?.bid_count || 0;
      const avgBid = project.bid_stats?.bid_avg || 0;

      console.log(`${index + 1}. ${project.title}`);
      console.log(`   ID: ${project.id}`);
      console.log(`   Budget: ${formatCurrency(minBudget, currency)} - ${formatCurrency(maxBudget, currency)}`);
      console.log(`   Bids: ${bidCount} (avg: ${formatCurrency(avgBid, currency)})`);
      console.log(`   URL: https://www.freelancer.com/projects/${project.id}\n`);
    });

    // 3. Get details of first project
    if (projects.length > 0) {
      const firstProject = projects[0];
      console.log(`3️⃣  Getting details for project: ${firstProject.title}...`);

      const details = await client.getProjectDetails(firstProject.id);
      console.log(`✅ Project Details:`);
      console.log(`   Status: ${details.status}`);
      console.log(`   Owner ID: ${details.owner_id}`);
      if (details.time_submitted) {
        console.log(`   Posted: ${formatDate(details.time_submitted)}`);
      }
      if (details.description) {
        console.log(`   Description: ${details.description.substring(0, 150)}...`);
      }
    }

    // 4. Get job categories
    console.log("\n4️⃣  Fetching available job categories...");
    const categories = await client.getJobCategories();
    console.log(`✅ Found ${categories.length} job categories`);
    console.log("\nFirst 10 categories:");
    categories.slice(0, 10).forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.name} (ID: ${cat.id})`);
    });

    console.log("\n" + "=".repeat(70));
    console.log("✅ All examples completed successfully!");

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
