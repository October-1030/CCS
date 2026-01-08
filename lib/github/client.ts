import { Octokit } from "@octokit/rest";
import type { GitHubRateLimit } from "@/types/github";

/**
 * GitHub API Client wrapper
 */
export class GitHubClient {
  private octokit: Octokit;
  private delay: number;

  constructor(token?: string, delay: number = 2000) {
    this.octokit = new Octokit({
      auth: token || process.env.GITHUB_TOKEN,
    });
    this.delay = delay;
  }

  /**
   * Get rate limit status
   */
  async getRateLimit(): Promise<GitHubRateLimit> {
    const { data } = await this.octokit.rateLimit.get();
    return {
      limit: data.rate.limit,
      remaining: data.rate.remaining,
      reset: data.rate.reset,
      used: data.rate.used,
    };
  }

  /**
   * Search repositories
   */
  async searchRepos(query: string, options: {
    sort?: "stars" | "forks" | "updated";
    order?: "asc" | "desc";
    perPage?: number;
    page?: number;
  } = {}) {
    await this.respectRateLimit();

    const { data } = await this.octokit.search.repos({
      q: query,
      sort: options.sort,
      order: options.order,
      per_page: options.perPage || 100,
      page: options.page || 1,
    });

    return data;
  }

  /**
   * Get repository details
   */
  async getRepo(owner: string, repo: string) {
    await this.respectRateLimit();

    const { data } = await this.octokit.repos.get({
      owner,
      repo,
    });

    return data;
  }

  /**
   * Get file content from repository
   */
  async getContent(owner: string, repo: string, path: string) {
    await this.respectRateLimit();

    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
      });

      // Ensure it's a file, not a directory
      if (!Array.isArray(data) && data.type === "file" && data.content) {
        return Buffer.from(data.content, "base64").toString("utf-8");
      }

      throw new Error("Path is not a file or content is missing");
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Check if file exists in repository
   */
  async fileExists(owner: string, repo: string, path: string): Promise<boolean> {
    try {
      await this.octokit.repos.getContent({
        owner,
        repo,
        path,
      });
      return true;
    } catch (error: any) {
      if (error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Find SKILL.md in repository (check multiple possible paths)
   */
  async findSkillMd(owner: string, repo: string): Promise<string | null> {
    const possiblePaths = [
      "SKILL.md",
      "skill.md",
      "skills/SKILL.md",
      ".claude/skills/SKILL.md",
      "skill/SKILL.md",
    ];

    for (const path of possiblePaths) {
      const content = await this.getContent(owner, repo, path);
      if (content) {
        return content;
      }
    }

    return null;
  }

  /**
   * Respect rate limit - wait if necessary
   */
  private async respectRateLimit() {
    const rateLimit = await this.getRateLimit();

    if (rateLimit.remaining < 10) {
      const resetTime = rateLimit.reset * 1000;
      const waitTime = resetTime - Date.now();

      if (waitTime > 0) {
        console.log(`⏳ Rate limit low. Waiting ${Math.ceil(waitTime / 1000)}s...`);
        await this.sleep(waitTime);
      }
    }

    // Always add a small delay between requests
    await this.sleep(this.delay);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get raw Octokit instance for advanced usage
   */
  getRawClient(): Octokit {
    return this.octokit;
  }
}

/**
 * Create a default GitHub client instance
 */
export function createGitHubClient(token?: string): GitHubClient {
  return new GitHubClient(token);
}
