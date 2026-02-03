#!/usr/bin/env node
/**
 * Add discovered skills to the database
 * Fetches SKILL.md content and adds to skills data
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Octokit } from "@octokit/rest";
import * as fs from "fs/promises";
import * as path from "path";
import matter from "gray-matter";

config({ path: resolve(process.cwd(), ".env.local") });

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const DATA_DIR = path.join(process.cwd(), "data", "skills");

interface SkillRepo {
  owner: string;
  repo: string;
  fullName: string;
  url: string;
  stars: number;
  description: string;
  language: string | null;
  topics: string[];
  updatedAt: string;
}

interface Skill {
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
    createdAt: string;
    updatedAt: string;
    pushedAt: string;
    license?: string;
  };
  category: string;
  tags: string[];
  skillMd: {
    raw: string;
    frontmatter: Record<string, any>;
    content: string;
  };
  internal: {
    syncedAt: string;
    version: number;
  };
}

interface SkillIndex {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  stars: number;
  updatedAt: string;
  repoUrl: string;
}

// Category inference
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "frontend-development": ["react", "vue", "angular", "css", "html", "ui", "ux", "frontend", "web", "svelte", "tailwind", "next", "nuxt"],
  "backend-development": ["api", "server", "database", "node", "python", "java", "golang", "rust", "backend", "express", "fastapi", "django"],
  "devops-infrastructure": ["docker", "kubernetes", "aws", "azure", "gcp", "terraform", "ansible", "ci", "cd", "devops", "infrastructure", "cloud"],
  "ai-data-science": ["ai", "ml", "machine-learning", "data", "llm", "gpt", "claude", "agent", "nlp", "neural", "deep-learning", "openai", "anthropic"],
  "testing-quality": ["test", "testing", "qa", "quality", "jest", "pytest", "cypress", "selenium", "automation"],
  "tools-productivity": ["cli", "tool", "utility", "automation", "workflow", "productivity", "git", "vim", "vscode"],
  "business-marketing": ["marketing", "seo", "analytics", "business", "sales", "content", "social"],
  "specialized": ["game", "mobile", "security", "blockchain", "iot", "embedded"],
};

function inferCategory(skill: { name: string; description: string; tags: string[] }): string {
  const text = `${skill.name} ${skill.description} ${skill.tags.join(" ")}`.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return category;
      }
    }
  }

  return "tools-productivity";
}

function generateSkillId(owner: string, repo: string): string {
  return `${owner.toLowerCase()}-${repo.toLowerCase()}`.replace(/[^a-z0-9-]/g, "-");
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchSkillMd(owner: string, repo: string): Promise<string | null> {
  const paths = [
    "SKILL.md",
    "skill.md",
    ".claude/skills/SKILL.md",
    "skills/SKILL.md",
  ];

  for (const filePath of paths) {
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath,
      });

      if ("content" in data && data.content) {
        return Buffer.from(data.content, "base64").toString("utf-8");
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function getFullRepoInfo(owner: string, repo: string): Promise<any> {
  const { data } = await octokit.rest.repos.get({ owner, repo });
  return data;
}

async function loadExistingData(): Promise<{
  index: { version: string; lastSync: string; totalSkills: number; skills: SkillIndex[] };
  fullData: Record<string, Skill>;
}> {
  const indexPath = path.join(DATA_DIR, "index.json");
  const fullPath = path.join(DATA_DIR, "skills-full.json");

  const indexContent = await fs.readFile(indexPath, "utf-8");
  const fullContent = await fs.readFile(fullPath, "utf-8");

  return {
    index: JSON.parse(indexContent),
    fullData: JSON.parse(fullContent),
  };
}

async function saveData(
  index: { version: string; lastSync: string; totalSkills: number; skills: SkillIndex[] },
  fullData: Record<string, Skill>
): Promise<void> {
  // Save index
  await fs.writeFile(
    path.join(DATA_DIR, "index.json"),
    JSON.stringify(index, null, 2)
  );

  // Save full data
  await fs.writeFile(
    path.join(DATA_DIR, "skills-full.json"),
    JSON.stringify(fullData, null, 2)
  );

  // Update category files
  const byCategory: Record<string, SkillIndex[]> = {};
  for (const skill of index.skills) {
    if (!byCategory[skill.category]) {
      byCategory[skill.category] = [];
    }
    byCategory[skill.category].push(skill);
  }

  for (const [category, skills] of Object.entries(byCategory)) {
    await fs.writeFile(
      path.join(DATA_DIR, "by-category", `${category}.json`),
      JSON.stringify(skills, null, 2)
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const maxSkills = args.includes("--limit")
    ? parseInt(args[args.indexOf("--limit") + 1])
    : 500;

  console.log("📥 Adding discovered skills to database...\n");
  console.log(`Max skills to add: ${maxSkills}\n`);

  // Load discovered skills
  const discoveredPath = path.join(process.cwd(), "data", "discovered-skills.json");
  let discoveredRepos: SkillRepo[];

  try {
    const content = await fs.readFile(discoveredPath, "utf-8");
    discoveredRepos = JSON.parse(content);
  } catch {
    console.log("No discovered skills file found. Run discover-skills.ts first.");
    return;
  }

  // Load existing data
  const { index, fullData } = await loadExistingData();
  const existingIds = new Set(index.skills.map(s => s.id));

  console.log(`📦 Existing skills: ${existingIds.size}`);
  console.log(`🆕 Discovered repos: ${discoveredRepos.length}\n`);

  let added = 0;
  let skipped = 0;
  let errors = 0;

  for (const repo of discoveredRepos) {
    if (added >= maxSkills) break;

    const skillId = generateSkillId(repo.owner, repo.repo);

    if (existingIds.has(skillId)) {
      skipped++;
      continue;
    }

    console.log(`[${added + 1}/${maxSkills}] Processing ${repo.fullName}...`);

    try {
      // Fetch SKILL.md content
      const skillMdContent = await fetchSkillMd(repo.owner, repo.repo);

      if (!skillMdContent) {
        console.log(`  ⚠️  No SKILL.md found, skipping`);
        skipped++;
        continue;
      }

      // Parse SKILL.md frontmatter
      const parsed = matter(skillMdContent);
      const frontmatter = parsed.data;

      // Get full repo info
      const repoInfo = await getFullRepoInfo(repo.owner, repo.repo);

      // Create skill object
      const skill: Skill = {
        id: skillId,
        name: frontmatter.name || repo.repo,
        description: frontmatter.description || repo.description || `${repo.repo} - A skill for Claude Code`,
        repo: {
          owner: repo.owner,
          name: repo.repo,
          fullName: repo.fullName,
          url: repo.url,
          defaultBranch: repoInfo.default_branch || "main",
        },
        metadata: {
          stars: repoInfo.stargazers_count || repo.stars,
          forks: repoInfo.forks_count || 0,
          language: repoInfo.language || repo.language,
          topics: repoInfo.topics || repo.topics || [],
          createdAt: repoInfo.created_at,
          updatedAt: repoInfo.updated_at || repo.updatedAt,
          pushedAt: repoInfo.pushed_at,
          license: repoInfo.license?.name,
        },
        category: "",
        tags: (repoInfo.topics || []).slice(0, 10),
        skillMd: {
          raw: skillMdContent,
          frontmatter,
          content: parsed.content,
        },
        internal: {
          syncedAt: new Date().toISOString(),
          version: 1,
        },
      };

      // Infer category
      skill.category = inferCategory({
        name: skill.name,
        description: skill.description,
        tags: skill.tags,
      });

      // Add to full data
      fullData[skillId] = skill;

      // Add to index
      const skillIndex: SkillIndex = {
        id: skillId,
        name: skill.name,
        description: skill.description,
        category: skill.category,
        tags: skill.tags,
        stars: skill.metadata.stars,
        updatedAt: skill.metadata.updatedAt,
        repoUrl: skill.repo.url,
      };
      index.skills.push(skillIndex);

      existingIds.add(skillId);
      added++;
      console.log(`  ✅ Added: ${skill.name} (${skill.category})`);

      // Small delay
      await sleep(200);
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
      errors++;
    }
  }

  // Update index metadata
  index.totalSkills = index.skills.length;
  index.lastSync = new Date().toISOString();

  // Save data
  console.log("\n💾 Saving data...");
  await saveData(index, fullData);

  console.log("\n" + "=".repeat(50));
  console.log("📊 SUMMARY");
  console.log("=".repeat(50));
  console.log(`✅ Added: ${added} new skills`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📦 Total skills: ${index.totalSkills}`);
  console.log("=".repeat(50));
}

main().catch(console.error);
