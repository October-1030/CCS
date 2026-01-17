/**
 * Skills database operations (JSON file based)
 */

import * as fs from "fs/promises";
import * as path from "path";
import type { Skill, SkillIndex, SkillsIndex, StatsData } from "@/types/skill";

const DATA_DIR = path.join(process.cwd(), "data");

/**
 * Load skills index (lightweight, for listings)
 */
export async function loadSkillsIndex(): Promise<SkillsIndex> {
  const indexPath = path.join(DATA_DIR, "skills", "index.json");

  try {
    const content = await fs.readFile(indexPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    // Return empty index if file doesn't exist
    return {
      version: "1.0.0",
      lastSync: new Date().toISOString(),
      totalSkills: 0,
      skills: [],
    };
  }
}

/**
 * Load full skill data by ID
 */
export async function loadSkillById(id: string): Promise<Skill | null> {
  const fullDataPath = path.join(DATA_DIR, "skills", "skills-full.json");

  try {
    const content = await fs.readFile(fullDataPath, "utf-8");
    const data: Record<string, Skill> = JSON.parse(content);
    return data[id] || null;
  } catch (error) {
    return null;
  }
}

/**
 * Load all full skills data
 */
export async function loadAllSkills(): Promise<Skill[]> {
  const fullDataPath = path.join(DATA_DIR, "skills", "skills-full.json");

  try {
    const content = await fs.readFile(fullDataPath, "utf-8");
    const data: Record<string, Skill> = JSON.parse(content);
    return Object.values(data);
  } catch (error) {
    return [];
  }
}

/**
 * Load skills by category
 */
export async function loadSkillsByCategory(category: string): Promise<SkillIndex[]> {
  const categoryPath = path.join(DATA_DIR, "skills", "by-category", `${category}.json`);

  try {
    const content = await fs.readFile(categoryPath, "utf-8");
    const data = JSON.parse(content);
    // Handle both array format and object format { skills: [...] }
    let skills: SkillIndex[];
    if (Array.isArray(data)) {
      skills = data;
    } else {
      skills = data.skills || [];
    }
    // Add category field if missing
    return skills.map(skill => ({
      ...skill,
      category: skill.category || category,
      repoUrl: skill.repoUrl || '',
    }));
  } catch (error) {
    return [];
  }
}

/**
 * Load statistics
 */
export async function loadStats(): Promise<StatsData | null> {
  const statsPath = path.join(DATA_DIR, "metadata", "stats.json");

  try {
    const content = await fs.readFile(statsPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

/**
 * Get popular skills (sorted by stars)
 */
export async function getPopularSkills(limit: number = 20): Promise<SkillIndex[]> {
  const index = await loadSkillsIndex();

  return index.skills
    .sort((a, b) => b.stars - a.stars)
    .slice(0, limit);
}

/**
 * Get recently updated skills
 */
export async function getRecentSkills(limit: number = 20): Promise<SkillIndex[]> {
  const index = await loadSkillsIndex();

  return index.skills
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
}

/**
 * Check if data directory exists and has data
 */
export async function hasData(): Promise<boolean> {
  try {
    const index = await loadSkillsIndex();
    return index.totalSkills > 0;
  } catch (error) {
    return false;
  }
}
