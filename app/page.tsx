import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/search/search-bar";
import { SkillGrid } from "@/components/skills/skill-grid";
import { CategoryCard } from "@/components/categories/category-card";
import { loadSkillsIndex, loadStats, hasData } from "@/lib/data/skills-db";
import { CATEGORIES } from "@/lib/utils/categories";

export default async function HomePage() {
  const dataExists = await hasData();

  if (!dataExists) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h1 className="text-4xl font-bold">Welcome to Skills Marketplace</h1>
          <p className="text-xl text-muted-foreground">
            Browse and install Agent Skills for Claude Code, Codex CLI, and more.
          </p>

          <div className="bg-card border rounded-lg p-8 text-left space-y-4">
            <h2 className="text-lg font-semibold">Getting Started</h2>
            <ol className="space-y-3 text-muted-foreground">
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">1.</span>
                <div>
                  <p>Set up your GitHub token in <code className="bg-muted px-2 py-1 rounded">.env.local</code></p>
                  <code className="block mt-2 bg-muted p-2 rounded text-sm">
                    GITHUB_TOKEN=your_token_here
                  </code>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">2.</span>
                <div>
                  <p>Run the sync command to fetch skills from GitHub:</p>
                  <code className="block mt-2 bg-muted p-2 rounded text-sm">
                    npm run sync
                  </code>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">3.</span>
                <p>Refresh this page to see the skills!</p>
              </li>
            </ol>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Need a GitHub token?{" "}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Create one here
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const index = await loadSkillsIndex();
  const stats = await loadStats();

  // Get popular skills (top 6)
  const popularSkills = index.skills
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 6);

  // Get category counts
  const categoryCounts = stats?.byCategory || {};

  return (
    <div className="container mx-auto px-4 py-12 space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-12">
        <h1 className="text-5xl font-bold tracking-tight">
          Discover Agent Skills
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Browse {index.totalSkills.toLocaleString()} curated skills for Claude Code, Codex CLI, and more.
        </p>

        <div className="max-w-2xl mx-auto pt-4">
          <SearchBar placeholder="Search skills by name, description, or tags..." />
        </div>

        <div className="flex gap-4 justify-center pt-4">
          <Button asChild size="lg">
            <Link href="/search">
              Browse All Skills
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/categories">View Categories</Link>
          </Button>
        </div>
      </section>

      {/* Popular Skills */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Popular Skills</h2>
          <Button asChild variant="ghost">
            <Link href="/search?sort=stars">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <SkillGrid skills={popularSkills} />
      </section>

      {/* Categories */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Browse by Category</h2>
          <Button asChild variant="ghost">
            <Link href="/categories">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {CATEGORIES.slice(0, 8).map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              count={categoryCounts[category.id] || 0}
            />
          ))}
        </div>
      </section>

      {/* Stats */}
      {stats && (
        <section className="bg-muted/50 rounded-lg p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold">{index.totalSkills.toLocaleString()}</p>
              <p className="text-muted-foreground mt-2">Total Skills</p>
            </div>
            <div>
              <p className="text-4xl font-bold">{Object.keys(categoryCounts).length}</p>
              <p className="text-muted-foreground mt-2">Categories</p>
            </div>
            <div>
              <p className="text-4xl font-bold">{stats.topTags.length}</p>
              <p className="text-muted-foreground mt-2">Unique Tags</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
