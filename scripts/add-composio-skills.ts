#!/usr/bin/env node
/**
 * Add skills from ComposioHQ/awesome-claude-skills monorepo
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Octokit } from "@octokit/rest";
import { writeFileSync, readFileSync } from "fs";
import matter from "gray-matter";

config({ path: resolve(process.cwd(), ".env.local") });

const OWNER = "ComposioHQ";
const REPO = "awesome-claude-skills";

// Only new skills (not duplicates of anthropics/skills)
const SKILLS_PATHS = [
  "changelog-generator",
  "competitive-ads-extractor",
  "content-research-writer",
  "developer-growth-analysis",
  "domain-name-brainstormer",
  "file-organizer",
  "image-enhancer",
  "invoice-organizer",
  "lead-research-assistant",
  "meeting-insights-analyzer",
  "raffle-winner-picker",
  "skill-share",
  "video-downloader",
];

function inferCategory(name: string, tags: string[]): string {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('marketing') || nameLower.includes('ad') || nameLower.includes('lead')) {
    return 'marketing';
  }
  if (nameLower.includes('business') || nameLower.includes('invoice') || nameLower.includes('meeting')) {
    return 'business';
  }
  if (nameLower.includes('content') || nameLower.includes('writer') || nameLower.includes('changelog')) {
    return 'content';
  }
  if (nameLower.includes('image') || nameLower.includes('video') || nameLower.includes('design')) {
    return 'creative';
  }
  if (nameLower.includes('file') || nameLower.includes('organizer') || nameLower.includes('raffle')) {
    return 'productivity';
  }
  if (nameLower.includes('developer') || nameLower.includes('growth')) {
    return 'analytics';
  }

  return 'tools';
}

async function addComposioSkills() {
  console.log(`🚀 Adding ${SKILLS_PATHS.length} skills from ${OWNER}/${REPO}...\n`);

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const indexPath = resolve(process.cwd(), "data/skills/index.json");
  const fullPath = resolve(process.cwd(), "data/skills/skills-full.json");

  const indexData = JSON.parse(readFileSync(indexPath, "utf-8"));
  const fullData = JSON.parse(readFileSync(fullPath, "utf-8"));

  const existingIds = new Set(Object.keys(fullData));

  const { data: repoData } = await octokit.repos.get({ owner: OWNER, repo: REPO });

  let addedCount = 0;
  let skippedCount = 0;

  for (const skillPath of SKILLS_PATHS) {
    const skillName = skillPath;
    const skillId = `${OWNER.toLowerCase()}-${REPO.toLowerCase()}-${skillName}`;

    try {
      if (existingIds.has(skillId)) {
        console.log(`⏭️  ${skillName}`);
        skippedCount++;
        continue;
      }

      console.log(`📥 ${skillName}...`);

      const { data: fileData } = await octokit.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path: `${skillPath}/SKILL.md`,
      });

      if (!("content" in fileData)) {
        console.log(`   ⚠️  No content`);
        continue;
      }

      const content = Buffer.from(fileData.content, "base64").toString("utf-8");
      const { data: frontmatter, content: markdown } = matter(content);

      const tags = frontmatter.tags || [];
      const category = inferCategory(skillName, tags);

      const skill = {
        id: skillId,
        name: frontmatter.name || skillName,
        description: frontmatter.description || "",
        repo: {
          owner: OWNER,
          name: REPO,
          fullName: `${OWNER}/${REPO}`,
          url: `https://github.com/${OWNER}/${REPO}/tree/master/${skillPath}`,
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

      addedCount++;
      console.log(`   ✅`);

      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error: any) {
      console.log(`   ❌ ${error.message}`);
    }
  }

  indexData.totalSkills = indexData.skills.length;
  indexData.lastSync = new Date().toISOString();

  writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  writeFileSync(fullPath, JSON.stringify(fullData, null, 2));

  console.log(`\n✅ Added ${addedCount} new skills!`);
  console.log(`⏭️  Skipped ${skippedCount} existing`);
  console.log(`📊 Total: ${indexData.totalSkills} skills`);
}

addComposioSkills();
