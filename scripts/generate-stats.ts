#!/usr/bin/env node
/**
 * Generate statistics from skills data
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

interface StatsData {
  totalSkills: number;
  byCategory: Record<string, number>;
  topTags: Array<{ tag: string; count: number }>;
  recentlyUpdated: string[];
  lastSyncTime: string;
}

function generateStats() {
  console.log("📊 Generating statistics...\n");

  const indexPath = resolve(process.cwd(), "data/skills/index.json");
  const statsPath = resolve(process.cwd(), "data/metadata/stats.json");

  // Ensure metadata directory exists
  mkdirSync(dirname(statsPath), { recursive: true });

  const indexData = JSON.parse(readFileSync(indexPath, "utf-8"));
  const skills: SkillIndex[] = indexData.skills;

  // Count by category
  const byCategory: Record<string, number> = {};
  skills.forEach((skill) => {
    const cat = skill.category || "Other";
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  });

  // Count tags
  const tagCounts: Record<string, number> = {};
  skills.forEach((skill) => {
    if (skill.tags && Array.isArray(skill.tags)) {
      skill.tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });

  // Top 50 tags
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([tag, count]) => ({ tag, count }));

  // Recently updated (top 20)
  const recentlyUpdated = skills
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 20)
    .map((s) => s.id);

  const stats: StatsData = {
    totalSkills: skills.length,
    byCategory,
    topTags,
    recentlyUpdated,
    lastSyncTime: new Date().toISOString(),
  };

  writeFileSync(statsPath, JSON.stringify(stats, null, 2));

  console.log("✅ Statistics generated!\n");
  console.log(`Total Skills: ${stats.totalSkills}`);
  console.log(`\nBy Category:`);
  Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`  ${cat.padEnd(30)} ${count}`);
    });
  console.log(`\nTop 10 Tags:`);
  topTags.slice(0, 10).forEach(({ tag, count }) => {
    console.log(`  ${tag.padEnd(30)} ${count}`);
  });
  console.log();
}

generateStats();
