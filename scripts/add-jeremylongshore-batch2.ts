#!/usr/bin/env node
/**
 * Add remaining skills from jeremylongshore/claude-code-plugins-plus-skills
 * Batch 2: Adding 17 more categories (425 skills)
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Octokit } from "@octokit/rest";
import { writeFileSync, readFileSync } from "fs";
import matter from "gray-matter";

config({ path: resolve(process.cwd(), ".env.local") });

const OWNER = "jeremylongshore";
const REPO = "claude-code-plugins-plus-skills";
const BASE_PATH = "skills";

// Map repository categories to our 8 main categories
const CATEGORY_MAPPING: Record<string, string> = {
  "02-devops-advanced": "devops-infrastructure",
  "03-security-fundamentals": "specialized",
  "04-security-advanced": "specialized",
  "07-ml-training": "ai-data-science",
  "08-ml-deployment": "ai-data-science",
  "09-test-automation": "testing-quality",
  "10-performance-testing": "testing-quality",
  "11-data-pipelines": "ai-data-science",
  "12-data-analytics": "ai-data-science",
  "13-aws-skills": "devops-infrastructure",
  "14-gcp-skills": "devops-infrastructure",
  "15-api-development": "backend-development",
  "16-api-integration": "backend-development",
  "17-technical-docs": "tools-productivity",
  "18-visual-content": "tools-productivity",
  "19-business-automation": "business-marketing",
  "20-enterprise-workflows": "business-marketing",
};

async function fetchSkillsInCategory(
  octokit: Octokit,
  categoryPath: string
): Promise<string[]> {
  try {
    const { data } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: `${BASE_PATH}/${categoryPath}`,
    });

    if (Array.isArray(data)) {
      return data
        .filter(item => item.type === "dir")
        .map(item => item.name);
    }
  } catch (error) {
    console.log(`   ⚠️  Could not fetch ${categoryPath} contents`);
  }
  return [];
}

async function addBatch2Skills() {
  console.log(`🚀 Adding batch 2 skills from ${OWNER}/${REPO}...`);
  console.log(`📦 Processing 17 categories (425 skills estimated)\n`);

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const indexPath = resolve(process.cwd(), "data/skills/index.json");
  const fullPath = resolve(process.cwd(), "data/skills/skills-full.json");

  const indexData = JSON.parse(readFileSync(indexPath, "utf-8"));
  const fullData = JSON.parse(readFileSync(fullPath, "utf-8"));

  const existingIds = new Set(Object.keys(fullData));

  const { data: repoData } = await octokit.repos.get({ owner: OWNER, repo: REPO });

  let addedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Process each category
  for (const [categoryPath, ourCategory] of Object.entries(CATEGORY_MAPPING)) {
    console.log(`\n📁 ${categoryPath} → ${ourCategory}`);

    // Fetch skills list
    const skillsList = await fetchSkillsInCategory(octokit, categoryPath);
    console.log(`   Found ${skillsList.length} skills`);

    // Process each skill
    for (const skillName of skillsList) {
      const skillId = `${OWNER}-${REPO}-${skillName}`.toLowerCase();

      try {
        if (existingIds.has(skillId)) {
          skippedCount++;
          continue;
        }

        const skillPath = `${BASE_PATH}/${categoryPath}/${skillName}`;

        const { data: fileData } = await octokit.repos.getContent({
          owner: OWNER,
          repo: REPO,
          path: `${skillPath}/SKILL.md`,
        });

        if (!("content" in fileData)) {
          errorCount++;
          continue;
        }

        const content = Buffer.from(fileData.content, "base64").toString("utf-8");
        const { data: frontmatter, content: markdown } = matter(content);

        const tags = frontmatter.tags || [];

        const skill = {
          id: skillId,
          name: frontmatter.name || skillName,
          description: frontmatter.description || "",
          repo: {
            owner: OWNER,
            name: REPO,
            fullName: `${OWNER}/${REPO}`,
            url: `https://github.com/${OWNER}/${REPO}/tree/main/${skillPath}`,
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
          category: ourCategory,
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
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 600));

      } catch (error: any) {
        errorCount++;
      }
    }

    console.log(` ✅ Completed ${categoryPath} (+${addedCount - (addedCount % 25)})`);
  }

  indexData.totalSkills = indexData.skills.length;
  indexData.lastSync = new Date().toISOString();

  writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  writeFileSync(fullPath, JSON.stringify(fullData, null, 2));

  console.log(`\n\n✅ Batch 2 Complete!`);
  console.log(`➕ Added: ${addedCount} new skills`);
  console.log(`⏭️  Skipped: ${skippedCount} existing`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total: ${indexData.totalSkills} skills`);
}

addBatch2Skills();
