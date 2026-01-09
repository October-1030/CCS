#!/usr/bin/env node
/**
 * Find repositories with multiple SKILL.md files
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Octokit } from "@octokit/rest";
import { readFileSync } from "fs";

config({ path: resolve(process.cwd(), ".env.local") });

async function findReposWithMultipleSkills() {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  console.log("🔍 Finding repositories with multiple SKILL.md files...\n");

  // Load existing repos to skip
  const indexPath = resolve(process.cwd(), "data/skills/index.json");
  const indexData = JSON.parse(readFileSync(indexPath, "utf-8"));
  const existingRepos = new Set(
    indexData.skills.map((s: any) => `${s.id.split("-")[0]}-${s.id.split("-")[1]}`)
  );

  const reposToCheck = [
    "alirezarezvani/claude-skills",
    "alirezarezvani/claude-code-tresor",
    "GuDaStudio/skills",
    "obra/superpowers-skills",
    "numman-ali/n-skills",
    "Dammyjay93/claude-design-skill",
    "fcakyon/claude-codex-settings",
    "jarrodwatts/claude-code-config",
    "Kamalnrf/claude-plugins",
  ];

  const results: any[] = [];

  for (const fullName of reposToCheck) {
    const [owner, repo] = fullName.split("/");
    const key = `${owner}-${repo}`;

    if (existingRepos.has(key)) {
      console.log(`⏭️  ${fullName} - already added`);
      continue;
    }

    console.log(`\n📦 Checking ${fullName}...`);

    try {
      const { data: repoData } = await octokit.repos.get({ owner, repo });

      const { data: searchResults } = await octokit.search.code({
        q: `filename:SKILL.md repo:${fullName}`,
        per_page: 100,
      });

      const skillCount = searchResults.total_count;

      console.log(`   ⭐ ${repoData.stargazers_count} stars`);
      console.log(`   📄 ${skillCount} SKILL.md file(s)`);

      if (skillCount > 0) {
        results.push({
          fullName,
          owner,
          repo,
          stars: repoData.stargazers_count,
          skillCount,
          description: repoData.description,
        });
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log("\n\n📊 Repositories with multiple skills:\n");

  results
    .sort((a, b) => b.skillCount - a.skillCount)
    .forEach((repo) => {
      console.log(`${repo.fullName.padEnd(50)} ${repo.skillCount} skills (⭐ ${repo.stars})`);
      if (repo.description) {
        console.log(`   ${repo.description}`);
      }
      console.log();
    });

  console.log(`\n✅ Found ${results.length} repositories to add\n`);
}

findReposWithMultipleSkills();
