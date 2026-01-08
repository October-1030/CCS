import { CategoryCard } from "@/components/categories/category-card";
import { CATEGORIES } from "@/lib/utils/categories";
import { loadStats } from "@/lib/data/skills-db";

export default async function CategoriesPage() {
  const stats = await loadStats();
  const categoryCounts = stats?.byCategory || {};

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Browse by Category</h1>
        <p className="text-xl text-muted-foreground">
          Explore skills organized by {CATEGORIES.length} categories
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CATEGORIES.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            count={categoryCounts[category.id] || 0}
          />
        ))}
      </div>
    </div>
  );
}
