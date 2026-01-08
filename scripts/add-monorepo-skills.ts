#!/usr/bin/env node
/**
 * Add skills from a monorepo (multiple skills in one repository)
 * Specifically designed for alirezarezvani/claude-skills
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Octokit } from "@octokit/rest";
import { writeFileSync, readFileSync } from "fs";
import matter from "gray-matter";

config({ path: resolve(process.cwd(), ".env.local") });

const OWNER = "alirezarezvani";
const REPO = "claude-skills";

const SKILLS_PATHS = [
  // Marketing
  "marketing-skill/content-creator",
  "marketing-skill/marketing-demand-acquisition",
  "marketing-skill/marketing-strategy-pmm",
  "marketing-skill/app-store-optimization",
  "marketing-skill/social-media-analyzer",

  // C-Level
  "c-level-advisor/ceo-advisor",
  "c-level-advisor/cto-advisor",

  // Product
  "product-team/product-manager-toolkit",
  "product-team/agile-product-owner",
  "product-team/product-strategist",
  "product-team/ux-researcher-designer",
  "product-team/ui-design-system",

  // Project Management
  "project-management/senior-project-management-expert",
  "project-management/scrum-master-expert",
  "project-management/atlassian-jira-expert",
  "project-management/atlassian-confluence-expert",
  "project-management/atlassian-administrator",
  "project-management/atlassian-template-creator-expert",

  // Engineering
  "engineering-team/senior-software-architect",
  "engineering-team/senior-frontend-engineer",
  "engineering-team/senior-backend-engineer",
  "engineering-team/senior-fullstack-engineer",
  "engineering-team/senior-qa-testing-engineer",
  "engineering-team/senior-devops-engineer",
  "engineering-team/senior-secops-engineer",
  "engineering-team/code-reviewer",
  "engineering-team/senior-security-engineer",
  "engineering-team/aws-solution-architect",
  "engineering-team/ms365-tenant-manager",
  "engineering-team/tdd-guide",
  "engineering-team/tech-stack-evaluator",
  "engineering-team/senior-data-scientist",
  "engineering-team/senior-data-engineer",
  "engineering-team/senior-ml-ai-engineer",
  "engineering-team/senior-prompt-engineer",
  "engineering-team/senior-computer-vision-engineer",

  // Regulatory & Quality
  "ra-qm-team/senior-regulatory-affairs-manager",
  "ra-qm-team/senior-quality-manager-responsible-person",
  "ra-qm-team/senior-quality-manager-iso-13485",
  "ra-qm-team/senior-capa-officer",
  "ra-qm-team/senior-quality-documentation-manager",
  "ra-qm-team/senior-risk-management-specialist",
  "ra-qm-team/senior-information-security-manager",
  "ra-qm-team/senior-mdr-2017-745-specialist",
  "ra-qm-team/senior-fda-consultant",
  "ra-qm-team/senior-qms-audit-expert",
  "ra-qm-team/senior-isms-audit-expert",
  "ra-qm-team/senior-gdpr-dsgvo-expert",
];

function inferCategory(path: string, tags: string[]): string {
  if (path.includes('marketing')) return 'marketing';
  if (path.includes('c-level')) return 'business';
  if (path.includes('product')) return 'product';
  if (path.includes('project-management')) return 'project-management';
  if (path.includes('engineering')) return 'development';
  if (path.includes('ra-qm')) return 'compliance';

  const allKeywords = tags.map(t => t.toLowerCase());
  if (allKeywords.some(k => ['ai', 'ml', 'data'].includes(k))) return 'data-ai';
  if (allKeywords.some(k => ['dev', 'code'].includes(k))) return 'development';

  return 'tools';
}

async function addMonorepoSkills() {
  console.log(`🚀 Adding ${SKILLS_PATHS.length} skills from ${OWNER}/${REPO}...\n`);

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const indexPath = resolve(process.cwd(), "data/skills/index.json");
  const fullPath = resolve(process.cwd(), "data/skills/skills-full.json");

  const indexData = JSON.parse(readFileSync(indexPath, "utf-8"));
  const fullData = JSON.parse(readFileSync(fullPath, "utf-8"));

  const existingIds = new Set(Object.keys(fullData));

  // Get repo metadata once
  const { data: repoData } = await octokit.repos.get({ owner: OWNER, repo: REPO });

  let addedCount = 0;
  let skippedCount = 0;

  for (const skillPath of SKILLS_PATHS) {
    const skillName = skillPath.split('/').pop()!;
    const skillId = `${OWNER}-${REPO}-${skillName}`.toLowerCase();

    try {
      if (existingIds.has(skillId)) {
        console.log(`⏭️  ${skillName}`);
        skippedCount++;
        continue;
      }

      console.log(`📥 ${skillName}...`);

      // Get SKILL.md from the path
      const { data: fileData } = await octokit.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path: `${skillPath}/SKILL.md`,
      });

      if (!("content" in fileData)) {
        console.log(`   ⚠️  No content`);
        continue;
      }

      const content = Buffer.from(fileData.content, "base64").toString("utf-8");
      const { data: frontmatter, content: markdown } = matter(content);

      const tags = frontmatter.tags || [];
      const category = inferCategory(skillPath, tags);

      const skill = {
        id: skillId,
        name: frontmatter.name || skillName,
        description: frontmatter.description || "",
        repo: {
          owner: OWNER,
          name: REPO,
          fullName: `${OWNER}/${REPO}`,
          url: `https://github.com/${OWNER}/${REPO}/tree/main/${skillPath}`,
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

      // Rate limiting - be gentle
      await new Promise(resolve => setTimeout(resolve, 1000));

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

addMonorepoSkills();
