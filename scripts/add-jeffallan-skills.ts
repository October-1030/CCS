#!/usr/bin/env node
/**
 * Add skills from Jeffallan/claude-skills
 * 64 specialized skills with progressive disclosure architecture
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Octokit } from "@octokit/rest";
import { writeFileSync, readFileSync } from "fs";
import matter from "gray-matter";

config({ path: resolve(process.cwd(), ".env.local") });

const OWNER = "Jeffallan";
const REPO = "claude-skills";
const BASE_PATH = "skills";

const SKILLS_PATHS = [
  "angular-architect", "api-designer", "architecture-designer", "atlassian-mcp",
  "chaos-engineer", "cli-developer", "cloud-architect", "code-documenter",
  "code-reviewer", "cpp-pro", "csharp-developer", "database-optimizer",
  "debugging-wizard", "devops-engineer", "django-expert", "dotnet-core-expert",
  "embedded-systems", "fastapi-expert", "feature-forge", "fine-tuning-expert",
  "flutter-expert", "fullstack-guardian", "game-developer", "golang-pro",
  "graphql-architect", "java-architect", "javascript-pro", "kotlin-specialist",
  "kubernetes-specialist", "laravel-specialist", "legacy-modernizer", "mcp-developer",
  "microservices-architect", "ml-pipeline", "monitoring-expert", "nestjs-expert",
  "nextjs-developer", "pandas-pro", "php-pro", "playwright-expert",
  "postgres-pro", "prompt-engineer", "python-pro", "rag-architect",
  "rails-expert", "react-expert", "react-native-expert", "rust-engineer",
  "salesforce-developer", "secure-code-guardian", "security-reviewer", "shopify-expert",
  "spark-engineer", "spec-miner", "spring-boot-engineer", "sql-pro",
  "sre-engineer", "swift-expert", "terraform-engineer", "test-master",
  "typescript-pro", "vue-expert", "websocket-engineer", "wordpress-pro",
];

function inferCategory(name: string, tags: string[]): string {
  const nameLower = name.toLowerCase();

  // Languages
  if (nameLower.match(/(python|java|go|rust|cpp|csharp|php|swift|kotlin)/)) return 'programming-languages';

  // Frontend
  if (nameLower.match(/(react|vue|angular|nextjs)/)) return 'frontend';

  // Backend
  if (nameLower.match(/(django|fastapi|nestjs|rails|laravel|spring)/)) return 'backend';

  // Mobile
  if (nameLower.match(/(flutter|react-native)/)) return 'mobile';

  // Infrastructure
  if (nameLower.match(/(devops|kubernetes|terraform|cloud|sre)/)) return 'infrastructure';

  // Data & ML
  if (nameLower.match(/(ml|pandas|spark|rag|fine-tuning)/)) return 'data-ml';

  // Architecture
  if (nameLower.match(/(architect|microservices|graphql|api-designer)/)) return 'architecture';

  // Security
  if (nameLower.match(/(security|secure)/)) return 'security';

  // Testing
  if (nameLower.match(/(test|playwright)/)) return 'testing';

  // Specialized
  if (nameLower.match(/(wordpress|shopify|salesforce|atlassian|game)/)) return 'specialized';

  return 'development';
}

async function addJeffallanSkills() {
  console.log(`🚀 Adding ${SKILLS_PATHS.length} skills from ${OWNER}/${REPO}...\n`);

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const indexPath = resolve(process.cwd(), "data/skills/index.json");
  const fullPath = resolve(process.cwd(), "data/skills/skills-full.json");

  const indexData = JSON.parse(readFileSync(indexPath, "utf-8"));
  const fullData = JSON.parse(readFileSync(fullPath, "utf-8"));

  const existingIds = new Set(Object.keys(fullData));

  const { data: repoData } = await octokit.repos.get({ owner: OWNER, repo: REPO });

  let addedCount = 0;
  let skippedCount = 0;

  for (const skillPath of SKILLS_PATHS) {
    const skillName = skillPath;
    const skillId = `${OWNER.toLowerCase()}-${REPO}-${skillName}`;

    try {
      if (existingIds.has(skillId)) {
        console.log(`⏭️  ${skillName}`);
        skippedCount++;
        continue;
      }

      console.log(`📥 ${skillName}...`);

      const { data: fileData } = await octokit.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path: `${BASE_PATH}/${skillPath}/SKILL.md`,
      });

      if (!("content" in fileData)) {
        console.log(`   ⚠️  No content`);
        continue;
      }

      const content = Buffer.from(fileData.content, "base64").toString("utf-8");
      const { data: frontmatter, content: markdown } = matter(content);

      const tags = frontmatter.tags || [];
      const category = inferCategory(skillName, tags);

      const skill = {
        id: skillId,
        name: frontmatter.name || skillName,
        description: frontmatter.description || "",
        repo: {
          owner: OWNER,
          name: REPO,
          fullName: `${OWNER}/${REPO}`,
          url: `https://github.com/${OWNER}/${REPO}/tree/main/${BASE_PATH}/${skillPath}`,
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

      addedCount++;
      console.log(`   ✅`);

      await new Promise(resolve => setTimeout(resolve, 800));

    } catch (error: any) {
      console.log(`   ❌ ${error.message}`);
    }
  }

  indexData.totalSkills = indexData.skills.length;
  indexData.lastSync = new Date().toISOString();

  writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  writeFileSync(fullPath, JSON.stringify(fullData, null, 2));

  console.log(`\n✅ Added ${addedCount} new skills!`);
  console.log(`⏭️  Skipped ${skippedCount} existing`);
  console.log(`📊 Total: ${indexData.totalSkills} skills`);
}

addJeffallanSkills();
