#!/usr/bin/env node
/**
 * Batch collect skills to reach 1000+ target
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Octokit } from "@octokit/rest";
import { writeFileSync, readFileSync } from "fs";
import matter from "gray-matter";

config({ path: resolve(process.cwd(), ".env.local") });

// Extended list of repositories to check
const REPOS_TO_ADD = [
  "Dammyjay93/claude-design-skill",
  "fcakyon/claude-codex-settings",
  "jarrodwatts/claude-code-config",
  "Kamalnrf/claude-plugins",
  "zechenzhangAGI/AI-research-SKILLs",
  "Prat011/awesome-llm-skills",
  "heilcheng/awesome-agent-skills",
  "CloudAI-X/claude-workflow-v2",
  "gadievron/raptor",
];

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

    console.log(`   📦 ${owner}/${repo} - Found ${searchResults.total_count} skills`);

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
      console.log(`   ⚠️  Rate limit - stopping`);
      return addedCount;
    }
  }

  return addedCount;
}

async function batchCollect() {
  console.log(`🎯 Target: Collect to 1000+ skills\n`);

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const indexPath = resolve(process.cwd(), "data/skills/index.json");
  const fullPath = resolve(process.cwd(), "data/skills/skills-full.json");

  const indexData = JSON.parse(readFileSync(indexPath, "utf-8"));
  const fullData = JSON.parse(readFileSync(fullPath, "utf-8"));
  const existingIds = new Set(Object.keys(fullData));

  const startCount = indexData.totalSkills;
  console.log(`📊 Starting with: ${startCount} skills`);
  console.log(`📈 Need to add: ${1000 - startCount} more skills\n`);

  let totalAdded = 0;

  for (const fullName of REPOS_TO_ADD) {
    const [owner, repo] = fullName.split("/");
    const added = await addSkillsFromRepo(octokit, owner, repo, indexData, fullData, existingIds);
    totalAdded += added;

    console.log(`      ✅ Added ${added} skills | Total now: ${startCount + totalAdded}\n`);

    if (startCount + totalAdded >= 1000) {
      console.log(`🎉 Reached 1000 skills target!`);
      break;
    }
  }

  indexData.totalSkills = indexData.skills.length;
  indexData.lastSync = new Date().toISOString();

  writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  writeFileSync(fullPath, JSON.stringify(fullData, null, 2));

  console.log(`\n✅ Batch Collection Complete!`);
  console.log(`➕ Added: ${totalAdded} new skills`);
  console.log(`📊 Total: ${indexData.totalSkills} skills`);
}

batchCollect();
