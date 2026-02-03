#!/usr/bin/env node
/**
 * Discover and add new skills in one step
 * Uses GitHub Code Search API to find SKILL.md files and their exact paths
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

interface FoundSkill {
  owner: string;
  repo: string;
  fullName: string;
  filePath: string;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  repo: any;
  metadata: any;
  category: string;
  tags: string[];
  skillMd: any;
  internal: any;
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
      if (text.includes(keyword)) return category;
    }
  }
  return "tools-productivity";
}

function generateSkillId(owner: string, repo: string, suffix?: string): string {
  let id = `${owner.toLowerCase()}-${repo.toLowerCase()}`.replace(/[^a-z0-9-]/g, "-");
  if (suffix) id += `-${suffix}`;
  return id;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchForSkillFiles(query: string, existingIds: Set<string>): Promise<FoundSkill[]> {
  const skills: FoundSkill[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 5) {
    try {
      console.log(`  Page ${page}...`);
      const response = await octokit.rest.search.code({
        q: query,
        per_page: 100,
        page,
      });

      for (const item of response.data.items) {
        if (!item.repository?.full_name) continue;

        const [owner, repo] = item.repository.full_name.split("/");
        const id = generateSkillId(owner, repo);

        if (!existingIds.has(id)) {
          skills.push({
            owner,
            repo,
            fullName: item.repository.full_name,
            filePath: item.path,
          });
          existingIds.add(id); // Prevent duplicates in same run
        }
      }

      hasMore = response.data.items.length === 100;
      page++;

      // Code search rate limit: 10 requests per minute
      await sleep(7000);
    } catch (error: any) {
      if (error.status === 403 || error.status === 422) {
        console.log(`  Rate limited or search error, waiting...`);
        await sleep(65000);
      } else {
        console.error(`  Error: ${error.message}`);
        hasMore = false;
      }
    }
  }

  return skills;
}

async function fetchFileContent(owner: string, repo: string, path: string): Promise<string | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({ owner, repo, path });
    if ("content" in data && data.content) {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
  } catch {
    return null;
  }
  return null;
}

async function getRepoInfo(owner: string, repo: string): Promise<any | null> {
  try {
    const { data } = await octokit.rest.repos.get({ owner, repo });
    return data;
  } catch {
    return null;
  }
}

async function loadExistingData(): Promise<{
  index: { version: string; lastSync: string; totalSkills: number; skills: SkillIndex[] };
  fullData: Record<string, Skill>;
  existingIds: Set<string>;
}> {
  const indexPath = path.join(DATA_DIR, "index.json");
  const fullPath = path.join(DATA_DIR, "skills-full.json");

  const indexContent = await fs.readFile(indexPath, "utf-8");
  const fullContent = await fs.readFile(fullPath, "utf-8");

  const index = JSON.parse(indexContent);
  const fullData = JSON.parse(fullContent);
  const existingIds = new Set<string>(index.skills.map((s: SkillIndex) => s.id));

  return { index, fullData, existingIds };
}

async function saveData(
  index: { version: string; lastSync: string; totalSkills: number; skills: SkillIndex[] },
  fullData: Record<string, Skill>
): Promise<void> {
  await fs.writeFile(path.join(DATA_DIR, "index.json"), JSON.stringify(index, null, 2));
  await fs.writeFile(path.join(DATA_DIR, "skills-full.json"), JSON.stringify(fullData, null, 2));

  // Update category files
  const byCategory: Record<string, SkillIndex[]> = {};
  for (const skill of index.skills) {
    if (!byCategory[skill.category]) byCategory[skill.category] = [];
    byCategory[skill.category].push(skill);
  }
  for (const [category, skills] of Object.entries(byCategory)) {
    await fs.writeFile(path.join(DATA_DIR, "by-category", `${category}.json`), JSON.stringify(skills, null, 2));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const maxSkills = args.includes("--limit")
    ? parseInt(args[args.indexOf("--limit") + 1])
    : 200;

  console.log("🔍 Discovering and adding new skills...\n");
  console.log(`Max skills to add: ${maxSkills}\n`);

  // Load existing data
  const { index, fullData, existingIds } = await loadExistingData();
  console.log(`📦 Existing skills: ${existingIds.size}\n`);

  // Check rate limit
  const { data: rateLimit } = await octokit.rest.rateLimit.get();
  console.log(`📊 Rate limits:`);
  console.log(`   Core: ${rateLimit.resources.core.remaining}/${rateLimit.resources.core.limit}`);
  console.log(`   Code Search: ${rateLimit.resources.code_search?.remaining || 'N/A'}/${rateLimit.resources.code_search?.limit || 'N/A'}\n`);

  // Search queries - focused on actual SKILL.md files
  const queries = [
    'filename:SKILL.md "name:" "description:"',
    'filename:SKILL.md "allowed-tools:"',
    'path:.claude filename:SKILL.md',
  ];

  // Find all skill files
  const foundSkills: FoundSkill[] = [];
  for (const query of queries) {
    console.log(`🔎 Searching: ${query}`);
    const skills = await searchForSkillFiles(query, new Set(existingIds));
    foundSkills.push(...skills);
    console.log(`   Found ${skills.length} new (${foundSkills.length} total)\n`);

    if (foundSkills.length >= maxSkills * 2) break;
  }

  console.log(`\n✅ Found ${foundSkills.length} potential new skills\n`);

  // Process found skills
  let added = 0;
  let errors = 0;

  for (const found of foundSkills) {
    if (added >= maxSkills) break;

    const skillId = generateSkillId(found.owner, found.repo);
    if (fullData[skillId]) continue;

    console.log(`[${added + 1}/${maxSkills}] ${found.fullName} (${found.filePath})`);

    try {
      // Fetch SKILL.md content
      const content = await fetchFileContent(found.owner, found.repo, found.filePath);
      if (!content) {
        console.log(`  ⚠️ Could not fetch content`);
        continue;
      }

      // Skip template files
      if (content.includes('{{') || content.includes('TEMPLATE') || found.filePath.includes('.template')) {
        console.log(`  ⚠️ Template file, skipping`);
        continue;
      }

      // Parse frontmatter
      let parsed;
      try {
        parsed = matter(content);
      } catch (parseError) {
        console.log(`  ⚠️ Parse error, skipping`);
        continue;
      }
      const fm = parsed.data;

      // Validate frontmatter
      if (typeof fm.name !== 'string' && typeof fm.name !== 'undefined') {
        console.log(`  ⚠️ Invalid name field, skipping`);
        continue;
      }

      // Get repo info
      const repoInfo = await getRepoInfo(found.owner, found.repo);
      if (!repoInfo) {
        console.log(`  ⚠️ Could not get repo info`);
        continue;
      }

      // Create skill
      const skill: Skill = {
        id: skillId,
        name: fm.name || found.repo,
        description: fm.description || repoInfo.description || `${found.repo} - Claude Code skill`,
        repo: {
          owner: found.owner,
          name: found.repo,
          fullName: found.fullName,
          url: repoInfo.html_url,
          defaultBranch: repoInfo.default_branch || "main",
        },
        metadata: {
          stars: repoInfo.stargazers_count || 0,
          forks: repoInfo.forks_count || 0,
          language: repoInfo.language,
          topics: repoInfo.topics || [],
          createdAt: repoInfo.created_at,
          updatedAt: repoInfo.updated_at,
          pushedAt: repoInfo.pushed_at,
          license: repoInfo.license?.name,
        },
        category: "",
        tags: (repoInfo.topics || []).slice(0, 10),
        skillMd: {
          raw: content,
          frontmatter: fm,
          content: parsed.content,
        },
        internal: {
          syncedAt: new Date().toISOString(),
          version: 1,
        },
      };

      skill.category = inferCategory({
        name: skill.name,
        description: skill.description,
        tags: skill.tags,
      });

      // Add to data
      fullData[skillId] = skill;
      index.skills.push({
        id: skillId,
        name: skill.name,
        description: skill.description,
        category: skill.category,
        tags: skill.tags,
        stars: skill.metadata.stars,
        updatedAt: skill.metadata.updatedAt,
        repoUrl: skill.repo.url,
      });

      existingIds.add(skillId);
      added++;
      console.log(`  ✅ Added: ${skill.name} (⭐${skill.metadata.stars})`);

      await sleep(150);
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
      errors++;
    }
  }

  // Update and save
  index.totalSkills = index.skills.length;
  index.lastSync = new Date().toISOString();

  console.log("\n💾 Saving data...");
  await saveData(index, fullData);

  console.log("\n" + "=".repeat(50));
  console.log("📊 SUMMARY");
  console.log("=".repeat(50));
  console.log(`✅ Added: ${added} new skills`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📦 Total skills: ${index.totalSkills}`);
  console.log("=".repeat(50));
}

main().catch(console.error);
