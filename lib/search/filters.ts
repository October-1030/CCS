/**
 * Filtering and sorting utilities for skills
 */

import type { SkillIndex, SearchResult } from "@/types/skill";
import type { FilterOptions } from "@/types/search";

/**
 * Apply filters to skill results
 */
export function applyFilters(
  skills: SkillIndex[],
  filters: FilterOptions
): SkillIndex[] {
  let filtered = [...skills];

  // Category filter
  if (filters.categories && filters.categories.length > 0) {
    filtered = filtered.filter((skill) =>
      filters.categories!.includes(skill.category)
    );
  }

  // Tags filter
  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter((skill) =>
      filters.tags!.some((tag) => skill.tags.includes(tag))
    );
  }

  // Minimum stars filter
  if (filters.minStars !== undefined) {
    filtered = filtered.filter((skill) => skill.stars >= filters.minStars!);
  }

  // Updated after filter
  if (filters.updatedAfter) {
    const afterDate = filters.updatedAfter.getTime();
    filtered = filtered.filter(
      (skill) => new Date(skill.updatedAt).getTime() >= afterDate
    );
  }

  // Languages filter
  // Note: Language info not in SkillIndex, would need to be added

  return filtered;
}

/**
 * Apply filters to search results
 */
export function applyFiltersToResults(
  results: SearchResult[],
  filters: FilterOptions
): SearchResult[] {
  const filteredSkills = applyFilters(
    results.map((r) => r.skill),
    filters
  );

  const filteredIds = new Set(filteredSkills.map((s) => s.id));

  return results.filter((result) => filteredIds.has(result.skill.id));
}

/**
 * Sort skills
 */
export function sortSkills(
  skills: SkillIndex[],
  sortBy: FilterOptions["sortBy"] = "relevance",
  order: FilterOptions["sortOrder"] = "desc"
): SkillIndex[] {
  const sorted = [...skills].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "stars":
        comparison = a.stars - b.stars;
        break;
      case "updated":
        comparison =
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
      case "created":
        // Note: createdAt not in SkillIndex, would use updatedAt as proxy
        comparison =
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
      case "relevance":
      default:
        // For relevance, maintain original order (from search)
        return 0;
    }

    return order === "asc" ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Sort search results
 */
export function sortSearchResults(
  results: SearchResult[],
  sortBy: FilterOptions["sortBy"] = "relevance",
  order: FilterOptions["sortOrder"] = "desc"
): SearchResult[] {
  if (sortBy === "relevance") {
    // Already sorted by score
    return order === "desc" ? results : [...results].reverse();
  }

  const sorted = [...results].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "stars":
        comparison = a.skill.stars - b.skill.stars;
        break;
      case "updated":
        comparison =
          new Date(a.skill.updatedAt).getTime() -
          new Date(b.skill.updatedAt).getTime();
        break;
      case "created":
        comparison =
          new Date(a.skill.updatedAt).getTime() -
          new Date(b.skill.updatedAt).getTime();
        break;
    }

    return order === "asc" ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Paginate results
 */
export function paginate<T>(
  items: T[],
  page: number,
  limit: number
): {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
} {
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const end = start + limit;

  return {
    data: items.slice(start, end),
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
