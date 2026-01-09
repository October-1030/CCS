#!/usr/bin/env node
/**
 * Add skills from nextlevelbuilder/ui-ux-pro-max-skill
 * 4 high-quality UI/UX skills (9371 stars)
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Octokit } from "@octokit/rest";
import { writeFileSync, readFileSync } from "fs";
import matter from "gray-matter";

config({ path: resolve(process.cwd(), ".env.local") });

const OWNER = "nextlevelbuilder";
const REPO = "ui-ux-pro-max-skill";

async function addNextlevelbuilderSkills() {
  console.log(`🚀 Adding skills from ${OWNER}/${REPO}...`);
  console.log(`📦 High-quality UI/UX skills (9371⭐)\n`);

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
    per_page: 10,
  });

  console.log(`🔍 Found ${searchResults.total_count} SKILL.md files\n`);

  let addedCount = 0;
  let skippedCount = 0;

  for (const item of searchResults.items) {
    const skillPath = item.path;

    // Extract skill name
    const parts = skillPath.split("/");
    const skillName = parts.length > 2 ? parts[parts.length - 2] : "ui-ux-pro-max";

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
        continue;
      }

      const content = Buffer.from(fileData.content, "base64").toString("utf-8");
      const { data: frontmatter, content: markdown } = matter(content);

      const tags = frontmatter.tags || [];
      const name = frontmatter.name || skillName;
      const description = frontmatter.description || "";

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
        category: "frontend-development", // UI/UX skills go to frontend
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

      await new Promise(resolve => setTimeout(resolve, 700));

    } catch (error: any) {
      console.log(`❌ Error with ${skillName}: ${error.message}`);
    }
  }

  indexData.totalSkills = indexData.skills.length;
  indexData.lastSync = new Date().toISOString();

  writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  writeFileSync(fullPath, JSON.stringify(fullData, null, 2));

  console.log(`\n✅ nextlevelbuilder Complete!`);
  console.log(`➕ Added: ${addedCount} new skills`);
  console.log(`⏭️  Skipped: ${skippedCount} existing`);
  console.log(`📊 Total: ${indexData.totalSkills} skills`);
}

addNextlevelbuilderSkills();
