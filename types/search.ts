/**
 * Search and filter types
 */

import { SkillIndex, SearchResult } from "./skill";

export interface FilterOptions {
  categories?: string[];
  tags?: string[];
  minStars?: number;
  hasMarketplaceJson?: boolean;
  languages?: string[];
  updatedAfter?: Date;
  sortBy?: "relevance" | "stars" | "updated" | "created";
  sortOrder?: "asc" | "desc";
}

export interface SearchOptions {
  query: string;
  filters?: FilterOptions;
  limit?: number;
  offset?: number;
  useAI?: boolean;
}

export interface SearchEngineResult {
  results: SearchResult[];
  total: number;
  hasMore: boolean;
  query: string;
  filters?: FilterOptions;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
