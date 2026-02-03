/**
 * Fix missing fields in skills index
 * - Add missing repoUrl from full data
 * - Add default description for skills missing it
 */

import * as fs from "fs/promises";
import * as path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "skills");

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

interface FullSkill {
  id: string;
  name: string;
  description: string;
  repo: {
    owner: string;
    name: string;
    fullName: string;
    url: string;
  };
  category: string;
  tags: string[];
  metadata: {
    stars: number;
    updatedAt: string;
  };
}

async function fixMissingFields() {
  console.log("🔧 Fixing missing fields in skills data...\n");

  // Load index
  const indexPath = path.join(DATA_DIR, "index.json");
  const indexContent = await fs.readFile(indexPath, "utf-8");
  const indexData = JSON.parse(indexContent);

  // Load full data
  const fullPath = path.join(DATA_DIR, "skills-full.json");
  const fullContent = await fs.readFile(fullPath, "utf-8");
  const fullData: Record<string, FullSkill> = JSON.parse(fullContent);

  let fixedRepoUrl = 0;
  let fixedDescription = 0;

  // Fix each skill in index
  for (const skill of indexData.skills) {
    const fullSkill = fullData[skill.id];

    // Fix missing repoUrl
    if (!skill.repoUrl && fullSkill?.repo?.url) {
      skill.repoUrl = fullSkill.repo.url;
      fixedRepoUrl++;
    } else if (!skill.repoUrl && fullSkill?.repo?.fullName) {
      skill.repoUrl = `https://github.com/${fullSkill.repo.fullName}`;
      fixedRepoUrl++;
    }

    // Fix missing description
    if (!skill.description && fullSkill?.description) {
      skill.description = fullSkill.description;
      fixedDescription++;
    } else if (!skill.description) {
      skill.description = `${skill.name} - A skill for Claude Code and AI agents`;
      fixedDescription++;
    }
  }

  // Save updated index
  await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2));
  console.log(`✓ Fixed ${fixedRepoUrl} missing repoUrl fields`);
  console.log(`✓ Fixed ${fixedDescription} missing description fields`);

  // Also update category files
  console.log("\n📁 Updating category files...");
  const categoryDir = path.join(DATA_DIR, "by-category");
  const files = await fs.readdir(categoryDir);

  for (const file of files.filter(f => f.endsWith(".json"))) {
    const catPath = path.join(categoryDir, file);
    const catContent = await fs.readFile(catPath, "utf-8");
    const catData = JSON.parse(catContent);

    const skills = Array.isArray(catData) ? catData : catData.skills || [];
    let catFixed = 0;

    for (const skill of skills) {
      const fullSkill = fullData[skill.id];

      if (!skill.repoUrl && fullSkill?.repo?.url) {
        skill.repoUrl = fullSkill.repo.url;
        catFixed++;
      } else if (!skill.repoUrl && fullSkill?.repo?.fullName) {
        skill.repoUrl = `https://github.com/${fullSkill.repo.fullName}`;
        catFixed++;
      }

      if (!skill.description && fullSkill?.description) {
        skill.description = fullSkill.description;
      } else if (!skill.description) {
        skill.description = `${skill.name} - A skill for Claude Code and AI agents`;
      }

      // Ensure category field exists
      if (!skill.category) {
        skill.category = file.replace(".json", "");
      }
    }

    // Save as array format (simpler)
    await fs.writeFile(catPath, JSON.stringify(skills, null, 2));
    console.log(`  ✓ ${file}: fixed ${catFixed} skills`);
  }

  console.log("\n✅ All missing fields have been fixed!");
}

fixMissingFields()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
