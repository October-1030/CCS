#!/usr/bin/env node
/**
 * Add skills from ComposioHQ/awesome-claude-skills
 * 27 skills from official Composio repository
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Octokit } from "@octokit/rest";
import { writeFileSync, readFileSync } from "fs";
import matter from "gray-matter";

config({ path: resolve(process.cwd(), ".env.local") });

const OWNER = "ComposioHQ";
const REPO = "awesome-claude-skills";

// Category inference based on skill name/path
function inferCategory(path: string, name: string, description: string): string {
  const text = `${path} ${name} ${description}`.toLowerCase();

  if (text.includes("document") || text.includes("docx") || text.includes("pdf") || text.includes("pptx")) {
    return "tools-productivity";
  }
  if (text.includes("frontend") || text.includes("ui") || text.includes("design") || text.includes("react")) {
    return "frontend-development";
  }
  if (text.includes("backend") || text.includes("api") || text.includes("database")) {
    return "backend-development";
  }
  if (text.includes("mcp") || text.includes("builder") || text.includes("tool")) {
    return "tools-productivity";
  }
  if (text.includes("test") || text.includes("qa")) {
    return "testing-quality";
  }
  if (text.includes("devops") || text.includes("deploy") || text.includes("infrastructure")) {
    return "devops-infrastructure";
  }
  if (text.includes("ai") || text.includes("ml") || text.includes("data")) {
    return "ai-data-science";
  }
  if (text.includes("business") || text.includes("marketing") || text.includes("invoice")) {
    return "business-marketing";
  }

  return "tools-productivity";
}

async function addComposioSkills() {
  console.log(`🚀 Adding skills from ${OWNER}/${REPO}...`);
  console.log(`📦 Repository has 27 SKILL.md files\n`);

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

    // Extract skill name from path
    const parts = skillPath.split("/");
    const skillName = parts.length > 2 ? parts[parts.length - 2] : parts[0];

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
      const name = frontmatter.name || skillName;
      const description = frontmatter.description || "";
      const category = inferCategory(skillPath, name, description);

      const skill = {
        id: skillId,
        name,
        description,
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
      console.log(`✅ Added: ${skill.name}`);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 700));

    } catch (error: any) {
      errorCount++;
      console.log(`❌ Error with ${skillName}: ${error.message}`);
    }
  }

  indexData.totalSkills = indexData.skills.length;
  indexData.lastSync = new Date().toISOString();

  writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  writeFileSync(fullPath, JSON.stringify(fullData, null, 2));

  console.log(`\n\n✅ ComposioHQ Complete!`);
  console.log(`➕ Added: ${addedCount} new skills`);
  console.log(`⏭️  Skipped: ${skippedCount} existing`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total: ${indexData.totalSkills} skills`);
}

addComposioSkills();
