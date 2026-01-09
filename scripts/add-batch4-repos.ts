#!/usr/bin/env node
/**
 * Add skills from multiple high-quality repositories
 * Batch 4: obra, zebbern, diet103
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Octokit } from "@octokit/rest";
import { writeFileSync, readFileSync } from "fs";
import matter from "gray-matter";

config({ path: resolve(process.cwd(), ".env.local") });

const REPOS = [
  { owner: "obra", repo: "superpowers", stars: 14927 },
  { owner: "zebbern", repo: "claude-code-guide", stars: 2944 },
  { owner: "diet103", repo: "claude-code-infrastructure-showcase", stars: 8245 },
];

function inferCategory(path: string, name: string, description: string): string {
  const text = `${path} ${name} ${description}`.toLowerCase();

  if (text.includes("frontend") || text.includes("ui") || text.includes("design") || text.includes("react") || text.includes("vue")) {
    return "frontend-development";
  }
  if (text.includes("backend") || text.includes("api") || text.includes("server") || text.includes("database")) {
    return "backend-development";
  }
  if (text.includes("test") || text.includes("qa") || text.includes("debug")) {
    return "testing-quality";
  }
  if (text.includes("devops") || text.includes("deploy") || text.includes("infrastructure") || text.includes("docker") || text.includes("kubernetes")) {
    return "devops-infrastructure";
  }
  if (text.includes("ai") || text.includes("ml") || text.includes("data") || text.includes("machine learning")) {
    return "ai-data-science";
  }
  if (text.includes("security") || text.includes("blockchain") || text.includes("web3")) {
    return "specialized";
  }
  if (text.includes("business") || text.includes("marketing") || text.includes("ecommerce")) {
    return "business-marketing";
  }

  return "tools-productivity";
}

async function addSkillsFromRepo(
  octokit: Octokit,
  owner: string,
  repo: string,
  repoStars: number,
  indexData: any,
  fullData: any,
  existingIds: Set<string>
): Promise<{ added: number; skipped: number }> {
  console.log(`\n📦 ${owner}/${repo}`);

  let addedCount = 0;
  let skippedCount = 0;

  try {
    const { data: repoData } = await octokit.repos.get({ owner, repo });

    // Search for all SKILL.md files
    const { data: searchResults } = await octokit.search.code({
      q: `filename:SKILL.md repo:${owner}/${repo}`,
      per_page: 100,
    });

    console.log(`   Found ${searchResults.total_count} SKILL.md files`);

    for (const item of searchResults.items) {
      const skillPath = item.path;

      // Extract skill name
      const parts = skillPath.split("/");
      const skillName = parts.length > 2 ? parts[parts.length - 2] : parts[0].replace(".md", "");

      const skillId = `${owner}-${repo}-${skillName}`.toLowerCase();

      try {
        if (existingIds.has(skillId)) {
          skippedCount++;
          continue;
        }

        // Fetch SKILL.md content
        const { data: fileData } = await octokit.repos.getContent({
          owner,
          repo,
          path: skillPath,
        });

        if (!("content" in fileData)) {
          continue;
        }

        const content = Buffer.from(fileData.content, "base64").toString("utf-8");
        const { data: frontmatter, content: markdown } = matter(content);

        const tags = frontmatter.tags || [];
        const name = frontmatter.name || skillName;
        const description = frontmatter.description || "";
        const category = inferCategory(skillPath, name, description);

        const skill = {
          id: skillId,
          name,
          description,
          repo: {
            owner,
            name: repo,
            fullName: `${owner}/${repo}`,
            url: `https://github.com/${owner}/${repo}/tree/main/${skillPath.replace("/SKILL.md", "")}`,
            defaultBranch: repoData.default_branch,
          },
          metadata: {
            stars: repoData.stargazers_count,
            forks: repoData.forks_count,
            language: repoData.language,
            topics: (repoData.topics as string[]) || [],
            updatedAt: repoData.updated_at,
            pushedAt: repoData.pushed_at,
            createdAt: repoData.created_at,
            license: repoData.license?.name,
          },
          category,
          tags,
          skillMd: {
            raw: content,
            frontmatter,
            content: markdown,
          },
        };

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

        fullData[skill.id] = skill;
        existingIds.add(skillId);

        addedCount++;
        if (addedCount % 5 === 0) {
          process.stdout.write(".");
        }

        await new Promise(resolve => setTimeout(resolve, 700));

      } catch (error: any) {
        // Skip failed skills
      }
    }

    console.log(` ✅ +${addedCount}`);

  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  return { added: addedCount, skipped: skippedCount };
}

async function addBatch4() {
  console.log(`🚀 Adding Batch 4: High-quality skill repositories\n`);

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const indexPath = resolve(process.cwd(), "data/skills/index.json");
  const fullPath = resolve(process.cwd(), "data/skills/skills-full.json");

  const indexData = JSON.parse(readFileSync(indexPath, "utf-8"));
  const fullData = JSON.parse(readFileSync(fullPath, "utf-8"));

  const existingIds = new Set(Object.keys(fullData));

  let totalAdded = 0;
  let totalSkipped = 0;

  for (const { owner, repo, stars } of REPOS) {
    const { added, skipped } = await addSkillsFromRepo(
      octokit,
      owner,
      repo,
      stars,
      indexData,
      fullData,
      existingIds
    );
    totalAdded += added;
    totalSkipped += skipped;
  }

  indexData.totalSkills = indexData.skills.length;
  indexData.lastSync = new Date().toISOString();

  writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  writeFileSync(fullPath, JSON.stringify(fullData, null, 2));

  console.log(`\n\n✅ Batch 4 Complete!`);
  console.log(`➕ Added: ${totalAdded} new skills`);
  console.log(`⏭️  Skipped: ${totalSkipped} existing`);
  console.log(`📊 Total: ${indexData.totalSkills} skills`);
}

addBatch4();
