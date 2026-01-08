/**
 * Core Skill data structure
 */
export interface Skill {
  // Basic information
  id: string;
  name: string;
  description: string;

  // GitHub repository information
  repo: {
    owner: string;
    name: string;
    fullName: string; // owner/name
    url: string;
    homepage?: string;
    defaultBranch: string;
  };

  // Metadata from GitHub
  metadata: {
    stars: number;
    forks: number;
    language: string | null;
    topics: string[];
    createdAt: string;
    updatedAt: string;
    pushedAt: string;
    license?: string;
  };

  // Classification
  category: string;
  tags: string[];

  // SKILL.md content
  skillMd: {
    raw: string;
    frontmatter: Record<string, any>;
    content: string;
  };

  // Marketplace configuration (optional)
  marketplace?: {
    hasMarketplaceJson: boolean;
    installCommand?: string;
    resources?: string[];
  };

  // Internal fields
  internal: {
    syncedAt: string;
    version: number;
  };
}

/**
 * Lightweight skill index for list display
 */
export interface SkillIndex {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  stars: number;
  updatedAt: string;
  repoUrl: string;
}

/**
 * Search result with scoring
 */
export interface SearchResult {
  skill: SkillIndex;
  score: number;
  matchedFields: string[];
}

/**
 * Category configuration
 */
export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  keywords: string[];
}

/**
 * Statistics data
 */
export interface StatsData {
  totalSkills: number;
  byCategory: Record<string, number>;
  topTags: Array<{ tag: string; count: number }>;
  recentlyUpdated: string[];
  lastSyncTime: string;
}

/**
 * Skills index file structure
 */
export interface SkillsIndex {
  version: string;
  lastSync: string;
  totalSkills: number;
  skills: SkillIndex[];
}
