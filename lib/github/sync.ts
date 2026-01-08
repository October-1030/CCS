import { GitHubClient } from "./client";
import { SkillsCrawler } from "./search";
import { buildSkill, skillToIndex } from "@/lib/data/parser";
import type { Skill, SkillIndex, SkillsIndex, StatsData } from "@/types/skill";
import * as fs from "fs/promises";
import * as path from "path";

export interface SyncOptions {
  maxSkills?: number;
  full?: boolean;
  outputDir?: string;
  onProgress?: (message: string, current?: number, total?: number) => void;
}

export interface SyncResult {
  success: boolean;
  totalSkills: number;
  newSkills: number;
  updatedSkills: number;
  errors: number;
  duration: number;
}

/**
 * Sync skills from GitHub
 */
export async function syncSkills(options: SyncOptions = {}): Promise<SyncResult> {
  const startTime = Date.now();
  const outputDir = options.outputDir || path.join(process.cwd(), "data");

  const log = (msg: string, current?: number, total?: number) => {
    if (options.onProgress) {
      options.onProgress(msg, current, total);
    } else {
      console.log(msg);
    }
  };

  try {
    log("🚀 Starting skill sync...");

    // Initialize GitHub client
    const client = new GitHubClient();
    const crawler = new SkillsCrawler(client);

    // Check rate limit
    const rateLimit = await client.getRateLimit();
    log(`📊 Rate limit: ${rateLimit.remaining}/${rateLimit.limit} requests remaining`);

    // Load existing data (if incremental sync)
    let existingSkills: Map<string, Skill> = new Map();
    if (!options.full) {
      try {
        const existing = await loadExistingSkills(outputDir);
        existingSkills = new Map(existing.map((s) => [s.id, s]));
        log(`📦 Loaded ${existingSkills.size} existing skills`);
      } catch (error) {
        log("⚠️  No existing data found, performing full sync");
      }
    }

    // Search for skills repositories
    log("\n🔍 Searching GitHub for skills...");
    const repos = await crawler.searchAll({
      maxPerQuery: options.maxSkills || 1000,
      onProgress: (progress) => {
        log(`   ${progress.query}: page ${progress.page}, found ${progress.found}`);
      },
    });

    log(`\n✅ Found ${repos.length} repositories`);

    // Verify and fetch skills
    log("\n📥 Fetching skill data...");
    const skills: Skill[] = [];
    let newCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < repos.length; i++) {
      const repo = repos[i];

      // Skip if owner is null
      if (!repo.owner) {
        log(`Skipping ${repo.full_name}: no owner info`);
        continue;
      }

      log(`Processing ${i + 1}/${repos.length}: ${repo.full_name}`, i + 1, repos.length);

      try {
        // Get repository metadata
        const metadata = await crawler.getRepoMetadata(repo.owner.login, repo.name);

        // Find and fetch SKILL.md
        const skillMdContent = await client.findSkillMd(repo.owner.login, repo.name);

        if (!skillMdContent) {
          log(`   ⚠️  No SKILL.md found in ${repo.full_name}`);
          continue;
        }

        // Build skill object
        const skill = buildSkill(metadata, skillMdContent);

        // Check if it's new or updated
        const existing = existingSkills.get(skill.id);
        if (!existing) {
          newCount++;
          log(`   ✨ New skill: ${skill.name}`);
        } else if (existing.metadata.updatedAt !== skill.metadata.updatedAt) {
          updatedCount++;
          log(`   🔄 Updated: ${skill.name}`);
        }

        skills.push(skill);
      } catch (error: any) {
        errorCount++;
        log(`   ❌ Error processing ${repo.full_name}: ${error.message}`);
      }
    }

    // Save data
    log("\n💾 Saving data...");
    await saveSkillsData(skills, outputDir);

    const duration = Date.now() - startTime;
    log(`\n✅ Sync completed in ${(duration / 1000).toFixed(2)}s`);
    log(`   Total: ${skills.length} skills`);
    log(`   New: ${newCount}`);
    log(`   Updated: ${updatedCount}`);
    log(`   Errors: ${errorCount}`);

    return {
      success: true,
      totalSkills: skills.length,
      newSkills: newCount,
      updatedSkills: updatedCount,
      errors: errorCount,
      duration,
    };
  } catch (error: any) {
    log(`\n❌ Sync failed: ${error.message}`);
    throw error;
  }
}

/**
 * Load existing skills from data directory
 */
async function loadExistingSkills(outputDir: string): Promise<Skill[]> {
  const fullDataPath = path.join(outputDir, "skills", "skills-full.json");
  const content = await fs.readFile(fullDataPath, "utf-8");
  const data = JSON.parse(content);

  // Convert object to array
  return Object.values(data);
}

/**
 * Save skills data to files
 */
async function saveSkillsData(skills: Skill[], outputDir: string): Promise<void> {
  // Ensure directories exist
  await fs.mkdir(path.join(outputDir, "skills", "by-category"), { recursive: true });
  await fs.mkdir(path.join(outputDir, "metadata"), { recursive: true });

  // Build index (lightweight)
  const index: SkillIndex[] = skills.map(skillToIndex);

  // Build full data (keyed by ID)
  const fullData: Record<string, Skill> = {};
  skills.forEach((skill) => {
    fullData[skill.id] = skill;
  });

  // Build stats
  const stats = buildStats(skills);

  // Group by category
  const byCategory: Record<string, SkillIndex[]> = {};
  index.forEach((skill) => {
    if (!byCategory[skill.category]) {
      byCategory[skill.category] = [];
    }
    byCategory[skill.category].push(skill);
  });

  // Save index
  const skillsIndex: SkillsIndex = {
    version: "1.0.0",
    lastSync: new Date().toISOString(),
    totalSkills: skills.length,
    skills: index,
  };

  await fs.writeFile(
    path.join(outputDir, "skills", "index.json"),
    JSON.stringify(skillsIndex, null, 2)
  );

  // Save full data
  await fs.writeFile(
    path.join(outputDir, "skills", "skills-full.json"),
    JSON.stringify(fullData, null, 2)
  );

  // Save by category
  for (const [category, categorySkills] of Object.entries(byCategory)) {
    await fs.writeFile(
      path.join(outputDir, "skills", "by-category", `${category}.json`),
      JSON.stringify(categorySkills, null, 2)
    );
  }

  // Save stats
  await fs.writeFile(
    path.join(outputDir, "metadata", "stats.json"),
    JSON.stringify(stats, null, 2)
  );

  console.log("✅ Data saved successfully");
}

/**
 * Build statistics from skills
 */
function buildStats(skills: Skill[]): StatsData {
  const byCategory: Record<string, number> = {};
  const tagCounts = new Map<string, number>();

  skills.forEach((skill) => {
    // Count by category
    byCategory[skill.category] = (byCategory[skill.category] || 0) + 1;

    // Count tags
    skill.tags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });

  // Top tags
  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([tag, count]) => ({ tag, count }));

  // Recently updated
  const recentlyUpdated = skills
    .sort((a, b) => new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime())
    .slice(0, 20)
    .map((s) => s.id);

  return {
    totalSkills: skills.length,
    byCategory,
    topTags,
    recentlyUpdated,
    lastSyncTime: new Date().toISOString(),
  };
}
