#!/usr/bin/env node
/**
 * Fix invalid skill entries (where name is an object instead of string)
 */

import * as fs from "fs/promises";
import * as path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "skills");

async function fixInvalidSkills() {
  console.log("🔧 Fixing invalid skill entries...\n");

  // Load index
  const indexPath = path.join(DATA_DIR, "index.json");
  const indexContent = await fs.readFile(indexPath, "utf-8");
  const indexData = JSON.parse(indexContent);

  // Load full data
  const fullPath = path.join(DATA_DIR, "skills-full.json");
  const fullContent = await fs.readFile(fullPath, "utf-8");
  const fullData = JSON.parse(fullContent);

  const invalidIds: string[] = [];

  // Find and fix invalid skills in index
  for (let i = indexData.skills.length - 1; i >= 0; i--) {
    const skill = indexData.skills[i];

    // Check if name is invalid (object or empty)
    if (typeof skill.name !== "string" || !skill.name) {
      invalidIds.push(skill.id);
      indexData.skills.splice(i, 1);
      console.log(`Removed invalid skill: ${skill.id}`);
    }

    // Check if description is invalid
    if (typeof skill.description !== "string") {
      skill.description = skill.name || skill.id;
    }
  }

  // Remove from full data
  for (const id of invalidIds) {
    delete fullData[id];
  }

  // Update totals
  indexData.totalSkills = indexData.skills.length;
  indexData.lastSync = new Date().toISOString();

  // Save index
  await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2));

  // Save full data
  await fs.writeFile(fullPath, JSON.stringify(fullData, null, 2));

  // Rebuild category files
  console.log("\n📁 Rebuilding category files...");
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
    console.log(`  ✓ ${category}: ${skills.length} skills`);
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 SUMMARY");
  console.log("=".repeat(50));
  console.log(`Removed: ${invalidIds.length} invalid skills`);
  console.log(`Remaining: ${indexData.totalSkills} skills`);
  console.log("=".repeat(50));
}

fixInvalidSkills().catch(console.error);
