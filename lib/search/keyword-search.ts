/**
 * Keyword-based search using Fuse.js (MVP implementation)
 */

import Fuse from "fuse.js";
import type { SkillIndex, SearchResult } from "@/types/skill";

export interface FuseSearchOptions {
  threshold?: number;
  minMatchCharLength?: number;
  keys?: Array<{ name: string; weight: number }>;
}

/**
 * Keyword search engine using Fuse.js
 */
export class KeywordSearch {
  private fuse: Fuse<SkillIndex>;

  constructor(skills: SkillIndex[], options: FuseSearchOptions = {}) {
    this.fuse = new Fuse(skills, {
      keys: options.keys || [
        { name: "name", weight: 2 },
        { name: "description", weight: 1.5 },
        { name: "tags", weight: 1 },
        { name: "category", weight: 0.5 },
      ],
      threshold: options.threshold || 0.4,
      minMatchCharLength: options.minMatchCharLength || 2,
      includeScore: true,
      includeMatches: true,
      useExtendedSearch: true,
    });
  }

  /**
   * Search for skills
   */
  search(query: string, limit: number = 50): SearchResult[] {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const results = this.fuse.search(query, { limit });

    return results.map((result) => ({
      skill: result.item,
      score: 1 - (result.score || 0), // Convert to 0-1 score (higher is better)
      matchedFields: this.getMatchedFields(result),
    }));
  }

  /**
   * Get matched fields from Fuse result
   */
  private getMatchedFields(result: any): string[] {
    if (!result.matches) return [];

    return result.matches
      .map((match: any) => match.key || "")
      .filter((key: string) => key.length > 0);
  }

  /**
   * Search with extended syntax
   * Examples:
   *   - "pdf" - fuzzy match
   *   - "'exact" - exact match (prefix with ')
   *   - "^start" - starts with
   *   - "end$" - ends with
   */
  searchExtended(query: string, limit: number = 50): SearchResult[] {
    return this.search(query, limit);
  }
}

/**
 * Create a keyword search instance
 */
export function createKeywordSearch(
  skills: SkillIndex[],
  options?: FuseSearchOptions
): KeywordSearch {
  return new KeywordSearch(skills, options);
}
