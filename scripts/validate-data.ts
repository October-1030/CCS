/**
 * Data validation script for Skills Marketplace
 * Validates the integrity of skill data files
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

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalSkills: number;
    byCategory: Record<string, number>;
    missingFields: Record<string, number>;
    duplicateIds: string[];
  };
}

async function validateData(): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    stats: {
      totalSkills: 0,
      byCategory: {},
      missingFields: {},
      duplicateIds: [],
    },
  };

  console.log("🔍 Validating Skills Marketplace data...\n");

  // 1. Check index.json exists
  const indexPath = path.join(DATA_DIR, "index.json");
  let indexData: { version: string; lastSync: string; totalSkills: number; skills: SkillIndex[] };

  try {
    const content = await fs.readFile(indexPath, "utf-8");
    indexData = JSON.parse(content);
    console.log(`✓ index.json loaded (${indexData.totalSkills} skills declared)`);
  } catch (error) {
    result.errors.push(`Cannot read index.json: ${error}`);
    result.valid = false;
    return result;
  }

  // 2. Validate index structure
  if (!indexData.version) {
    result.warnings.push("Missing version field in index.json");
  }
  if (!indexData.lastSync) {
    result.warnings.push("Missing lastSync field in index.json");
  }
  if (!Array.isArray(indexData.skills)) {
    result.errors.push("skills field is not an array");
    result.valid = false;
    return result;
  }

  result.stats.totalSkills = indexData.skills.length;

  // 3. Validate each skill entry
  const seenIds = new Set<string>();
  const requiredFields: (keyof SkillIndex)[] = ["id", "name", "description", "category", "tags", "repoUrl"];

  for (const skill of indexData.skills) {
    // Check for duplicate IDs
    if (seenIds.has(skill.id)) {
      result.stats.duplicateIds.push(skill.id);
    } else {
      seenIds.add(skill.id);
    }

    // Check required fields
    for (const field of requiredFields) {
      if (!skill[field]) {
        result.stats.missingFields[field] = (result.stats.missingFields[field] || 0) + 1;
      }
    }

    // Count by category
    const cat = skill.category || "uncategorized";
    result.stats.byCategory[cat] = (result.stats.byCategory[cat] || 0) + 1;

    // Validate tags is an array
    if (skill.tags && !Array.isArray(skill.tags)) {
      result.warnings.push(`Skill ${skill.id}: tags is not an array`);
    }
  }

  // 4. Check for duplicates
  if (result.stats.duplicateIds.length > 0) {
    result.errors.push(`Found ${result.stats.duplicateIds.length} duplicate IDs`);
    result.valid = false;
  }

  // 5. Check category files
  console.log("\n📁 Checking category files...");
  const categoryDir = path.join(DATA_DIR, "by-category");

  try {
    const files = await fs.readdir(categoryDir);
    const jsonFiles = files.filter(f => f.endsWith(".json"));

    for (const file of jsonFiles) {
      const catPath = path.join(categoryDir, file);
      try {
        const content = await fs.readFile(catPath, "utf-8");
        const data = JSON.parse(content);
        const skills = Array.isArray(data) ? data : data.skills || [];
        const categoryName = file.replace(".json", "");
        console.log(`  ✓ ${categoryName}: ${skills.length} skills`);
      } catch (error) {
        result.warnings.push(`Cannot read category file ${file}: ${error}`);
      }
    }
  } catch (error) {
    result.warnings.push(`Cannot read category directory: ${error}`);
  }

  // 6. Check skills-full.json exists
  const fullDataPath = path.join(DATA_DIR, "skills-full.json");
  try {
    const stats = await fs.stat(fullDataPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`\n✓ skills-full.json exists (${sizeMB} MB)`);
  } catch (error) {
    result.warnings.push("skills-full.json not found");
  }

  // Print results
  console.log("\n" + "=".repeat(50));
  console.log("📊 VALIDATION RESULTS");
  console.log("=".repeat(50));

  console.log(`\nTotal Skills: ${result.stats.totalSkills}`);
  console.log(`Declared Total: ${indexData.totalSkills}`);

  if (result.stats.totalSkills !== indexData.totalSkills) {
    result.warnings.push(`Skill count mismatch: declared ${indexData.totalSkills}, actual ${result.stats.totalSkills}`);
  }

  console.log("\nBy Category:");
  for (const [cat, count] of Object.entries(result.stats.byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }

  if (Object.keys(result.stats.missingFields).length > 0) {
    console.log("\n⚠️  Missing Fields:");
    for (const [field, count] of Object.entries(result.stats.missingFields)) {
      console.log(`  ${field}: ${count} skills`);
    }
  }

  if (result.stats.duplicateIds.length > 0) {
    console.log("\n❌ Duplicate IDs:");
    for (const id of result.stats.duplicateIds.slice(0, 10)) {
      console.log(`  ${id}`);
    }
    if (result.stats.duplicateIds.length > 10) {
      console.log(`  ... and ${result.stats.duplicateIds.length - 10} more`);
    }
  }

  if (result.errors.length > 0) {
    console.log("\n❌ Errors:");
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log("\n⚠️  Warnings:");
    for (const warning of result.warnings) {
      console.log(`  - ${warning}`);
    }
  }

  console.log("\n" + "=".repeat(50));
  if (result.valid && result.errors.length === 0) {
    console.log("✅ Data validation PASSED");
  } else {
    console.log("❌ Data validation FAILED");
  }
  console.log("=".repeat(50));

  return result;
}

// Run validation
validateData()
  .then((result) => {
    process.exit(result.valid ? 0 : 1);
  })
  .catch((error) => {
    console.error("Validation failed with error:", error);
    process.exit(1);
  });
