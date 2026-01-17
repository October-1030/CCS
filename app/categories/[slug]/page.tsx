import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkillGrid } from "@/components/skills/skill-grid";
import { loadSkillsByCategory } from "@/lib/data/skills-db";
import { CATEGORIES, getCategoryById } from "@/lib/utils/categories";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = getCategoryById(slug);

  if (!category) {
    notFound();
  }

  const skills = await loadSkillsByCategory(category.id);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Back Button */}
      <Button asChild variant="ghost">
        <Link href="/categories">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Categories
        </Link>
      </Button>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <span className="text-5xl">{category.icon}</span>
          <div>
            <h1 className="text-4xl font-bold">{category.name}</h1>
            <p className="text-xl text-muted-foreground mt-2">
              {category.description}
            </p>
          </div>
        </div>

        <p className="text-muted-foreground">
          {skills.length} {skills.length === 1 ? "skill" : "skills"} in this category
        </p>
      </div>

      {/* Skills Grid */}
      <SkillGrid
        skills={skills}
        emptyMessage={`No skills found in the ${category.name} category yet.`}
      />
    </div>
  );
}

export async function generateStaticParams() {
  return CATEGORIES.map((category) => ({
    slug: category.id,
  }));
}
