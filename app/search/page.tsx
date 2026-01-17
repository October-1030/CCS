import { loadSkillsIndex } from "@/lib/data/skills-db";
import { createSearchEngine } from "@/lib/search/index";
import { SearchBar } from "@/components/search/search-bar";
import { SkillGrid } from "@/components/skills/skill-grid";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface SearchPageProps {
  searchParams: Promise<{ q?: string; sort?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || "";
  const sortBy = params.sort as "stars" | "updated" | undefined;

  const index = await loadSkillsIndex();
  const searchEngine = createSearchEngine(index.skills);

  const results = searchEngine.search({
    query,
    filters: {
      sortBy: sortBy || "relevance",
      sortOrder: "desc",
    },
    limit: 100,
  });

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">
          {query ? `Search Results for "${query}"` : "Browse All Skills"}
        </h1>
        <SearchBar defaultValue={query} />
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          Found {results.total.toLocaleString()} {results.total === 1 ? "skill" : "skills"}
        </p>
        <div className="flex gap-2">
          <a
            href={`/search?q=${query}&sort=stars`}
            className={`px-3 py-1.5 rounded-md text-sm ${
              sortBy === "stars"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            Most Stars
          </a>
          <a
            href={`/search?q=${query}&sort=updated`}
            className={`px-3 py-1.5 rounded-md text-sm ${
              sortBy === "updated"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            Recently Updated
          </a>
          <a
            href={`/search?q=${query}`}
            className={`px-3 py-1.5 rounded-md text-sm ${
              !sortBy
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            Most Relevant
          </a>
        </div>
      </div>

      {/* Results */}
      <SkillGrid
        skills={results.results.map((r) => r.skill)}
        emptyMessage={
          query
            ? `No skills found for "${query}". Try different keywords.`
            : "No skills available. Run 'npm run sync' to fetch data."
        }
      />
    </div>
  );
}
