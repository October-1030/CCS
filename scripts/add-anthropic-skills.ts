#!/usr/bin/env node
/**
 * Add Anthropic official skills to the database
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Octokit } from "@octokit/rest";
import { writeFileSync, readFileSync } from "fs";
import matter from "gray-matter";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });

const ANTHROPIC_SKILLS = [
  "algorithmic-art",
  "brand-guidelines", 
  "canvas-design",
  "doc-coauthoring",
  "docx",
  "frontend-design",
  "internal-comms",
  "mcp-builder",
  "pdf",
  "pptx",
  "skill-creator",
  "slack-gif-creator",
  "theme-factory",
  "web-artifacts-builder",
  "webapp-testing",
  "xlsx"
];

async function addAnthropicSkills() {
  console.log("🚀 Adding Anthropic official skills...\n");

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  
  // Load existing data
  const indexPath = resolve(process.cwd(), "data/skills/index.json");
  const fullPath = resolve(process.cwd(), "data/skills/skills-full.json");

  const indexData = JSON.parse(readFileSync(indexPath, "utf-8"));
  const fullData = JSON.parse(readFileSync(fullPath, "utf-8"));

  // Check if skill exists in fullData (not just index)
  const existingIds = new Set(Object.keys(fullData));

  // Ensure fullData is an object (not an array)
  if (Array.isArray(fullData)) {
    throw new Error("fullData should be an object, not an array");
  }
  
  let addedCount = 0;
  
  for (const skillName of ANTHROPIC_SKILLS) {
    try {
      const skillId = `anthropics-skills-${skillName}`;
      
      if (existingIds.has(skillId)) {
        console.log(`⏭️  Skipping ${skillName} (already exists)`);
        continue;
      }
      
      console.log(`📥 Fetching ${skillName}...`);
      
      // Get SKILL.md content
      const { data: fileData } = await octokit.repos.getContent({
        owner: "anthropics",
        repo: "skills",
        path: `skills/${skillName}/SKILL.md`,
      });
      
      if (!("content" in fileData)) continue;
      
      const content = Buffer.from(fileData.content, "base64").toString("utf-8");
      const { data: frontmatter, content: markdown } = matter(content);
      
      // Get repo metadata
      const { data: repo } = await octokit.repos.get({
        owner: "anthropics",
        repo: "skills",
      });
      
      const skill = {
        id: skillId,
        name: frontmatter.name || skillName,
        description: frontmatter.description || "",
        repo: {
          owner: "anthropics",
          name: "skills",
          fullName: "anthropics/skills",
          url: `https://github.com/anthropics/skills/tree/main/skills/${skillName}`,
          defaultBranch: "main",
        },
        metadata: {
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: "TypeScript",
          topics: repo.topics || [],
          updatedAt: repo.updated_at,
          pushedAt: repo.pushed_at,
        },
        category: "official",
        tags: frontmatter.tags || [],
        skillMd: {
          raw: content,
          frontmatter,
          content: markdown,
        },
      };
      
      // Add to index
      indexData.skills.push({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        category: skill.category,
        tags: skill.tags,
        stars: skill.metadata.stars,
        updatedAt: skill.metadata.updatedAt,
        repoUrl: skill.repo.url,
      });

      // Add to full data (as object with id as key)
      fullData[skill.id] = skill;
      
      addedCount++;
      console.log(`   ✅ Added ${skillName}`);
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  // Update counts
  indexData.totalSkills = indexData.skills.length;
  indexData.lastSync = new Date().toISOString();
  
  // Save
  writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  writeFileSync(fullPath, JSON.stringify(fullData, null, 2));
  
  console.log(`\n✅ Added ${addedCount} Anthropic skills!`);
  console.log(`📊 Total skills: ${indexData.totalSkills}`);
}

addAnthropicSkills();
