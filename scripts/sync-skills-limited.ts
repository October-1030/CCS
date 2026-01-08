#!/usr/bin/env node
/**
 * Limited sync for testing (first 50 skills)
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });

import { syncSkills } from "@/lib/github/sync";

async function main() {
  console.log("╔════════════════════════════════════════╗");
  console.log("║   Quick Test Sync (50 skills)         ║");
  console.log("╚════════════════════════════════════════╝\n");

  try {
    const result = await syncSkills({
      maxSkills: 50,  // Limit to 50 skills
      full: true,
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
    process.exit(1);
  }
}

main();
