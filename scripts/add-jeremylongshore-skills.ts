#!/usr/bin/env node
/**
 * Add skills from jeremylongshore/claude-code-plugins-plus-skills
 * Selectively adding 3 categories (75 skills total)
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

// DevOps Basics (25 skills)
const DEVOPS_BASICS = [
  "bash-script-helper", "branch-naming-helper", "changelog-creator",
  "commit-message-formatter", "docker-compose-creator", "docker-container-basics",
  "dockerfile-generator", "dotenv-manager", "environment-variables-handler",
  "git-workflow-manager", "github-actions-starter", "gitignore-generator",
  "gitlab-ci-basics", "jenkins-pipeline-intro", "json-config-manager",
  "linux-commands-guide", "makefile-generator", "npm-scripts-optimizer",
  "package-json-manager", "pre-commit-hook-setup", "readme-generator",
  "release-notes-generator", "ssh-key-manager", "version-bumper",
  "yaml-config-validator"
];

// Frontend Dev (25 skills) - will fetch dynamically
// Backend Dev (25 skills) - will fetch dynamically

const CATEGORIES = [
  { path: "01-devops-basics", skills: DEVOPS_BASICS },
  { path: "05-frontend-dev", skills: [] }, // Will fetch
  { path: "06-backend-dev", skills: [] },  // Will fetch
];

function inferCategory(path: string): string {
  if (path.includes("devops")) return "DevOps & Infrastructure";
  if (path.includes("frontend")) return "Frontend Development";
  if (path.includes("backend")) return "Backend Development";
  return "Tools & Productivity";
}

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

async function addJeremyLongshoreSkills() {
  console.log(`🚀 Adding selected skills from ${OWNER}/${REPO}...\n`);

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const indexPath = resolve(process.cwd(), "data/skills/index.json");
  const fullPath = resolve(process.cwd(), "data/skills/skills-full.json");

  const indexData = JSON.parse(readFileSync(indexPath, "utf-8"));
  const fullData = JSON.parse(readFileSync(fullPath, "utf-8"));

  const existingIds = new Set(Object.keys(fullData));

  const { data: repoData } = await octokit.repos.get({ owner: OWNER, repo: REPO });

  let addedCount = 0;
  let skippedCount = 0;

  // Process each category
  for (const category of CATEGORIES) {
    console.log(`\n📁 Category: ${category.path}`);

    // Fetch skills list if not provided
    let skillsList = category.skills;
    if (skillsList.length === 0) {
      console.log(`   Fetching skill list...`);
      skillsList = await fetchSkillsInCategory(octokit, category.path);
      console.log(`   Found ${skillsList.length} skills`);
    }

    // Process each skill
    for (const skillName of skillsList) {
      const skillId = `${OWNER}-${REPO}-${skillName}`.toLowerCase();

      try {
        if (existingIds.has(skillId)) {
          skippedCount++;
          continue;
        }

        const skillPath = `${BASE_PATH}/${category.path}/${skillName}`;

        const { data: fileData } = await octokit.repos.getContent({
          owner: OWNER,
          repo: REPO,
          path: `${skillPath}/SKILL.md`,
        });

        if (!("content" in fileData)) {
          continue;
        }

        const content = Buffer.from(fileData.content, "base64").toString("utf-8");
        const { data: frontmatter, content: markdown } = matter(content);

        const tags = frontmatter.tags || [];
        const skillCategory = inferCategory(category.path);

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
          category: skillCategory,
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

        addedCount++;
        if (addedCount % 5 === 0) {
          process.stdout.write(".");
        }

        await new Promise(resolve => setTimeout(resolve, 600));

      } catch (error: any) {
        // Skip failed skills silently
      }
    }

    console.log(` ✅ Completed ${category.path}`);
  }

  indexData.totalSkills = indexData.skills.length;
  indexData.lastSync = new Date().toISOString();

  writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  writeFileSync(fullPath, JSON.stringify(fullData, null, 2));

  console.log(`\n\n✅ Added ${addedCount} new skills!`);
  console.log(`⏭️  Skipped ${skippedCount} existing`);
  console.log(`📊 Total: ${indexData.totalSkills} skills`);
}

addJeremyLongshoreSkills();
