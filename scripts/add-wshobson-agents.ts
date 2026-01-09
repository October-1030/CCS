#!/usr/bin/env node
/**
 * Add skills from wshobson/agents
 * 111 skills from a highly-starred repository
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Octokit } from "@octokit/rest";
import { writeFileSync, readFileSync } from "fs";
import matter from "gray-matter";

config({ path: resolve(process.cwd(), ".env.local") });

const OWNER = "wshobson";
const REPO = "agents";

// Category inference based on plugin path
function inferCategory(path: string): string {
  const pathLower = path.toLowerCase();

  if (pathLower.includes("blockchain") || pathLower.includes("web3") || pathLower.includes("security")) {
    return "specialized";
  }
  if (pathLower.includes("database")) {
    return "backend-development";
  }
  if (pathLower.includes("payment") || pathLower.includes("ecommerce")) {
    return "business-marketing";
  }
  if (pathLower.includes("api") || pathLower.includes("backend")) {
    return "backend-development";
  }
  if (pathLower.includes("frontend") || pathLower.includes("ui") || pathLower.includes("design")) {
    return "frontend-development";
  }
  if (pathLower.includes("test") || pathLower.includes("qa")) {
    return "testing-quality";
  }
  if (pathLower.includes("devops") || pathLower.includes("deploy") || pathLower.includes("infrastructure")) {
    return "devops-infrastructure";
  }
  if (pathLower.includes("ml") || pathLower.includes("ai") || pathLower.includes("data")) {
    return "ai-data-science";
  }

  return "tools-productivity";
}

async function addWshobsonAgents() {
  console.log(`🚀 Adding skills from ${OWNER}/${REPO}...`);
  console.log(`📦 Repository has 111 SKILL.md files\n`);

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const indexPath = resolve(process.cwd(), "data/skills/index.json");
  const fullPath = resolve(process.cwd(), "data/skills/skills-full.json");

  const indexData = JSON.parse(readFileSync(indexPath, "utf-8"));
  const fullData = JSON.parse(readFileSync(fullPath, "utf-8"));

  const existingIds = new Set(Object.keys(fullData));

  const { data: repoData } = await octokit.repos.get({ owner: OWNER, repo: REPO });

  // Search for all SKILL.md files
  const { data: searchResults } = await octokit.search.code({
    q: `filename:SKILL.md repo:${OWNER}/${REPO}`,
    per_page: 100,
  });

  console.log(`🔍 Found ${searchResults.total_count} SKILL.md files\n`);

  let addedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const item of searchResults.items) {
    const skillPath = item.path;

    // Extract skill name from path (e.g., "plugins/database-design/skills/postgresql/SKILL.md" -> "postgresql")
    const parts = skillPath.split("/");
    const skillName = parts[parts.length - 2];

    const skillId = `${OWNER}-${REPO}-${skillName}`.toLowerCase();

    try {
      if (existingIds.has(skillId)) {
        skippedCount++;
        continue;
      }

      // Fetch SKILL.md content
      const { data: fileData } = await octokit.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path: skillPath,
      });

      if (!("content" in fileData)) {
        errorCount++;
        continue;
      }

      const content = Buffer.from(fileData.content, "base64").toString("utf-8");
      const { data: frontmatter, content: markdown } = matter(content);

      const tags = frontmatter.tags || [];
      const category = inferCategory(skillPath);

      const skill = {
        id: skillId,
        name: frontmatter.name || skillName,
        description: frontmatter.description || "",
        repo: {
          owner: OWNER,
          name: REPO,
          fullName: `${OWNER}/${REPO}`,
          url: `https://github.com/${OWNER}/${REPO}/tree/main/${skillPath.replace("/SKILL.md", "")}`,
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
        category,
        tags,
        skillMd: {
          raw: content,
          frontmatter,
          content: markdown,
        },
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
      if (addedCount % 10 === 0) {
        process.stdout.write(".");
        console.log(` ${addedCount} skills added`);
      }

      // Rate limiting - be respectful
      await new Promise(resolve => setTimeout(resolve, 700));

    } catch (error: any) {
      errorCount++;
      if (error.status === 403) {
        console.log(`\n⚠️  Rate limit hit, waiting 60 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    }
  }

  indexData.totalSkills = indexData.skills.length;
  indexData.lastSync = new Date().toISOString();

  writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  writeFileSync(fullPath, JSON.stringify(fullData, null, 2));

  console.log(`\n\n✅ wshobson/agents Complete!`);
  console.log(`➕ Added: ${addedCount} new skills`);
  console.log(`⏭️  Skipped: ${skippedCount} existing`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total: ${indexData.totalSkills} skills`);
}

addWshobsonAgents();
