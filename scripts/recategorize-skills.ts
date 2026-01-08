#!/usr/bin/env node
/**
 * Recategorize all skills into a cleaner, more logical category system
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// 新的分类系统：8个主要类别
const CATEGORY_MAPPING = {
  // 1. 前端开发
  "Frontend Development": [
    "frontend", "ui", "react", "vue", "angular", "nextjs", "design",
    "web-frameworks", "ui-styling", "frontend-development", "frontend-design"
  ],

  // 2. 后端开发
  "Backend Development": [
    "backend", "api", "server", "database", "postgres", "sql",
    "backend-development", "databases", "graphql", "nestjs", "fastapi"
  ],

  // 3. DevOps & 基础设施
  "DevOps & Infrastructure": [
    "devops", "infrastructure", "cloud", "kubernetes", "docker", "terraform",
    "deployment", "ci-cd", "sre", "monitoring", "chrome-devtools"
  ],

  // 4. AI & 数据科学
  "AI & Data Science": [
    "ai", "ml", "data", "machine-learning", "data-science", "analytics",
    "data-ml", "data-ai", "ai-multimodal", "context-engineering",
    "google-adk-python", "sequential-thinking"
  ],

  // 5. 测试 & 质量保证
  "Testing & Quality": [
    "testing", "test", "qa", "quality", "debugging", "code-review",
    "playwright", "systematic-debugging", "verification"
  ],

  // 6. 工具 & 工作流
  "Tools & Productivity": [
    "tools", "productivity", "workflow", "cli", "mcp", "skill-creator",
    "repomix", "media-processing", "mcp-builder", "mcp-management",
    "tapestry", "article-extractor", "youtube-transcript", "ship-learn-next"
  ],

  // 7. 商业 & 营销
  "Business & Marketing": [
    "business", "marketing", "product", "e-commerce", "shopify",
    "salesforce", "commerce", "growth", "content", "creative"
  ],

  // 8. 专业领域
  "Specialized": [
    "specialized", "security", "blockchain", "game", "mobile",
    "embedded", "wordpress", "scientific", "compliance", "documentation",
    "better-auth", "aesthetic", "mermaidjs", "docs-seeker", "knowledge"
  ],
};

function getCategoryForSkill(skill: any): string {
  const searchText = `${skill.name} ${skill.description} ${skill.category} ${skill.tags.join(' ')}`.toLowerCase();

  // 检查每个类别的关键词
  for (const [category, keywords] of Object.entries(CATEGORY_MAPPING)) {
    if (keywords.some(keyword => searchText.includes(keyword))) {
      return category;
    }
  }

  // 特殊处理：official skills
  if (skill.repo?.owner === "anthropics" && skill.repo?.name === "skills") {
    return "Tools & Productivity";
  }

  // 特殊处理：obra superpowers
  if (skill.repo?.owner === "obra") {
    return "Tools & Productivity";
  }

  // 默认
  return "Tools & Productivity";
}

async function recategorize() {
  console.log("🔄 Recategorizing all skills...\n");

  const indexPath = resolve(process.cwd(), "data/skills/index.json");
  const fullPath = resolve(process.cwd(), "data/skills/skills-full.json");

  const indexData = JSON.parse(readFileSync(indexPath, "utf-8"));
  const fullData = JSON.parse(readFileSync(fullPath, "utf-8"));

  const categoryStats: Record<string, number> = {};

  // Recategorize index data
  indexData.skills = indexData.skills.map((skill: any) => {
    const newCategory = getCategoryForSkill(skill);
    categoryStats[newCategory] = (categoryStats[newCategory] || 0) + 1;

    return {
      ...skill,
      category: newCategory,
    };
  });

  // Recategorize full data
  Object.keys(fullData).forEach((skillId) => {
    const skill = fullData[skillId];
    const newCategory = getCategoryForSkill(skill);
    fullData[skillId] = {
      ...skill,
      category: newCategory,
    };
  });

  // Save
  writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  writeFileSync(fullPath, JSON.stringify(fullData, null, 2));

  console.log("✅ Recategorization complete!\n");
  console.log("📊 New Category Distribution:\n");

  Object.entries(categoryStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      console.log(`${category.padEnd(30)} ${count} skills`);
    });

  console.log(`\n✅ Total: ${indexData.totalSkills} skills across ${Object.keys(categoryStats).length} categories\n`);
}

recategorize();
