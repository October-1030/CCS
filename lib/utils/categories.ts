import { Category } from "@/types/skill";

/**
 * Predefined categories for skills
 */
export const CATEGORIES: Category[] = [
  {
    id: "tools",
    name: "Tools",
    description: "General productivity and utility skills",
    icon: "🛠️",
    color: "blue",
    keywords: ["tool", "utility", "helper", "productivity"],
  },
  {
    id: "development",
    name: "Development",
    description: "Software development and coding skills",
    icon: "💻",
    color: "green",
    keywords: ["code", "dev", "programming", "software", "development"],
  },
  {
    id: "data-ai",
    name: "Data & AI",
    description: "Data science, machine learning, and AI tools",
    icon: "🤖",
    color: "purple",
    keywords: ["ai", "ml", "data", "machine learning", "analytics"],
  },
  {
    id: "devops",
    name: "DevOps",
    description: "Infrastructure, deployment, and operations",
    icon: "🚀",
    color: "orange",
    keywords: ["devops", "deployment", "infrastructure", "ci", "cd", "docker", "kubernetes"],
  },
  {
    id: "web",
    name: "Web",
    description: "Web development and frontend tools",
    icon: "🌐",
    color: "cyan",
    keywords: ["web", "frontend", "backend", "fullstack", "html", "css", "javascript"],
  },
  {
    id: "mobile",
    name: "Mobile",
    description: "Mobile app development",
    icon: "📱",
    color: "pink",
    keywords: ["mobile", "ios", "android", "react native", "flutter"],
  },
  {
    id: "testing",
    name: "Testing",
    description: "Testing and quality assurance",
    icon: "🧪",
    color: "yellow",
    keywords: ["test", "testing", "qa", "quality", "unit", "integration"],
  },
  {
    id: "documentation",
    name: "Documentation",
    description: "Documentation and technical writing",
    icon: "📝",
    color: "gray",
    keywords: ["docs", "documentation", "writing", "readme", "guide"],
  },
  {
    id: "security",
    name: "Security",
    description: "Security and vulnerability analysis",
    icon: "🔒",
    color: "red",
    keywords: ["security", "vulnerability", "audit", "scan", "penetration"],
  },
  {
    id: "database",
    name: "Database",
    description: "Database design and management",
    icon: "🗄️",
    color: "indigo",
    keywords: ["database", "sql", "nosql", "query", "schema"],
  },
  {
    id: "api",
    name: "API",
    description: "API design and integration",
    icon: "🔌",
    color: "teal",
    keywords: ["api", "rest", "graphql", "integration", "endpoint"],
  },
  {
    id: "automation",
    name: "Automation",
    description: "Workflow automation and scripting",
    icon: "⚙️",
    color: "amber",
    keywords: ["automation", "script", "workflow", "task", "cron"],
  },
  {
    id: "other",
    name: "Other",
    description: "Miscellaneous skills",
    icon: "📦",
    color: "slate",
    keywords: ["other", "misc", "miscellaneous"],
  },
];

/**
 * Get category by ID
 */
export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((cat) => cat.id === id);
}

/**
 * Infer category from skill metadata
 */
export function inferCategory(
  name: string,
  description: string,
  topics: string[]
): string {
  const text = `${name} ${description} ${topics.join(" ")}`.toLowerCase();

  for (const category of CATEGORIES) {
    if (category.id === "other") continue; // Skip "other" for now

    for (const keyword of category.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        return category.id;
      }
    }
  }

  return "other";
}

/**
 * Get category color class for Tailwind
 */
export function getCategoryColor(categoryId: string): string {
  const category = getCategoryById(categoryId);
  if (!category) return "gray";

  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    green: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
    pink: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
    yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    gray: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
    red: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
    teal: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
  };

  return colorMap[category.color] || colorMap.gray;
}
