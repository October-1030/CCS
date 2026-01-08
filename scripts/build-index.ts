#!/usr/bin/env node
/**
 * Rebuild index.json from skills-full.json
 */

import { config } from "dotenv";
import { resolve } from "path";
import { writeFileSync, readFileSync } from "fs";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });

async function buildIndex() {
  console.log("🔨 Rebuilding index from skills-full.json...\n");

  const indexPath = resolve(process.cwd(), "data/skills/index.json");
  const fullPath = resolve(process.cwd(), "data/skills/skills-full.json");

  // Load full data
  const fullData = JSON.parse(readFileSync(fullPath, "utf-8"));

  // Build index
  const skills = Object.values(fullData).map((skill: any) => ({
    id: skill.id,
    name: skill.name,
    description: skill.description,
    category: skill.category,
    tags: skill.tags,
    stars: skill.metadata.stars,
    updatedAt: skill.metadata.updatedAt,
    repoUrl: skill.repo.url,
  }));

  const indexData = {
    version: "1.0.0",
    lastSync: new Date().toISOString(),
    totalSkills: skills.length,
    skills: skills,
  };

  // Save index
  writeFileSync(indexPath, JSON.stringify(indexData, null, 2));

  console.log(`✅ Rebuilt index with ${skills.length} skills!`);
}

buildIndex();
