#!/usr/bin/env node
/**
 * Push to 3000 skills - ultra-comprehensive search
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Octokit } from "@octokit/rest";
import { writeFileSync, readFileSync } from "fs";
import matter from "gray-matter";

config({ path: resolve(process.cwd(), ".env.local") });

function inferCategory(path: string, name: string, description: string): string {
  const text = `${path} ${name} ${description}`.toLowerCase();
  if (text.includes("frontend") || text.includes("ui") || text.includes("design") || text.includes("react")) return "frontend-development";
  if (text.includes("backend") || text.includes("api") || text.includes("server") || text.includes("database")) return "backend-development";
  if (text.includes("test") || text.includes("qa")) return "testing-quality";
  if (text.includes("devops") || text.includes("deploy") || text.includes("infrastructure")) return "devops-infrastructure";
  if (text.includes("ai") || text.includes("ml") || text.includes("data") || text.includes("research")) return "ai-data-science";
  if (text.includes("security") || text.includes("blockchain")) return "specialized";
  if (text.includes("business") || text.includes("marketing")) return "business-marketing";
  return "tools-productivity";
}

async function ultraSearch(octokit: Octokit): Promise<string[]> {
  console.log("🔍 Ultra-comprehensive search across GitHub...\n");

  const queries = [
    // Core SKILL.md searches
    'filename:SKILL.md',
    'filename:SKILL.md stars:>0',
    'filename:skill.md',

    // Path-based searches
    'path:.claude/skills',
    'path:.codex/skills',
    'path:skills filename:SKILL.md',
    'path:.config/claude',
    'path:claude-skills',

    // Topic searches
    'topic:claude-skills',
    'topic:claude-code',
    'topic:agent-skills',
    'topic:claude',
    'topic:ai-agents',
    'topic:llm-agents',

    // In-readme searches
    '"SKILL.md" in:readme',
    'claude agent in:readme',
    'codex skill in:readme',
    '"claude code" in:readme',
    'agent skill in:readme',

    // Keyword searches
    '"claude skill"',
    '"agent skill"',
    'claude AND skill AND md',

    // Date-based searches for recent repos
    'filename:SKILL.md pushed:>2024-01-01',
    'filename:SKILL.md created:>2024-01-01',

    // Size/activity based
    'filename:SKILL.md stars:>1',
    'filename:SKILL.md forks:>0',
    'filename:SKILL.md pushed:>2023-01-01',
  ];

  const foundRepos = new Set<string>();

  for (const query of queries) {
    try {
      console.log(`   🔎 "${query}"`);
      const { data } = await octokit.search.repos({
        q: query,
        sort: "updated",
        order: "desc",
        per_page: 100,
      });

      data.items.forEach((repo) => foundRepos.add(repo.full_name));
      console.log(`      Found ${data.items.length} repos (total unique: ${foundRepos.size})`);

      await new Promise(resolve => setTimeout(resolve, 2200));
    } catch (error: any) {
      if (error.status === 403) {
        console.log(`      ⏸️  Rate limit - waiting 90s`);
        await new Promise(resolve => setTimeout(resolve, 90000));
      } else {
        console.log(`      ⚠️  Failed`);
      }
    }
  }

  return Array.from(foundRepos);
}

async function addSkillsFromRepo(
  octokit: Octokit,
  owner: string,
  repo: string,
  indexData: any,
  fullData: any,
  existingIds: Set<string>
): Promise<number> {
  let addedCount = 0;

  try {
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const { data: searchResults } = await octokit.search.code({
      q: `filename:SKILL.md repo:${owner}/${repo}`,
      per_page: 100,
    });

    if (searchResults.total_count === 0) return 0;

    for (const item of searchResults.items) {
      const skillPath = item.path;
      const parts = skillPath.split("/");
      const skillName = parts.length > 2 ? parts[parts.length - 2] : parts[0].replace(".md", "");
      const skillId = `${owner}-${repo}-${skillName}`.toLowerCase();

      if (existingIds.has(skillId)) continue;

      try {
        const { data: fileData } = await octokit.repos.getContent({ owner, repo, path: skillPath });
        if (!("content" in fileData)) continue;

        const content = Buffer.from(fileData.content, "base64").toString("utf-8");
        const { data: frontmatter, content: markdown } = matter(content);

        const skill = {
          id: skillId,
          name: frontmatter.name || skillName,
          description: frontmatter.description || "",
          repo: {
            owner, name: repo, fullName: `${owner}/${repo}`,
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
          category: inferCategory(skillPath, frontmatter.name || skillName, frontmatter.description || ""),
          tags: frontmatter.tags || [],
          skillMd: { raw: content, frontmatter, content: markdown },
        };

        indexData.skills.push({
          id: skill.id, name: skill.name, description: skill.description,
          category: skill.category, tags: skill.tags, stars: skill.metadata.stars,
          updatedAt: skill.metadata.updatedAt, repoUrl: skill.repo.url,
        });

        fullData[skill.id] = skill;
        existingIds.add(skillId);
        addedCount++;

        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        // Skip
      }
    }

    if (addedCount > 0) {
      console.log(`   ✅ ${owner}/${repo} +${addedCount} (⭐${repoData.stargazers_count})`);
    }
  } catch (error: any) {
    if (error.status === 403) {
      console.log(`   ⏸️  Rate limit - pausing 90s`);
      await new Promise(resolve => setTimeout(resolve, 90000));
    }
  }

  return addedCount;
}

async function pushTo3000() {
  console.log(`🎯 Target: 3000 SKILLS!\n`);

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const indexPath = resolve(process.cwd(), "data/skills/index.json");
  const fullPath = resolve(process.cwd(), "data/skills/skills-full.json");

  const indexData = JSON.parse(readFileSync(indexPath, "utf-8"));
  const fullData = JSON.parse(readFileSync(fullPath, "utf-8"));
  const existingIds = new Set(Object.keys(fullData));

  const startCount = indexData.totalSkills;
  console.log(`📊 Starting: ${startCount} skills`);
  console.log(`📈 Target: 3000 skills (need ${3000 - startCount} more)\n`);

  const repos = await ultraSearch(octokit);
  console.log(`\n✅ Found ${repos.length} total repositories\n`);

  let totalAdded = 0;
  let processedCount = 0;

  for (const fullName of repos) {
    const [owner, repo] = fullName.split("/");
    const repoKey = `${owner}-${repo}`;

    // Skip if already have skills from this repo
    if (indexData.skills.some((s: any) => s.id.startsWith(repoKey))) {
      continue;
    }

    const added = await addSkillsFromRepo(octokit, owner, repo, indexData, fullData, existingIds);
    if (added > 0) {
      totalAdded += added;
      processedCount++;

      if (startCount + totalAdded >= 3000) {
        console.log(`\n🎉🎉🎉 REACHED 3000 SKILLS! 🎉🎉🎉`);
        break;
      }

      if (processedCount % 20 === 0) {
        const current = startCount + totalAdded;
        const percent = ((current / 3000) * 100).toFixed(1);
        console.log(`\n--- ${current}/3000 (${percent}%) | ${processedCount} repos ---\n`);
      }
    }
  }

  indexData.totalSkills = indexData.skills.length;
  indexData.lastSync = new Date().toISOString();

  writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  writeFileSync(fullPath, JSON.stringify(fullData, null, 2));

  console.log(`\n✅ COLLECTION COMPLETE!`);
  console.log(`➕ Added: ${totalAdded} skills from ${processedCount} repos`);
  console.log(`📊 Final Total: ${indexData.totalSkills} skills`);
  console.log(`🏆 Growth: ${((indexData.totalSkills / 205) * 100).toFixed(0)}% from initial 205!`);
}

pushTo3000();
