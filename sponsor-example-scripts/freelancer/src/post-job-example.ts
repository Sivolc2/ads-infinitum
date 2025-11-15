// src/post-job-example.ts
import { config } from "dotenv";

// Load environment variables FIRST
config();

import { FreelancerClient, formatCurrency } from "./lib/freelancer.js";

async function postJobExample() {
  console.log("📝 Example: Posting a Job to Freelancer.com\n");
  console.log("=".repeat(70) + "\n");

  const client = new FreelancerClient();

  try {
    // First, get job categories to find the right skill IDs
    console.log("1️⃣  Fetching job categories...");
    const categories = await client.getJobCategories();

    const webDev = categories.find((cat) => cat.name.toLowerCase().includes("website"));
    const python = categories.find((cat) => cat.name.toLowerCase().includes("python"));

    console.log(`✅ Found categories:`);
    if (webDev) console.log(`   - ${webDev.name} (ID: ${webDev.id})`);
    if (python) console.log(`   - ${python.name} (ID: ${python.id})`);

    // Prepare job data
    const jobData = {
      title: "Build a Python API for Hardware Lab Automation",
      description: `
We are looking for an experienced Python developer to build a REST API for our hardware lab automation system.

Requirements:
- Python 3.10+
- FastAPI or Flask framework
- PostgreSQL database experience
- RESTful API design
- Docker containerization

Deliverables:
- Fully functional REST API
- API documentation
- Unit tests
- Docker setup

Timeline: 2-3 weeks
Budget: $1500 - $3000 USD

Please include examples of similar projects in your proposal.
      `.trim(),
      currency: "USD",
      budget: {
        minimum: 1500,
        maximum: 3000,
      },
      jobs: [webDev?.id, python?.id].filter((id): id is number => id !== undefined),
      type: "fixed" as const,
    };

    console.log("\n2️⃣  Job details:");
    console.log(`   Title: ${jobData.title}`);
    console.log(`   Budget: ${formatCurrency(jobData.budget.minimum)} - ${formatCurrency(jobData.budget.maximum)}`);
    console.log(`   Type: ${jobData.type}`);
    console.log(`   Skills: ${jobData.jobs.join(", ")}`);

    console.log("\n⚠️  NOTE: Posting jobs requires special API permissions.");
    console.log("⚠️  This will attempt to post the job, but may fail with permission errors.");
    console.log("\n   To actually post jobs:");
    console.log("   1. Verify your API key has 'project:write' permissions");
    console.log("   2. You may need to apply for elevated API access at:");
    console.log("      https://www.freelancer.com/api\n");

    // Uncomment to actually attempt posting (will likely fail without proper permissions)
    // console.log("\n3️⃣  Attempting to post job...");
    // const result = await client.postJob(jobData);
    // console.log(`✅ Job posted successfully!`);
    // console.log(`   Project ID: ${result.id}`);
    // console.log(`   URL: https://www.freelancer.com/projects/${result.id}`);

    console.log("3️⃣  Skipping actual job posting (see note above)");
    console.log("\n💡 Instead, use the Freelancer web interface to post jobs:");
    console.log("   https://www.freelancer.com/post-project\n");

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("403") || error.message.includes("permission")) {
        console.error("\n❌ Permission Error: Your API key doesn't have permission to post jobs.");
        console.error("   Apply for elevated access at: https://www.freelancer.com/api");
      } else {
        console.error("\n❌ Error:", error.message);
      }
    } else {
      console.error("\n❌ Unknown error:", error);
    }
    process.exit(1);
  }

  console.log("=".repeat(70));
}

async function monitorJobExample() {
  console.log("\n📊 Example: Monitoring a Job\n");
  console.log("=".repeat(70) + "\n");

  const client = new FreelancerClient();

  try {
    // Search for a recent project to monitor
    console.log("1️⃣  Finding a recent project to monitor...");
    const projects = await client.searchProjects({
      query: "python",
      limit: 1,
    });

    if (projects.length === 0) {
      console.log("❌ No projects found to monitor");
      return;
    }

    const project = projects[0];
    console.log(`✅ Found project: ${project.title}`);
    console.log(`   ID: ${project.id}`);
    console.log(`   Current bids: ${project.bid_stats?.bid_count || 0}\n`);

    console.log("2️⃣  Setting up monitor (will check every 10 seconds for demo)...");
    console.log("   Press Ctrl+C to stop\n");

    let checkCount = 0;
    const maxChecks = 3; // Limit to 3 checks for demo

    const stopMonitoring = await client.monitorProject(
      project.id,
      (updatedProject) => {
        checkCount++;
        console.log(`\n🔔 Update detected!`);
        console.log(`   Project: ${updatedProject.title}`);
        console.log(`   Bids: ${updatedProject.bid_stats?.bid_count || 0}`);
        console.log(`   Avg bid: ${formatCurrency(updatedProject.bid_stats?.bid_avg || 0)}`);

        if (checkCount >= maxChecks) {
          console.log(`\n✅ Demo completed (${maxChecks} checks). Stopping monitor.`);
          stopMonitoring();
          process.exit(0);
        }
      },
      10 // Check every 10 seconds
    );

    // Keep the process alive
    await new Promise(() => {}); // This will run until stopMonitoring() is called

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

async function main() {
  await postJobExample();
  await monitorJobExample();
}

main();
