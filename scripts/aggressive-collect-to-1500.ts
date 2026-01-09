#!/usr/bin/env node
/**
 * Aggressive collection: lower threshold, more search queries
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Octokit } from "@octokit/rest";
import { writeFileSync, readFileSync } from "fs";
import matter from "gray-matter";

config({ path: resolve(process.cwd(), ".env.local") });

function inferCategory(path: string, name: string, description: string): string {
  const text = `${path} ${name} ${description}`.toLowerCase();
  if (text.includes("frontend") || text.includes("ui") || text.includes("design") || text.includes("react")) return "frontend-development";
  if (text.includes("backend") || text.includes("api") || text.includes("server") || text.includes("database")) return "backend-development";
  if (text.includes("test") || text.includes("qa")) return "testing-quality";
  if (text.includes("devops") || text.includes("deploy") || text.includes("infrastructure")) return "devops-infrastructure";
  if (text.includes("ai") || text.includes("ml") || text.includes("data") || text.includes("research")) return "ai-data-science";
  if (text.includes("security") || text.includes("blockchain")) return "specialized";
  if (text.includes("business") || text.includes("marketing")) return "business-marketing";
  return "tools-productivity";
}

async function searchAggressive(octokit: Octokit): Promise<string[]> {
  console.log("🔍 Aggressive search for skill repositories...\n");

  const queries = [
    'filename:SKILL.md stars:>5',
    'filename:SKILL.md forks:>1',
    'filename:SKILL.md pushed:>2024-06-01',
    'path:.claude/skills',
    'path:.codex/skills',
    '"claude skill" in:readme',
    '"agent skill" in:readme',
    'topic:claude-skills',
    'topic:claude-code',
    'topic:agent-skills',
  ];

  const foundRepos = new Set<string>();

  for (const query of queries) {
    try {
      const { data } = await octokit.search.repos({
        q: query,
        sort: "updated",
        order: "desc",
        per_page: 100,
      });

      data.items.forEach((repo) => foundRepos.add(repo.full_name));
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.log(`   ⚠️  Query failed: ${query}`);
    }
  }

  return Array.from(foundRepos);
}

async function addSkillsFromRepo(
  octokit: Octokit,
  owner: string,
  repo: string,
  indexData: any,
  fullData: any,
  existingIds: Set<string>
): Promise<number> {
  let addedCount = 0;

  try {
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const { data: searchResults } = await octokit.search.code({
      q: `filename:SKILL.md repo:${owner}/${repo}`,
      per_page: 100,
    });

    if (searchResults.total_count === 0) return 0;

    for (const item of searchResults.items) {
      const skillPath = item.path;
      const parts = skillPath.split("/");
      const skillName = parts.length > 2 ? parts[parts.length - 2] : parts[0].replace(".md", "");
      const skillId = `${owner}-${repo}-${skillName}`.toLowerCase();

      if (existingIds.has(skillId)) continue;

      try {
        const { data: fileData } = await octokit.repos.getContent({ owner, repo, path: skillPath });
        if (!("content" in fileData)) continue;

        const content = Buffer.from(fileData.content, "base64").toString("utf-8");
        const { data: frontmatter, content: markdown } = matter(content);

        const skill = {
          id: skillId,
          name: frontmatter.name || skillName,
          description: frontmatter.description || "",
          repo: {
            owner, name: repo, fullName: `${owner}/${repo}`,
            url: `https://github.com/${owner}/${repo}/tree/main/${skillPath.replace("/SKILL.md", "")}`,
            defaultBranch: repoData.default_branch,
          },
          metadata: {
            stars: repoData.stargazers_count,
            forks: repoData.forks_count,
            language: repoData.language,
            topics: (repoData.topics as string[]) || [],
            updatedAt: repoData.updated_at,
            pushedAt: repoData.pushed_at,
            createdAt: repoData.created_at,
            license: repoData.license?.name,
          },
          category: inferCategory(skillPath, frontmatter.name || skillName, frontmatter.description || ""),
          tags: frontmatter.tags || [],
          skillMd: { raw: content, frontmatter, content: markdown },
        };

        indexData.skills.push({
          id: skill.id, name: skill.name, description: skill.description,
          category: skill.category, tags: skill.tags, stars: skill.metadata.stars,
          updatedAt: skill.metadata.updatedAt, repoUrl: skill.repo.url,
        });

        fullData[skill.id] = skill;
        existingIds.add(skillId);
        addedCount++;

        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        // Skip
      }
    }

    if (addedCount > 0) {
      console.log(`   ✅ ${owner}/${repo} +${addedCount} (⭐${repoData.stargazers_count})`);
    }
  } catch (error: any) {
    if (error.status === 403) {
      console.log(`   ⏸️  Rate limit - waiting 60s`);
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
  }

  return addedCount;
}

async function aggressiveCollect() {
  console.log(`🎯 Aggressive collection to 1500 skills\n`);

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const indexPath = resolve(process.cwd(), "data/skills/index.json");
  const fullPath = resolve(process.cwd(), "data/skills/skills-full.json");

  const indexData = JSON.parse(readFileSync(indexPath, "utf-8"));
  const fullData = JSON.parse(readFileSync(fullPath, "utf-8"));
  const existingIds = new Set(Object.keys(fullData));

  const startCount = indexData.totalSkills;
  console.log(`📊 Starting: ${startCount} skills`);
  console.log(`📈 Target: 1500 skills (need ${1500 - startCount} more)\n`);

  const repos = await searchAggressive(octokit);
  console.log(`\n✅ Found ${repos.length} repositories\n`);

  let totalAdded = 0;
  let processedCount = 0;

  for (const fullName of repos) {
    const [owner, repo] = fullName.split("/");
    const repoKey = `${owner}-${repo}`;

    // Skip if already have skills from this repo
    if (indexData.skills.some((s: any) => s.id.startsWith(repoKey))) {
      continue;
    }

    const added = await addSkillsFromRepo(octokit, owner, repo, indexData, fullData, existingIds);
    if (added > 0) {
      totalAdded += added;
      processedCount++;

      if (startCount + totalAdded >= 1500) {
        console.log(`\n🎉 Reached 1500 skills target!`);
        break;
      }

      if (processedCount % 10 === 0) {
        console.log(`\n--- Progress: ${startCount + totalAdded}/1500 ---\n`);
      }
    }
  }

  indexData.totalSkills = indexData.skills.length;
  indexData.lastSync = new Date().toISOString();

  writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  writeFileSync(fullPath, JSON.stringify(fullData, null, 2));

  console.log(`\n✅ Collection Complete!`);
  console.log(`➕ Added: ${totalAdded} skills from ${processedCount} repos`);
  console.log(`📊 Total: ${indexData.totalSkills} skills`);
}

aggressiveCollect();
