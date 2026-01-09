#!/usr/bin/env node
/**
 * Explore top repositories to check for SKILL.md files
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Octokit } from "@octokit/rest";

config({ path: resolve(process.cwd(), ".env.local") });

const REPOS_TO_EXPLORE = [
  "ComposioHQ/awesome-claude-skills",
  "nextlevelbuilder/ui-ux-pro-max-skill",
  "wshobson/agents",
  "hesreallyhim/awesome-claude-code",
  "oraios/serena",
];

async function exploreRepo(octokit: Octokit, owner: string, name: string) {
  console.log(`\n📦 ${owner}/${name}`);

  try {
    // Get repository info
    const { data: repo } = await octokit.repos.get({ owner, repo: name });
    console.log(`   ⭐ ${repo.stargazers_count} stars`);
    console.log(`   📝 ${repo.description || "No description"}`);

    // Search for SKILL.md files
    try {
      const { data: searchResults } = await octokit.search.code({
        q: `filename:SKILL.md repo:${owner}/${name}`,
        per_page: 100,
      });

      console.log(`   📄 Found ${searchResults.total_count} SKILL.md files`);

      if (searchResults.total_count > 0) {
        // Try to get directory structure
        try {
          const { data: contents } = await octokit.repos.getContent({
            owner,
            repo: name,
            path: "",
          });

          if (Array.isArray(contents)) {
            const skillDirs = contents.filter(
              (item) => item.type === "dir" && (item.name.includes("skill") || item.name.includes(".claude"))
            );
            console.log(`   📁 Skill directories:`, skillDirs.map(d => d.name).join(", ") || "None");
          }
        } catch (error) {
          // Ignore
        }

        // List first few skill files
        searchResults.items.slice(0, 5).forEach((item, i) => {
          console.log(`      ${i + 1}. ${item.path}`);
        });
      }
    } catch (error: any) {
      console.log(`   ⚠️  Could not search code: ${error.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function exploreTopRepos() {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  console.log("🔍 Exploring top repositories for SKILL.md files...\n");

  for (const fullName of REPOS_TO_EXPLORE) {
    const [owner, name] = fullName.split("/");
    await exploreRepo(octokit, owner, name);
  }

  console.log("\n✅ Exploration complete!\n");
}

exploreTopRepos();
