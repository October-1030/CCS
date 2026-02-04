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
 * Uses split category files for better performance and to avoid Git LFS
 */
export async function loadSkillById(id: string): Promise<Skill | null> {
  try {
    // First, load the ID-to-category mapping
    const mapPath = path.join(DATA_DIR, "skills", "id-to-category.json");
    const mapContent = await fs.readFile(mapPath, "utf-8");
    const idToCategoryMap: Record<string, string> = JSON.parse(mapContent);

    const category = idToCategoryMap[id];
    if (!category) {
      return null;
    }

    // Load the category-specific full data file
    const categoryPath = path.join(DATA_DIR, "skills", "full-by-category", `${category}.json`);
    const content = await fs.readFile(categoryPath, "utf-8");
    const data: Record<string, Skill> = JSON.parse(content);

    return data[id] || null;
  } catch (error) {
    return null;
  }
}

/**
 * Load all full skills data
 * Uses split category files for better performance
 */
export async function loadAllSkills(): Promise<Skill[]> {
  const categories = [
    "ai-data-science",
    "frontend-development",
    "backend-development",
    "devops-infrastructure",
    "tools-productivity",
    "testing-quality",
    "business-marketing",
    "specialized",
  ];

  const allSkills: Skill[] = [];

  for (const category of categories) {
    try {
      const categoryPath = path.join(DATA_DIR, "skills", "full-by-category", `${category}.json`);
      const content = await fs.readFile(categoryPath, "utf-8");
      const data: Record<string, Skill> = JSON.parse(content);
      allSkills.push(...Object.values(data));
    } catch (error) {
      // Category file might not exist, continue
    }
  }

  return allSkills;
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
