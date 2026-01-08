import matter from "gray-matter";
import { inferCategory } from "@/lib/utils/categories";
import type { Skill } from "@/types/skill";

/**
 * Parse SKILL.md content
 */
export function parseSkillMd(content: string) {
  try {
    const { data, content: markdownContent } = matter(content);

    return {
      frontmatter: data as Record<string, any>,
      content: markdownContent.trim(),
      raw: content,
    };
  } catch (error) {
    console.error("Error parsing SKILL.md:", error);

    // Fallback: treat entire content as markdown
    return {
      frontmatter: {},
      content: content.trim(),
      raw: content,
    };
  }
}

/**
 * Extract tags from skill data
 */
export function extractTags(
  frontmatter: Record<string, any>,
  topics: string[],
  description: string
): string[] {
  const tags = new Set<string>();

  // From frontmatter
  if (frontmatter.tags) {
    const fmTags = Array.isArray(frontmatter.tags)
      ? frontmatter.tags
      : [frontmatter.tags];
    fmTags.forEach((tag) => tags.add(String(tag).toLowerCase()));
  }

  // From GitHub topics
  topics.forEach((topic) => tags.add(topic.toLowerCase()));

  // Extract keywords from description
  const keywords = extractKeywords(description);
  keywords.slice(0, 5).forEach((kw) => tags.add(kw)); // Limit to top 5

  return Array.from(tags).slice(0, 10); // Max 10 tags
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  if (!text) return [];

  // Simple keyword extraction (can be improved with NLP)
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3); // Filter short words

  // Count frequency
  const freq = new Map<string, number>();
  words.forEach((word) => {
    freq.set(word, (freq.get(word) || 0) + 1);
  });

  // Sort by frequency
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
}

/**
 * Generate skill ID from repository
 */
export function generateSkillId(owner: string, repo: string): string {
  return `${owner}-${repo}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

/**
 * Build complete Skill object from repository data
 */
export function buildSkill(
  repoData: {
    id: number;
    name: string;
    fullName: string;
    owner: string;
    description: string;
    url: string;
    homepage?: string;
    stars: number;
    forks: number;
    language: string | null;
    topics: string[];
    createdAt: string;
    updatedAt: string;
    pushedAt: string;
    defaultBranch: string;
    license?: string;
  },
  skillMdContent: string
): Skill {
  const parsed = parseSkillMd(skillMdContent);

  // Get name and description (prefer frontmatter, fallback to repo)
  const name = parsed.frontmatter.name || repoData.name;
  const description = parsed.frontmatter.description || repoData.description || "No description";

  // Infer category
  const category = parsed.frontmatter.category ||
    inferCategory(name, description, repoData.topics);

  // Extract tags
  const tags = extractTags(parsed.frontmatter, repoData.topics, description);

  // Generate ID
  const id = generateSkillId(repoData.owner, repoData.name);

  return {
    id,
    name,
    description,
    repo: {
      owner: repoData.owner,
      name: repoData.name,
      fullName: repoData.fullName,
      url: repoData.url,
      homepage: repoData.homepage,
      defaultBranch: repoData.defaultBranch,
    },
    metadata: {
      stars: repoData.stars,
      forks: repoData.forks,
      language: repoData.language,
      topics: repoData.topics,
      createdAt: repoData.createdAt,
      updatedAt: repoData.updatedAt,
      pushedAt: repoData.pushedAt,
      license: repoData.license,
    },
    category,
    tags,
    skillMd: {
      raw: parsed.raw,
      frontmatter: parsed.frontmatter,
      content: parsed.content,
    },
    marketplace: {
      hasMarketplaceJson: false, // TODO: Check for marketplace.json
    },
    internal: {
      syncedAt: new Date().toISOString(),
      version: 1,
    },
  };
}

/**
 * Convert Skill to SkillIndex (lightweight version)
 */
export function skillToIndex(skill: Skill) {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    category: skill.category,
    tags: skill.tags,
    stars: skill.metadata.stars,
    updatedAt: skill.metadata.updatedAt,
    repoUrl: skill.repo.url,
  };
}
