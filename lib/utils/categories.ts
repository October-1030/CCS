import { Category } from "@/types/skill";

/**
 * Predefined categories for skills (8 main categories)
 */
export const CATEGORIES: Category[] = [
  {
    id: "Frontend Development",
    name: "Frontend Development",
    description: "React, Vue, Angular, UI/UX design, and modern web interfaces",
    icon: "🎨",
    color: "blue",
    keywords: ["frontend", "ui", "react", "vue", "angular", "nextjs", "design", "web"],
  },
  {
    id: "Backend Development",
    name: "Backend Development",
    description: "APIs, databases, servers, and backend frameworks",
    icon: "⚙️",
    color: "green",
    keywords: ["backend", "api", "server", "database", "sql", "graphql"],
  },
  {
    id: "AI & Data Science",
    name: "AI & Data Science",
    description: "Machine learning, data analysis, and AI-powered tools",
    icon: "🤖",
    color: "purple",
    keywords: ["ai", "ml", "data", "machine learning", "analytics", "data science"],
  },
  {
    id: "DevOps & Infrastructure",
    name: "DevOps & Infrastructure",
    description: "CI/CD, cloud platforms, Docker, Kubernetes, and infrastructure",
    icon: "🚀",
    color: "orange",
    keywords: ["devops", "infrastructure", "cloud", "kubernetes", "docker", "terraform", "ci-cd"],
  },
  {
    id: "Tools & Productivity",
    name: "Tools & Productivity",
    description: "CLI tools, workflows, MCP servers, and productivity enhancers",
    icon: "🛠️",
    color: "cyan",
    keywords: ["tools", "productivity", "cli", "mcp", "workflow", "automation"],
  },
  {
    id: "Testing & Quality",
    name: "Testing & Quality",
    description: "Testing frameworks, QA, debugging, and code review",
    icon: "🧪",
    color: "yellow",
    keywords: ["test", "testing", "qa", "quality", "debug", "playwright"],
  },
  {
    id: "Business & Marketing",
    name: "Business & Marketing",
    description: "Marketing, e-commerce, product management, and business tools",
    icon: "💼",
    color: "pink",
    keywords: ["business", "marketing", "product", "ecommerce", "shopify", "sales"],
  },
  {
    id: "Specialized",
    name: "Specialized",
    description: "Security, gaming, mobile, blockchain, and niche domains",
    icon: "🎯",
    color: "indigo",
    keywords: ["security", "game", "mobile", "blockchain", "specialized", "embedded"],
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
