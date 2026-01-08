#!/usr/bin/env node
/**
 * CLI script to sync skills from GitHub
 *
 * Usage:
 *   npm run sync              # Incremental sync
 *   npm run sync:full         # Full sync (reset all data)
 *   npm run sync -- --limit 100  # Limit results
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

import { syncSkills } from "@/lib/github/sync";

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const full = args.includes("--full");
  const limitArg = args.find((arg) => arg.startsWith("--limit"));
  const maxSkills = limitArg ? parseInt(limitArg.split("=")[1]) : undefined;

  console.log("╔════════════════════════════════════════╗");
  console.log("║   Skills Marketplace - Data Sync      ║");
  console.log("╚════════════════════════════════════════╝\n");

  console.log(`Mode: ${full ? "Full Sync" : "Incremental Sync"}`);
  if (maxSkills) {
    console.log(`Limit: ${maxSkills} skills per query`);
  }
  console.log();

  // Check for GitHub token
  if (!process.env.GITHUB_TOKEN) {
    console.error("❌ Error: GITHUB_TOKEN environment variable is not set");
    console.error("\nPlease create a .env.local file with:");
    console.error("GITHUB_TOKEN=your_token_here");
    console.error("\nGenerate a token at: https://github.com/settings/tokens");
    process.exit(1);
  }

  try {
    const result = await syncSkills({
      full,
      maxSkills,
      onProgress: (message, current, total) => {
        if (current !== undefined && total !== undefined) {
          const percent = ((current / total) * 100).toFixed(1);
          process.stdout.write(`\r${message} [${percent}%]`);
        } else {
          console.log(message);
        }
      },
    });

    console.log("\n\n╔════════════════════════════════════════╗");
    console.log("║           Sync Summary                 ║");
    console.log("╚════════════════════════════════════════╝");
    console.log(`✅ Total skills: ${result.totalSkills}`);
    console.log(`✨ New skills: ${result.newSkills}`);
    console.log(`🔄 Updated skills: ${result.updatedSkills}`);
    console.log(`❌ Errors: ${result.errors}`);
    console.log(`⏱️  Duration: ${(result.duration / 1000).toFixed(2)}s`);
    console.log();

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Sync failed:", error.message);
    if (error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
