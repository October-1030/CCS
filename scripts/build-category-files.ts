#!/usr/bin/env node
/**
 * Build category-specific JSON files from index
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";

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

function buildCategoryFiles() {
  console.log("📦 Building category files...\n");

  const indexPath = resolve(process.cwd(), "data/skills/index.json");
  const categoryDir = resolve(process.cwd(), "data/skills/by-category");

  // Ensure directory exists
  mkdirSync(categoryDir, { recursive: true });

  const indexData = JSON.parse(readFileSync(indexPath, "utf-8"));
  const skills: SkillIndex[] = indexData.skills;

  // Group by category
  const byCategory: Record<string, SkillIndex[]> = {};
  skills.forEach((skill) => {
    const cat = skill.category || "other";
    if (!byCategory[cat]) {
      byCategory[cat] = [];
    }
    byCategory[cat].push(skill);
  });

  // Write each category file
  Object.entries(byCategory).forEach(([category, categorySkills]) => {
    const filePath = resolve(categoryDir, `${category}.json`);
    writeFileSync(filePath, JSON.stringify(categorySkills, null, 2));
    console.log(`✅ ${category.padEnd(30)} ${categorySkills.length} skills`);
  });

  console.log(`\n✅ Generated ${Object.keys(byCategory).length} category files\n`);
}

buildCategoryFiles();
