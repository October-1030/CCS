#!/usr/bin/env node
/**
 * Efficient skill discovery script
 * Uses GitHub Code Search API to find repos with actual SKILL.md files
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Octokit } from "@octokit/rest";
import * as fs from "fs/promises";
import * as path from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

interface SkillRepo {
  owner: string;
  repo: string;
  fullName: string;
  url: string;
  stars: number;
  description: string;
  language: string | null;
  topics: string[];
  updatedAt: string;
}

// Search queries that directly find SKILL.md content
const CODE_SEARCH_QUERIES = [
  // Search for SKILL.md files with specific frontmatter
  'filename:SKILL.md "name:" "description:"',
  'filename:SKILL.md "allowed-tools:"',
  'filename:SKILL.md "claude" extension:md',

  // Search in specific paths
  'path:.claude filename:SKILL.md',
  'path:skills filename:SKILL.md',

  // Search for skill content patterns
  '"# Claude Code" filename:SKILL.md',
  '"agent skill" filename:SKILL.md',
];

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchCodeForSkills(query: string): Promise<Set<string>> {
  const repos = new Set<string>();
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 10) {
    try {
      const response = await octokit.rest.search.code({
        q: query,
        per_page: 100,
        page,
      });

      for (const item of response.data.items) {
        if (item.repository?.full_name) {
          repos.add(item.repository.full_name);
        }
      }

      hasMore = response.data.items.length === 100;
      page++;

      // Rate limit: 10 requests per minute for code search
      await sleep(6500);
    } catch (error: any) {
      if (error.status === 403) {
        console.log("  Rate limited, waiting 60s...");
        await sleep(60000);
      } else {
        console.error(`  Error: ${error.message}`);
        hasMore = false;
      }
    }
  }

  return repos;
}

async function getRepoInfo(fullName: string): Promise<SkillRepo | null> {
  const [owner, repo] = fullName.split("/");

  try {
    const { data } = await octokit.rest.repos.get({ owner, repo });

    return {
      owner,
      repo,
      fullName: data.full_name,
      url: data.html_url,
      stars: data.stargazers_count,
      description: data.description || "",
      language: data.language,
      topics: data.topics || [],
      updatedAt: data.updated_at,
    };
  } catch (error: any) {
    console.log(`  Failed to get info for ${fullName}: ${error.message}`);
    return null;
  }
}

async function loadExistingSkillIds(): Promise<Set<string>> {
  const indexPath = path.join(process.cwd(), "data", "skills", "index.json");
  try {
    const content = await fs.readFile(indexPath, "utf-8");
    const data = JSON.parse(content);
    return new Set(data.skills.map((s: any) => s.id));
  } catch {
    return new Set();
  }
}

function generateSkillId(owner: string, repo: string): string {
  return `${owner.toLowerCase()}-${repo.toLowerCase()}`.replace(/[^a-z0-9-]/g, "-");
}

async function main() {
  console.log("🔍 Discovering skills with SKILL.md files...\n");

  // Load existing skills
  const existingIds = await loadExistingSkillIds();
  console.log(`📦 Loaded ${existingIds.size} existing skill IDs\n`);

  // Check rate limit
  const { data: rateLimit } = await octokit.rest.rateLimit.get();
  console.log(`📊 Rate limits:`);
  console.log(`   Core: ${rateLimit.resources.core.remaining}/${rateLimit.resources.core.limit}`);
  console.log(`   Search: ${rateLimit.resources.search.remaining}/${rateLimit.resources.search.limit}`);
  console.log(`   Code Search: ${rateLimit.resources.code_search?.remaining || 'N/A'}/${rateLimit.resources.code_search?.limit || 'N/A'}\n`);

  // Collect unique repos from code search
  const allRepos = new Set<string>();

  for (const query of CODE_SEARCH_QUERIES) {
    console.log(`🔎 Searching: ${query}`);
    const repos = await searchCodeForSkills(query);
    repos.forEach(r => allRepos.add(r));
    console.log(`   Found ${repos.size} repos (${allRepos.size} unique total)\n`);
  }

  console.log(`\n✅ Total unique repos with SKILL.md: ${allRepos.size}`);

  // Filter to find new repos
  const newRepos: string[] = [];
  for (const fullName of allRepos) {
    const [owner, repo] = fullName.split("/");
    const id = generateSkillId(owner, repo);
    if (!existingIds.has(id)) {
      newRepos.push(fullName);
    }
  }

  console.log(`🆕 New repos not in database: ${newRepos.length}\n`);

  if (newRepos.length === 0) {
    console.log("No new skills to add.");
    return;
  }

  // Get repo info for new repos
  console.log("📥 Fetching repo information...\n");
  const newSkillRepos: SkillRepo[] = [];

  for (let i = 0; i < Math.min(newRepos.length, 100); i++) {
    const fullName = newRepos[i];
    console.log(`  [${i + 1}/${Math.min(newRepos.length, 100)}] ${fullName}`);

    const info = await getRepoInfo(fullName);
    if (info) {
      newSkillRepos.push(info);
    }

    // Small delay to avoid rate limits
    await sleep(100);
  }

  // Save discovered repos
  const outputPath = path.join(process.cwd(), "data", "discovered-skills.json");
  await fs.writeFile(outputPath, JSON.stringify(newSkillRepos, null, 2));

  console.log(`\n✅ Discovered ${newSkillRepos.length} new skill repos`);
  console.log(`📁 Saved to: ${outputPath}`);

  // Summary
  console.log("\n📊 Summary:");
  console.log(`   Existing skills: ${existingIds.size}`);
  console.log(`   Repos with SKILL.md found: ${allRepos.size}`);
  console.log(`   New repos discovered: ${newSkillRepos.length}`);

  if (newSkillRepos.length > 0) {
    console.log("\n🌟 Top new repos by stars:");
    const sorted = newSkillRepos.sort((a, b) => b.stars - a.stars).slice(0, 10);
    for (const repo of sorted) {
      console.log(`   ⭐ ${repo.stars} - ${repo.fullName}`);
    }
  }
}

main().catch(console.error);
