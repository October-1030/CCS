#!/usr/bin/env node
/**
 * Check specific high-star repos for SKILL.md files
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Octokit } from "@octokit/rest";

config({ path: resolve(process.cwd(), ".env.local") });

// List of promising repositories to check
const REPOS_TO_CHECK = [
  "anthropics/anthropic-quickstarts",
  "anthropics/prompt-eng-interactive-tutorial",
  "modelcontextprotocol/servers",
  "mckaywrigley/claude-artifacts",
  "vercel/ai",
  "BuilderIO/ai-shell",
  "e2b-dev/awesome-ai-agents",
  "f/awesome-chatgpt-prompts",
  "transitive-bullshit/chatgpt-api",
  "langchain-ai/langchain",
  "hwchase17/langchain",
  "lencx/ChatGPT",
  "xtekky/gpt4free",
  "Significant-Gravitas/AutoGPT",
  "geekan/MetaGPT",
  "QuivrHQ/quivr",
  "run-llama/llama_index",
];

async function checkRepo(octokit: Octokit, fullName: string) {
  const [owner, name] = fullName.split("/");

  console.log(`\n📦 ${fullName}`);

  try {
    const { data: repo } = await octokit.repos.get({ owner, repo: name });
    console.log(`   ⭐ ${repo.stargazers_count} stars`);

    // Search for SKILL.md files
    try {
      const { data: searchResults } = await octokit.search.code({
        q: `filename:SKILL.md repo:${fullName}`,
        per_page: 5,
      });

      if (searchResults.total_count > 0) {
        console.log(`   ✅ Found ${searchResults.total_count} SKILL.md file(s)`);
        searchResults.items.slice(0, 3).forEach((item) => {
          console.log(`      - ${item.path}`);
        });
      } else {
        console.log(`   ❌ No SKILL.md files`);
      }
    } catch (codeError) {
      console.log(`   ⚠️  Could not search code`);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function checkSpecificRepos() {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  console.log("🔍 Checking specific high-quality repositories...\n");

  for (const repo of REPOS_TO_CHECK) {
    await checkRepo(octokit, repo);
  }

  console.log("\n✅ Check complete!\n");
}

checkSpecificRepos();
