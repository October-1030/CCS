#!/usr/bin/env node
/**
 * Add specific GitHub repositories as skills
 * Usage: tsx scripts/add-repos.ts owner/repo owner2/repo2 ...
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Octokit } from "@octokit/rest";
import { writeFileSync, readFileSync } from "fs";
import matter from "gray-matter";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });

const REPOS_TO_ADD = [
  // Batch 4 - High quality from travisvn & BehiSecc awesome lists

  // Core & Superpowers
  "obra/superpowers",
  "obra/superpowers-skills",
  "obra/superpowers-lab",

  // Development Tools
  "conorluddy/ios-simulator-skill",
  "lackeyjb/playwright-skill",
  "chrisvoncsefalvay/claude-d3js-skill",
  "zxkane/aws-skills",
  "raintree-technology/claude-starter",
  "1NickPappas/move-code-quality-skill",
  "bluzername/claude-code-terminal-title",
  "ivan-magda/claude-code-plugin-template",

  // Data & Analysis
  "coffeefuelbump/csv-data-summarizer-claude-skill",
  "sanjay3290/ai-skills",
  "omkamal/pypict-claude-skill",

  // Scientific & Research
  "K-Dense-AI/claude-scientific-skills",
  "HeshamFS/materials-simulation-skills",

  // Content & Media
  "ryanbbrown/revealjs-skill",
  "smerchek/claude-epub-skill",
  "alonw0/web-asset-generator",

  // Knowledge & Learning
  "michalparkola/tapestry-skills-for-claude-code",
  "yusufkaraaslan/Skill_Seekers",

  // Collaboration & Project Management
  "mhattingpete/claude-skills-marketplace",
  "wrsmith108/linear-claude-skill",
  "Valian/linear-cli-skill",

  // Advanced/Multi-agent
  "asklokesh/claudeskill-loki-mode",

  // Other Quality Skills
  "emaynard/claude-family-history-research-skill",
];

interface SkillData {
  id: string;
  name: string;
  description: string;
  repo: {
    owner: string;
    name: string;
    fullName: string;
    url: string;
    defaultBranch: string;
  };
  metadata: {
    stars: number;
    forks: number;
    language: string | null;
    topics: string[];
    updatedAt: string;
    pushedAt: string;
    createdAt?: string;
    license?: string;
  };
  category: string;
  tags: string[];
  skillMd: {
    raw: string;
    frontmatter: any;
    content: string;
  };
}

async function findSkillMd(octokit: Octokit, owner: string, repo: string): Promise<string | null> {
  const paths = [
    "SKILL.md",
    "skill.md",
    "skills/SKILL.md",
    ".claude/skills/SKILL.md",
    "skill/SKILL.md",
  ];

  for (const path of paths) {
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path,
      });

      if ("content" in data) {
        return Buffer.from(data.content, "base64").toString("utf-8");
      }
    } catch (error: any) {
      // Try next path
      continue;
    }
  }

  return null;
}

function inferCategory(tags: string[], topics: string[]): string {
  const allKeywords = [...tags, ...topics].map(t => t.toLowerCase());

  if (allKeywords.some(k => ['ai', 'ml', 'data', 'analytics', 'learning'].includes(k))) {
    return 'data-ai';
  }
  if (allKeywords.some(k => ['dev', 'code', 'programming', 'development'].includes(k))) {
    return 'development';
  }
  if (allKeywords.some(k => ['tool', 'cli', 'utility'].includes(k))) {
    return 'tools';
  }

  return 'development'; // default
}

async function addRepos() {
  console.log(`🚀 Adding ${REPOS_TO_ADD.length} repositories...\n`);

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  // Load existing data
  const indexPath = resolve(process.cwd(), "data/skills/index.json");
  const fullPath = resolve(process.cwd(), "data/skills/skills-full.json");

  const indexData = JSON.parse(readFileSync(indexPath, "utf-8"));
  const fullData = JSON.parse(readFileSync(fullPath, "utf-8"));

  const existingIds = new Set(Object.keys(fullData));

  let addedCount = 0;
  let skippedCount = 0;

  for (const repoFullName of REPOS_TO_ADD) {
    const [owner, repoName] = repoFullName.split("/");

    try {
      const skillId = `${owner}-${repoName}`.toLowerCase();

      if (existingIds.has(skillId)) {
        console.log(`⏭️  Skipping ${repoFullName} (already exists)`);
        skippedCount++;
        continue;
      }

      console.log(`📥 Fetching ${repoFullName}...`);

      // Get SKILL.md
      const skillMdContent = await findSkillMd(octokit, owner, repoName);

      if (!skillMdContent) {
        console.log(`   ⚠️  No SKILL.md found, skipping`);
        continue;
      }

      const { data: frontmatter, content: markdown } = matter(skillMdContent);

      // Get repo metadata
      const { data: repo } = await octokit.repos.get({
        owner,
        repo: repoName,
      });

      const tags = frontmatter.tags || repo.topics || [];
      const category = inferCategory(tags, repo.topics || []);

      const skill: SkillData = {
        id: skillId,
        name: frontmatter.name || repoName,
        description: frontmatter.description || repo.description || "",
        repo: {
          owner,
          name: repoName,
          fullName: repoFullName,
          url: repo.html_url,
          defaultBranch: repo.default_branch,
        },
        metadata: {
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language,
          topics: (repo.topics as string[]) || [],
          updatedAt: repo.updated_at,
          pushedAt: repo.pushed_at,
          createdAt: repo.created_at,
          license: repo.license?.name,
        },
        category,
        tags,
        skillMd: {
          raw: skillMdContent,
          frontmatter,
          content: markdown,
        },
      };

      // Add to index
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

      // Add to full data
      fullData[skill.id] = skill;

      addedCount++;
      console.log(`   ✅ Added ${repoFullName}`);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  // Update counts
  indexData.totalSkills = indexData.skills.length;
  indexData.lastSync = new Date().toISOString();

  // Save
  writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  writeFileSync(fullPath, JSON.stringify(fullData, null, 2));

  console.log(`\n✅ Added ${addedCount} new skills!`);
  console.log(`⏭️  Skipped ${skippedCount} existing skills`);
  console.log(`📊 Total skills: ${indexData.totalSkills}`);
}

addRepos();
