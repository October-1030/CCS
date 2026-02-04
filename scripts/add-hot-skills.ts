#!/usr/bin/env node
/**
 * Add specific hot skills to the database
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

// Hot repos to add (batch 4) - High star repos from claude-code topic
const HOT_REPOS = [
  // 10k+ stars
  "CherryHQ/cherry-studio",
  "affaan-m/everything-claude-code",
  "nextlevelbuilder/ui-ux-pro-max-skill",
  "hesreallyhim/awesome-claude-code",
  "winfunc/opcode",
  "oraios/serena",
  "davila7/claude-code-templates",
  "shareAI-lab/learn-claude-code",
  "farion1231/cc-switch",
  "steveyegge/beads",
  "ruvnet/claude-flow",
  "iOfficeAI/AionUi",
  "glittercowboy/get-shit-done",
  "slopus/happy",
  // 5k-10k stars
  "router-for-me/CLIProxyAPI",
  "humanlayer/humanlayer",
  "mcp-use/mcp-use",
  "Wei-Shaw/claude-relay-service",
  "sickn33/antigravity-awesome-skills",
  "automazeio/ccpm",
  "Maciek-roboblog/Claude-Code-Usage-Monitor",
  "anthropics/claude-plugins-official",
  "frankbria/ralph-claude-code",
  "olimorris/codecompanion.nvim",
  "siteboon/claudecodeui",
  "smtg-ai/claude-squad",
  "UfoMiao/zcf",
  "zilliztech/claude-context",
  // 3k-5k stars
  "adenhq/hive",
  "steipete/CodexBar",
  "Yeachan-Heo/oh-my-claudecode",
  "rowboatlabs/rowboat",
  "Piebald-AI/claude-code-system-prompts",
  "opactorai/Claudable",
  "su-kaka/gcli2api",
  "sirmalloc/ccstatusline",
  "zebbern/claude-code-guide",
  "breaking-brake/cc-wf-studio",
  "ComposioHQ/open-claude-cowork",
  "jarrodwatts/claude-hud",
];

// Category inference
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "ai-data-science": ["ai", "ml", "machine-learning", "data", "llm", "gpt", "claude", "agent", "nlp", "neural", "deep-learning", "openai", "anthropic", "memory", "rag"],
  "devops-infrastructure": ["docker", "kubernetes", "aws", "azure", "gcp", "terraform", "ansible", "ci", "cd", "devops", "infrastructure", "cloud", "opentofu"],
  "tools-productivity": ["cli", "tool", "utility", "automation", "workflow", "productivity", "git", "vim", "vscode", "settings", "config"],
  "frontend-development": ["react", "vue", "angular", "css", "html", "ui", "ux", "frontend", "web", "svelte", "tailwind"],
  "backend-development": ["api", "server", "database", "node", "python", "java", "golang", "rust", "backend", "express"],
  "testing-quality": ["test", "testing", "qa", "quality", "jest", "pytest", "cypress", "selenium"],
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

async function fetchSkillMd(owner: string, repo: string): Promise<string | null> {
  const paths = ["SKILL.md", "skill.md", ".claude/skills/SKILL.md", "skills/SKILL.md"];

  for (const filePath of paths) {
    try {
      const { data } = await octokit.rest.repos.getContent({ owner, repo, path: filePath });
      if ("content" in data && data.content) {
        return Buffer.from(data.content, "base64").toString("utf-8");
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function main() {
  console.log("🔥 Adding hot Claude skills to database...\n");

  // Load existing data
  const indexPath = path.join(DATA_DIR, "index.json");
  const fullPath = path.join(DATA_DIR, "skills-full.json");

  const indexData = JSON.parse(await fs.readFile(indexPath, "utf-8"));
  const fullData = JSON.parse(await fs.readFile(fullPath, "utf-8"));
  const existingIds = new Set(indexData.skills.map((s: any) => s.id));

  let added = 0;

  for (const repoFullName of HOT_REPOS) {
    const [owner, repo] = repoFullName.split("/");
    const skillId = generateSkillId(owner, repo);

    if (existingIds.has(skillId)) {
      console.log(`⏭️  ${repoFullName} already exists (${skillId})`);
      continue;
    }

    console.log(`\n📥 Processing ${repoFullName}...`);

    try {
      // Get repo info
      const { data: repoInfo } = await octokit.rest.repos.get({ owner, repo });

      // Try to get SKILL.md
      const skillMdContent = await fetchSkillMd(owner, repo);
      let frontmatter: Record<string, any> = {};
      let content = "";

      if (skillMdContent) {
        const parsed = matter(skillMdContent);
        frontmatter = parsed.data;
        content = parsed.content;
        console.log(`   ✓ Found SKILL.md`);
      } else {
        console.log(`   ⚠️ No SKILL.md, using repo info`);
      }

      // Create skill object
      const skill = {
        id: skillId,
        name: frontmatter.name || repo,
        description: frontmatter.description || repoInfo.description || `${repo} - A skill for Claude Code`,
        repo: {
          owner,
          name: repo,
          fullName: repoInfo.full_name,
          url: repoInfo.html_url,
          defaultBranch: repoInfo.default_branch || "main",
        },
        metadata: {
          stars: repoInfo.stargazers_count,
          forks: repoInfo.forks_count,
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
          raw: skillMdContent || "",
          frontmatter,
          content,
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
      indexData.skills.push({
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
      console.log(`   ✅ Added: ${skill.name} (${skill.category}) - ⭐${skill.metadata.stars}`);

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  // Update index metadata
  indexData.totalSkills = indexData.skills.length;
  indexData.lastSync = new Date().toISOString();

  // Save data
  console.log("\n💾 Saving data...");
  await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2));
  await fs.writeFile(fullPath, JSON.stringify(fullData, null, 2));

  // Update category files
  const byCategory: Record<string, any[]> = {};
  for (const skill of indexData.skills) {
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

  console.log("\n" + "=".repeat(50));
  console.log("📊 SUMMARY");
  console.log("=".repeat(50));
  console.log(`✅ Added: ${added} new skills`);
  console.log(`📦 Total skills: ${indexData.totalSkills}`);
  console.log("=".repeat(50));
}

main().catch(console.error);
