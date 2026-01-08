/**
 * Main search engine that combines keyword search and filters
 */

import { KeywordSearch } from "./keyword-search";
import { applyFiltersToResults, sortSearchResults, paginate } from "./filters";
import type { SkillIndex, SearchResult } from "@/types/skill";
import type { SearchOptions, SearchEngineResult, FilterOptions } from "@/types/search";

/**
 * Unified search engine
 */
export class SkillSearchEngine {
  private keywordSearch: KeywordSearch;
  private allSkills: SkillIndex[];

  constructor(skills: SkillIndex[]) {
    this.allSkills = skills;
    this.keywordSearch = new KeywordSearch(skills);
  }

  /**
   * Search with query and filters
   */
  search(options: SearchOptions): SearchEngineResult {
    const {
      query,
      filters = {},
      limit = 50,
      offset = 0,
    } = options;

    // If no query, return all skills with filters
    let results: SearchResult[];
    if (!query || query.trim().length === 0) {
      results = this.allSkills.map((skill) => ({
        skill,
        score: 1,
        matchedFields: [],
      }));
    } else {
      // Perform keyword search
      results = this.keywordSearch.search(query, this.allSkills.length);
    }

    // Apply filters
    if (filters && Object.keys(filters).length > 0) {
      results = applyFiltersToResults(results, filters);
    }

    // Sort results
    if (filters.sortBy) {
      results = sortSearchResults(results, filters.sortBy, filters.sortOrder);
    }

    // Pagination
    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      results: paginatedResults,
      total,
      hasMore: offset + limit < total,
      query,
      filters,
    };
  }

  /**
   * Get all skills without search
   */
  getAll(filters?: FilterOptions, page: number = 1, limit: number = 50) {
    return this.search({
      query: "",
      filters,
      limit,
      offset: (page - 1) * limit,
    });
  }

  /**
   * Update skills data (for re-indexing)
   */
  updateSkills(skills: SkillIndex[]) {
    this.allSkills = skills;
    this.keywordSearch = new KeywordSearch(skills);
  }
}

/**
 * Create a search engine instance
 */
export function createSearchEngine(skills: SkillIndex[]): SkillSearchEngine {
  return new SkillSearchEngine(skills);
}
