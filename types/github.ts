/**
 * GitHub API response types
 */

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  } | null;
  html_url: string;
  description: string | null;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  default_branch: string;
  license: {
    key: string;
    name: string;
    spdx_id: string;
  } | null;
}

export interface GitHubSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepository[];
}

export interface GitHubContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: "file" | "dir";
  content?: string; // Base64 encoded
  encoding?: string;
}

export interface GitHubRateLimit {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}

export interface SearchOptions {
  query?: string;
  sort?: "stars" | "forks" | "updated";
  order?: "asc" | "desc";
  perPage?: number;
  page?: number;
  since?: string;
}
