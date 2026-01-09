#!/usr/bin/env node
/**
 * Add skills from batch 7: alirezarezvani repos and numman-ali
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Octokit } from "@octokit/rest";
import { writeFileSync, readFileSync } from "fs";
import matter from "gray-matter";

config({ path: resolve(process.cwd(), ".env.local") });

const REPOS = [
  { owner: "alirezarezvani", repo: "claude-skills", stars: 524 },
  { owner: "alirezarezvani", repo: "claude-code-tresor", stars: 419 },
  { owner: "numman-ali", repo: "n-skills", stars: 447 },
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
  indexData: any,
  fullData: any,
  existingIds: Set<string>
): Promise<{ added: number; skipped: number; error: boolean }> {
  console.log(`\n📦 ${owner}/${repo}`);

  let addedCount = 0;
  let skippedCount = 0;

  try {
    const { data: repoData } = await octokit.repos.get({ owner, repo });

    const { data: searchResults } = await octokit.search.code({
      q: `filename:SKILL.md repo:${owner}/${repo}`,
      per_page: 100,
    });

    console.log(`   Found ${searchResults.total_count} SKILL.md files`);

    for (const item of searchResults.items) {
      const skillPath = item.path;
      const parts = skillPath.split("/");
      const skillName = parts.length > 2 ? parts[parts.length - 2] : parts[0].replace(".md", "");
      const skillId = `${owner}-${repo}-${skillName}`.toLowerCase();

      try {
        if (existingIds.has(skillId)) {
          skippedCount++;
          continue;
        }

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
        // Skip
      }
    }

    console.log(` ✅ +${addedCount}`);
    return { added: addedCount, skipped: skippedCount, error: false };

  } catch (error: any) {
    if (error.status === 403) {
      console.log(`   ⚠️  Rate limit exceeded`);
      return { added: addedCount, skipped: skippedCount, error: true };
    }
    console.log(`   ❌ Error: ${error.message}`);
    return { added: addedCount, skipped: skippedCount, error: true };
  }
}

async function addBatch7() {
  console.log(`🚀 Adding Batch 7: alirezarezvani & numman-ali\n`);

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const indexPath = resolve(process.cwd(), "data/skills/index.json");
  const fullPath = resolve(process.cwd(), "data/skills/skills-full.json");

  const indexData = JSON.parse(readFileSync(indexPath, "utf-8"));
  const fullData = JSON.parse(readFileSync(fullPath, "utf-8"));

  const existingIds = new Set(Object.keys(fullData));

  let totalAdded = 0;
  let totalSkipped = 0;
  let hitRateLimit = false;

  for (const { owner, repo } of REPOS) {
    const { added, skipped, error } = await addSkillsFromRepo(
      octokit,
      owner,
      repo,
      indexData,
      fullData,
      existingIds
    );
    totalAdded += added;
    totalSkipped += skipped;

    if (error) {
      hitRateLimit = true;
      break;
    }
  }

  indexData.totalSkills = indexData.skills.length;
  indexData.lastSync = new Date().toISOString();

  writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  writeFileSync(fullPath, JSON.stringify(fullData, null, 2));

  console.log(`\n\n✅ Batch 7 ${hitRateLimit ? 'Partial' : 'Complete'}!`);
  console.log(`➕ Added: ${totalAdded} new skills`);
  console.log(`⏭️  Skipped: ${totalSkipped} existing`);
  console.log(`📊 Total: ${indexData.totalSkills} skills`);

  if (hitRateLimit) {
    console.log(`\n⚠️  Hit rate limit - will need to continue later`);
  }
}

addBatch7();
