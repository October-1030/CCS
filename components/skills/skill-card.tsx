"use client";

import Link from "next/link";
import { Star, GitFork, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCategoryColor } from "@/lib/utils/categories";
import type { SkillIndex } from "@/types/skill";

interface SkillCardProps {
  skill: SkillIndex;
}

export function SkillCard({ skill }: SkillCardProps) {
  const updatedDate = new Date(skill.updatedAt).toLocaleDateString();

  return (
    <Link href={`/skills/${skill.id}`}>
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{skill.name}</CardTitle>
              <CardDescription className="mt-2 line-clamp-2">
                {skill.description}
              </CardDescription>
            </div>
            <Badge className={getCategoryColor(skill.category)}>
              {skill.category}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {/* Tags */}
            {skill.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {skill.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {skill.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{skill.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4" />
                <span>{skill.stars}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{updatedDate}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
