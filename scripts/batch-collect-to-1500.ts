#!/usr/bin/env node
/**
 * Batch collect skills from 1000 to 1500
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Octokit } from "@octokit/rest";
import { writeFileSync, readFileSync } from "fs";
import matter from "gray-matter";

config({ path: resolve(process.cwd(), ".env.local") });

function inferCategory(path: string, name: string, description: string): string {
  const text = `${path} ${name} ${description}`.toLowerCase();

  if (text.includes("frontend") || text.includes("ui") || text.includes("design") || text.includes("react")) {
    return "frontend-development";
  }
  if (text.includes("backend") || text.includes("api") || text.includes("server") || text.includes("database")) {
    return "backend-development";
  }
  if (text.includes("test") || text.includes("qa")) {
    return "testing-quality";
  }
  if (text.includes("devops") || text.includes("deploy") || text.includes("infrastructure")) {
    return "devops-infrastructure";
  }
  if (text.includes("ai") || text.includes("ml") || text.includes("data") || text.includes("research")) {
    return "ai-data-science";
  }
  if (text.includes("security") || text.includes("blockchain")) {
    return "specialized";
  }
  if (text.includes("business") || text.includes("marketing")) {
    return "business-marketing";
  }
  return "tools-productivity";
}

async function searchForMoreRepos(octokit: Octokit): Promise<string[]> {
  console.log("🔍 Searching for more repositories with SKILL.md files...\n");

  const queries = [
    'filename:SKILL.md stars:>50',
    'filename:SKILL.md forks:>5',
    'path:.claude/skills stars:>10',
    '"claude code skill" in:readme',
    '"agent skill" in:readme stars:>10',
  ];

  const foundRepos = new Set<string>();

  for (const query of queries) {
    try {
      const { data } = await octokit.search.repos({
        q: query,
        sort: "stars",
        order: "desc",
        per_page: 50,
      });

      data.items.forEach((repo) => {
        foundRepos.add(repo.full_name);
      });

      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
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

    console.log(`   📦 ${owner}/${repo} (⭐${repoData.stargazers_count}) - ${searchResults.total_count} skills`);

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
            owner,
            name: repo,
            fullName: `${owner}/${repo}`,
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
          id: skill.id,
          name: skill.name,
          description: skill.description,
          category: skill.category,
          tags: skill.tags,
          stars: skill.metadata.stars,
          updatedAt: skill.metadata.updatedAt,
          repoUrl: skill.repo.url,
        });

        fullData[skill.id] = skill;
        existingIds.add(skillId);
        addedCount++;

        await new Promise(resolve => setTimeout(resolve, 600));
      } catch (error) {
        // Skip failed skills
      }
    }
  } catch (error: any) {
    if (error.status === 403) {
      console.log(`   ⚠️  Rate limit - pausing 60s`);
      await new Promise(resolve => setTimeout(resolve, 60000));
      return addedCount;
    }
  }

  return addedCount;
}

async function batchCollectTo1500() {
  console.log(`🎯 Target: Collect from 1000 to 1500 skills\n`);

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const indexPath = resolve(process.cwd(), "data/skills/index.json");
  const fullPath = resolve(process.cwd(), "data/skills/skills-full.json");

  const indexData = JSON.parse(readFileSync(indexPath, "utf-8"));
  const fullData = JSON.parse(readFileSync(fullPath, "utf-8"));
  const existingIds = new Set(Object.keys(fullData));

  const startCount = indexData.totalSkills;
  console.log(`📊 Starting with: ${startCount} skills`);
  console.log(`📈 Need to add: ${1500 - startCount} more skills\n`);

  // Search for repositories
  const repos = await searchForMoreRepos(octokit);
  console.log(`\n✅ Found ${repos.length} potential repositories\n`);

  let totalAdded = 0;
  let processedRepos = 0;

  for (const fullName of repos) {
    const [owner, repo] = fullName.split("/");

    // Skip if we already have skills from this repo
    const repoKey = `${owner}-${repo}`;
    const hasSkillsFromRepo = indexData.skills.some((s: any) =>
      s.id.startsWith(repoKey)
    );

    if (hasSkillsFromRepo) {
      continue;
    }

    const added = await addSkillsFromRepo(octokit, owner, repo, indexData, fullData, existingIds);

    if (added > 0) {
      totalAdded += added;
      processedRepos++;
      console.log(`      ✅ +${added} | Total: ${startCount + totalAdded} | Repos: ${processedRepos}\n`);
    }

    if (startCount + totalAdded >= 1500) {
      console.log(`🎉 Reached 1500 skills target!`);
      break;
    }

    // Progress update every 10 repos
    if (processedRepos % 10 === 0) {
      console.log(`\n--- Progress: ${startCount + totalAdded}/1500 skills (${processedRepos} repos processed) ---\n`);
    }
  }

  indexData.totalSkills = indexData.skills.length;
  indexData.lastSync = new Date().toISOString();

  writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  writeFileSync(fullPath, JSON.stringify(fullData, null, 2));

  console.log(`\n✅ Batch Collection Complete!`);
  console.log(`➕ Added: ${totalAdded} new skills from ${processedRepos} repositories`);
  console.log(`📊 Total: ${indexData.totalSkills} skills`);
}

batchCollectTo1500();
