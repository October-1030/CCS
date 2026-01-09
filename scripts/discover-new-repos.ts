#!/usr/bin/env node
/**
 * Discover new repositories with SKILL.md files
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Octokit } from "@octokit/rest";

config({ path: resolve(process.cwd(), ".env.local") });

async function discoverNewRepos() {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  console.log("🔍 Discovering new skill repositories...\n");

  // Different search strategies
  const queries = [
    'path:.claude/skills',
    'path:.codex/skills',
    'filename:SKILL.md stars:>10',
    'filename:SKILL.md pushed:>2024-01-01',
    '"claude code" skill',
    '"agent skill" claude',
  ];

  const allRepos = new Map<string, any>();

  for (const query of queries) {
    console.log(`\n📝 Searching: "${query}"`);

    try {
      const { data } = await octokit.search.repos({
        q: query,
        sort: "stars",
        order: "desc",
        per_page: 30,
      });

      console.log(`   Found ${data.items.length} repositories`);

      for (const repo of data.items) {
        if (!allRepos.has(repo.full_name)) {
          allRepos.set(repo.full_name, {
            fullName: repo.full_name,
            stars: repo.stargazers_count,
            description: repo.description,
            url: repo.html_url,
            language: repo.language,
            updatedAt: repo.updated_at,
          });
        }
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.log(`   ⚠️  Error: ${error.message}`);
    }
  }

  console.log(`\n\n📊 Total unique repositories: ${allRepos.size}\n`);
  console.log("Top 30 repositories by stars:\n");

  const sorted = Array.from(allRepos.values())
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 30);

  for (let i = 0; i < sorted.length; i++) {
    const repo = sorted[i];
    console.log(`${(i + 1).toString().padStart(2)}. ${repo.fullName.padEnd(50)} ⭐ ${repo.stars}`);
    if (repo.description) {
      console.log(`    ${repo.description.substring(0, 100)}`);
    }

    // Check if repo has SKILL.md files
    try {
      const { data: searchResults } = await octokit.search.code({
        q: `filename:SKILL.md repo:${repo.fullName}`,
        per_page: 1,
      });

      if (searchResults.total_count > 0) {
        console.log(`    ✅ Has ${searchResults.total_count} SKILL.md file(s)`);
      }
    } catch (error) {
      // Ignore
    }

    console.log();
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
}

discoverNewRepos();
