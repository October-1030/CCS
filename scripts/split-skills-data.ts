#!/usr/bin/env node
/**
 * Split skills-full.json into smaller category-based files
 * This is needed because Vercel doesn't support Git LFS
 */

import * as fs from "fs/promises";
import * as path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "skills");

async function splitSkillsData() {
  console.log("📦 Splitting skills-full.json into category files...\n");

  // Load the full data
  const fullPath = path.join(DATA_DIR, "skills-full.json");
  const content = await fs.readFile(fullPath, "utf-8");
  const fullData: Record<string, any> = JSON.parse(content);

  // Group by category
  const byCategory: Record<string, Record<string, any>> = {};
  let total = 0;

  for (const [id, skill] of Object.entries(fullData)) {
    const category = skill.category || "other";
    if (!byCategory[category]) {
      byCategory[category] = {};
    }
    byCategory[category][id] = skill;
    total++;
  }

  // Create full-by-category directory
  const fullByCategoryDir = path.join(DATA_DIR, "full-by-category");
  await fs.mkdir(fullByCategoryDir, { recursive: true });

  // Write each category file
  for (const [category, skills] of Object.entries(byCategory)) {
    const categoryPath = path.join(fullByCategoryDir, `${category}.json`);
    const skillCount = Object.keys(skills).length;

    await fs.writeFile(categoryPath, JSON.stringify(skills, null, 2));

    const stats = await fs.stat(categoryPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`  ✅ ${category}: ${skillCount} skills (${sizeMB} MB)`);
  }

  // Create an index mapping skill IDs to categories for quick lookup
  const idToCategoryMap: Record<string, string> = {};
  for (const [id, skill] of Object.entries(fullData)) {
    idToCategoryMap[id] = skill.category || "other";
  }

  const mapPath = path.join(DATA_DIR, "id-to-category.json");
  await fs.writeFile(mapPath, JSON.stringify(idToCategoryMap));

  const mapStats = await fs.stat(mapPath);
  console.log(`\n  📍 ID to category map: ${(mapStats.size / 1024).toFixed(0)} KB`);

  console.log("\n" + "=".repeat(50));
  console.log("📊 SUMMARY");
  console.log("=".repeat(50));
  console.log(`Total skills: ${total}`);
  console.log(`Categories: ${Object.keys(byCategory).length}`);
  console.log("=".repeat(50));
}

splitSkillsData().catch(console.error);
