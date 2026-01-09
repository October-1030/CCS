#!/usr/bin/env node
/**
 * Search for more skill repositories on GitHub
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Octokit } from "@octokit/rest";

config({ path: resolve(process.cwd(), ".env.local") });

async function searchMoreRepos() {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  console.log("🔍 Searching for more skill repositories...\n");

  const queries = [
    'filename:SKILL.md',
    'path:.claude/skills filename:SKILL.md',
    'topic:claude-skills',
    'topic:claude-code',
    'in:readme "claude skills"',
  ];

  const foundRepos = new Map<string, any>();

  for (const query of queries) {
    console.log(`\n📝 Query: "${query}"`);

    try {
      const { data } = await octokit.search.repos({
        q: query,
        sort: "stars",
        order: "desc",
        per_page: 30,
      });

      console.log(`   Found ${data.items.length} repositories`);

      data.items.forEach((repo) => {
        const key = repo.full_name;
        if (!foundRepos.has(key)) {
          foundRepos.set(key, {
            fullName: repo.full_name,
            stars: repo.stargazers_count,
            description: repo.description,
            url: repo.html_url,
            topics: repo.topics,
            language: repo.language,
            updatedAt: repo.updated_at,
          });
        }
      });

      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.log(`   ⚠️  Error: ${error.message}`);
    }
  }

  console.log(`\n\n📊 Total unique repositories: ${foundRepos.size}\n`);
  console.log("Top repositories by stars:\n");

  const sorted = Array.from(foundRepos.values())
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 20);

  sorted.forEach((repo, i) => {
    console.log(`${(i + 1).toString().padStart(2)}. ${repo.fullName.padEnd(50)} ⭐ ${repo.stars}`);
    if (repo.description) {
      console.log(`    ${repo.description}`);
    }
    console.log();
  });
}

searchMoreRepos();
