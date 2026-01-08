import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCategoryColor } from "@/lib/utils/categories";
import type { Category } from "@/types/skill";

interface CategoryCardProps {
  category: Category;
  count?: number;
}

export function CategoryCard({ category, count }: CategoryCardProps) {
  return (
    <Link href={`/categories/${category.id}`}>
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{category.icon}</span>
            <div className="flex-1">
              <CardTitle className="text-lg">{category.name}</CardTitle>
              {count !== undefined && (
                <CardDescription className="mt-1">
                  {count} {count === 1 ? "skill" : "skills"}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{category.description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
