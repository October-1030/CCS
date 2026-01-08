#!/usr/bin/env node
/**
 * Explore jeremylongshore/claude-code-plugins-plus-skills categories
 */

import { config } from "dotenv";
import { resolve } from "path";
import { Octokit } from "@octokit/rest";

config({ path: resolve(process.cwd(), ".env.local") });

const OWNER = "jeremylongshore";
const REPO = "claude-code-plugins-plus-skills";
const BASE_PATH = "skills";

async function exploreCategories() {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  console.log(`📂 Exploring ${OWNER}/${REPO}...\n`);

  try {
    const { data } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: BASE_PATH,
    });

    if (Array.isArray(data)) {
      const categories = data.filter(item => item.type === "dir");

      console.log(`Found ${categories.length} categories:\n`);

      for (const cat of categories) {
        // Get skills count in each category
        const { data: skills } = await octokit.repos.getContent({
          owner: OWNER,
          repo: REPO,
          path: cat.path,
        });

        const skillCount = Array.isArray(skills)
          ? skills.filter(s => s.type === "dir").length
          : 0;

        console.log(`${cat.name.padEnd(35)} ${skillCount} skills`);

        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

exploreCategories();
