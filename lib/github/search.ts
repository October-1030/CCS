import { GitHubClient } from "./client";
import type { GitHubRepository } from "@/types/github";

/**
 * Search strategies for finding skills repositories
 */
const SEARCH_QUERIES = [
  // Direct SKILL.md searches
  'filename:SKILL.md',
  'path:.claude/skills filename:SKILL.md',
  'path:skills filename:SKILL.md',

  // Topic searches
  'topic:claude-skills',
  'topic:agent-skills',
  'topic:claude-code',
  'topic:anthropic',
  'topic:claude',
  'topic:claude-agent',
  'topic:mcp-server',

  // README content searches
  '"Claude Code" skill in:readme',
  '"agent skill" filename:SKILL.md',
  'claude skill in:readme',
  'anthropic skill in:readme',

  // Organization searches
  'org:anthropics',

  // Keyword searches
  'SKILL.md claude in:readme',
  'SKILL.md agent in:readme',
  '.claude skills in:path',
];

export interface SearchProgress {
  query: string;
  page: number;
  found: number;
  total: number;
}

export type ProgressCallback = (progress: SearchProgress) => void;

/**
 * GitHub Skills Crawler
 */
export class SkillsCrawler {
  private client: GitHubClient;

  constructor(client: GitHubClient) {
    this.client = client;
  }

  /**
   * Search for skills repositories across multiple queries
   */
  async searchAll(
    options: {
      maxPerQuery?: number;
      onProgress?: ProgressCallback;
    } = {}
  ): Promise<GitHubRepository[]> {
    const maxPerQuery = options.maxPerQuery || 1000; // GitHub API max
    const allRepos = new Map<number, GitHubRepository>();

    for (const query of SEARCH_QUERIES) {
      console.log(`\n🔍 Searching: ${query}`);

      const repos = await this.searchByQuery(query, {
        maxResults: maxPerQuery,
        onProgress: options.onProgress,
      });

      // Deduplicate by repository ID
      repos.forEach((repo) => {
        allRepos.set(repo.id, repo);
      });

      console.log(`   Found ${repos.length} repos (${allRepos.size} unique total)`);
    }

    return Array.from(allRepos.values());
  }

  /**
   * Search repositories by a single query
   */
  async searchByQuery(
    query: string,
    options: {
      maxResults?: number;
      onProgress?: ProgressCallback;
    } = {}
  ): Promise<GitHubRepository[]> {
    const maxResults = options.maxResults || 1000;
    const perPage = 100;
    const results: GitHubRepository[] = [];

    let page = 1;
    let hasMore = true;

    while (hasMore && results.length < maxResults) {
      try {
        const data = await this.client.searchRepos(query, {
          sort: "updated",
          order: "desc",
          perPage,
          page,
        });

        // Ensure topics is always an array
        const itemsWithTopics = data.items.map((item: any) => ({
          ...item,
          topics: item.topics || [],
        }));

        results.push(...itemsWithTopics);

        // Report progress
        if (options.onProgress) {
          options.onProgress({
            query,
            page,
            found: results.length,
            total: data.total_count,
          });
        }

        // Check if there are more results
        hasMore = data.items.length === perPage && results.length < maxResults;
        page++;

        // GitHub Search API only returns first 1000 results
        if (page > 10) {
          hasMore = false;
        }
      } catch (error: any) {
        console.error(`Error searching page ${page}:`, error.message);
        hasMore = false;
      }
    }

    return results;
  }

  /**
   * Search for recently updated skills
   */
  async searchRecent(since: Date, maxResults: number = 100): Promise<GitHubRepository[]> {
    const sinceStr = since.toISOString().split("T")[0];
    const query = `filename:SKILL.md pushed:>${sinceStr}`;

    return this.searchByQuery(query, { maxResults });
  }

  /**
   * Verify that a repository actually has SKILL.md
   */
  async verifySkillRepo(owner: string, repo: string): Promise<boolean> {
    try {
      const content = await this.client.findSkillMd(owner, repo);
      return content !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Filter repositories to only those with SKILL.md
   */
  async filterValidSkills(
    repos: GitHubRepository[],
    options: {
      batchSize?: number;
      onProgress?: (current: number, total: number) => void;
    } = {}
  ): Promise<GitHubRepository[]> {
    const batchSize = options.batchSize || 10;
    const validRepos: GitHubRepository[] = [];

    for (let i = 0; i < repos.length; i += batchSize) {
      const batch = repos.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(async (repo) => {
          if (!repo.owner) return null;
          const hasSkill = await this.verifySkillRepo(repo.owner.login, repo.name);
          return hasSkill ? repo : null;
        })
      );

      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value) {
          validRepos.push(result.value);
        }
      });

      if (options.onProgress) {
        options.onProgress(Math.min(i + batchSize, repos.length), repos.length);
      }
    }

    return validRepos;
  }

  /**
   * Get repository metadata with enriched data
   */
  async getRepoMetadata(owner: string, repo: string) {
    const repoData = await this.client.getRepo(owner, repo);

    return {
      id: repoData.id,
      name: repoData.name,
      fullName: repoData.full_name,
      owner: repoData.owner?.login || owner,
      description: repoData.description || "",
      url: repoData.html_url,
      homepage: repoData.homepage || undefined,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      language: repoData.language,
      topics: (repoData.topics as string[]) || [],
      createdAt: repoData.created_at,
      updatedAt: repoData.updated_at,
      pushedAt: repoData.pushed_at,
      defaultBranch: repoData.default_branch,
      license: repoData.license?.name,
    };
  }
}

/**
 * Create a skills crawler instance
 */
export function createSkillsCrawler(client: GitHubClient): SkillsCrawler {
  return new SkillsCrawler(client);
}
