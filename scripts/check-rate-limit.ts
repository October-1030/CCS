#!/usr/bin/env node
import { config } from "dotenv";
import { resolve } from "path";
import { Octokit } from "@octokit/rest";

config({ path: resolve(process.cwd(), ".env.local") });

async function checkRateLimit() {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  try {
    const { data } = await octokit.rateLimit.get();

    const core = data.resources.core;
    const search = data.resources.search;

    const coreReset = new Date(core.reset * 1000);
    const searchReset = new Date(search.reset * 1000);
    const now = new Date();

    console.log('\n📊 GitHub API Rate Limit Status\n');
    console.log('Core API:');
    console.log(`  Limit: ${core.limit}`);
    console.log(`  Used: ${core.used}`);
    console.log(`  Remaining: ${core.remaining}`);
    console.log(`  Reset: ${coreReset.toLocaleString()}`);
    console.log(`  Time until reset: ${Math.ceil((coreReset.getTime() - now.getTime()) / 60000)} minutes\n`);

    console.log('Search API (most important for skill collection):');
    console.log(`  Limit: ${search.limit}`);
    console.log(`  Used: ${search.used}`);
    console.log(`  Remaining: ${search.remaining}`);
    console.log(`  Reset: ${searchReset.toLocaleString()}`);
    console.log(`  Time until reset: ${Math.ceil((searchReset.getTime() - now.getTime()) / 60000)} minutes\n`);

    if (search.remaining === 0) {
      console.log('⚠️  Search API limit exhausted. Wait until reset time to continue.');
    } else if (search.remaining < 10) {
      console.log('⚠️  Search API limit almost exhausted. Consider waiting.');
    } else {
      console.log('✅ Search API has available quota. You can continue collecting skills.');
    }
  } catch (error: any) {
    console.error('❌ Error checking rate limit:', error.message);
    process.exit(1);
  }
}

checkRateLimit();
