// src/search-example.ts
import { config } from "dotenv";

// Load environment variables FIRST
config();

import { FreelancerClient, formatCurrency } from "./lib/freelancer.js";

async function searchByBudget() {
  console.log("💰 Searching for projects with budget $500-$5000...\n");

  const client = new FreelancerClient();

  const projects = await client.searchProjects({
    query: "web development",
    min_budget: 500,
    max_budget: 5000,
    limit: 10,
  });

  console.log(`Found ${projects.length} projects:\n`);

  projects.forEach((project, index) => {
    const minBudget = project.budget?.minimum || 0;
    const maxBudget = project.budget?.maximum || 0;
    const currency = project.currency?.code || "USD";
    const bidCount = project.bid_stats?.bid_count || 0;

    console.log(`${index + 1}. ${project.title}`);
    console.log(`   Budget: ${formatCurrency(minBudget, currency)} - ${formatCurrency(maxBudget, currency)}`);
    console.log(`   Bids: ${bidCount}`);
    console.log(`   URL: https://www.freelancer.com/projects/${project.id}\n`);
  });
}

async function searchBySkills() {
  console.log("🎯 Searching for projects requiring specific skills...\n");

  const client = new FreelancerClient();

  // First, get available skills to find IDs
  console.log("Fetching job categories to find skill IDs...");
  const categories = await client.getJobCategories();

  // Find Python and JavaScript skill IDs
  const python = categories.find((cat) => cat.name.toLowerCase().includes("python"));
  const javascript = categories.find((cat) => cat.name.toLowerCase().includes("javascript"));

  if (python && javascript) {
    console.log(`Found skills: Python (ID: ${python.id}), JavaScript (ID: ${javascript.id})\n`);

    const projects = await client.searchProjects({
      skills: [python.id, javascript.id],
      limit: 5,
    });

    console.log(`Found ${projects.length} projects requiring Python or JavaScript:\n`);

    projects.forEach((project, index) => {
      const minBudget = project.budget?.minimum || 0;
      const maxBudget = project.budget?.maximum || 0;
      const currency = project.currency?.code || "USD";

      console.log(`${index + 1}. ${project.title}`);
      console.log(`   Budget: ${formatCurrency(minBudget, currency)} - ${formatCurrency(maxBudget, currency)}`);
      console.log(`   URL: https://www.freelancer.com/projects/${project.id}\n`);
    });
  } else {
    console.log("Could not find Python/JavaScript skill IDs");
  }
}

async function main() {
  console.log("🔍 Freelancer.com Project Search Examples\n");
  console.log("=".repeat(70) + "\n");

  try {
    await searchByBudget();
    console.log("\n" + "=".repeat(70) + "\n");
    await searchBySkills();

    console.log("\n" + "=".repeat(70));
    console.log("✅ Search examples completed!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
