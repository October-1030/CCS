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
  // Batch 3 - from VoltAgent & heilcheng awesome lists
  "VoltAgent/voltagent",
  "PleasePrompto/notebooklm-skill",
  "scarletkc/vexor",
  "fvadicamo/dev-agent-skills",
  "alinaqi/claude-bootstrap",
  "muratcankoylan/Agent-Skills-for-Context-Engineering",
  "NotMyself/claude-win11-speckit-update-skill",
  "jeffersonwarrior/claudisms",
  "SHADOWPR0/security-bluebook-builder",
  "czlonkowski/n8n-skills",
  "wrsmith108/varlock-claude-skill",
  "SHADOWPR0/beautiful_prose",
  "karanb192/awesome-claude-skills",
  "shajith003/awesome-claude-skills",
  "GuDaStudio/skills",
  "DougTrajano/pydantic-ai-skills",
  "hikanner/agent-skills",
  "gradion-ai/freeact-skills",
  "gotalab/skillport",
  "kylehughes/the-unofficial-swift-concurrency-migration-skill",
  "gapmiss/obsidian-plugin-skill",
  "frmoretto/stream-coding",
  "SawyerHood/dev-browser",
  "gmickel/sheets-cli",
  "fabioc-aloha/spotify-skill",
  "jthack/threat-hunting-with-sigma-rules-skill",
  "jakedahn/pomodoro",
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
