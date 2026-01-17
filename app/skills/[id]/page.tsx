import { notFound } from "next/navigation";
import Link from "next/link";
import { Star, GitFork, Calendar, ExternalLink, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { InstallButton } from "@/components/skills/install-button";
import { loadSkillById } from "@/lib/data/skills-db";
import { getCategoryColor } from "@/lib/utils/categories";

// Use dynamic rendering for 10k+ skills pages
export const dynamic = 'force-dynamic';

interface SkillPageProps {
  params: Promise<{ id: string }>;
}

export default async function SkillPage({ params }: SkillPageProps) {
  const { id } = await params;
  const skill = await loadSkillById(id);

  if (!skill) {
    notFound();
  }

  const updatedDate = new Date(skill.metadata.updatedAt).toLocaleDateString();
  const createdDate = new Date(skill.metadata.createdAt).toLocaleDateString();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Button asChild variant="ghost" className="mb-6">
        <Link href="/search">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Browse
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h1 className="text-4xl font-bold">{skill.name}</h1>
                <p className="text-xl text-muted-foreground mt-2">
                  {skill.description}
                </p>
              </div>
              <Badge className={getCategoryColor(skill.category)}>
                {skill.category}
              </Badge>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {skill.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                <span className="font-semibold">{skill.metadata.stars.toLocaleString()}</span>
                <span className="text-sm">stars</span>
              </div>
              <div className="flex items-center gap-2">
                <GitFork className="h-5 w-5" />
                <span className="font-semibold">{skill.metadata.forks.toLocaleString()}</span>
                <span className="text-sm">forks</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span className="text-sm">Updated {updatedDate}</span>
              </div>
            </div>
          </div>

          {/* SKILL.md Content */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4">Skill Documentation</h2>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <pre className="whitespace-pre-wrap font-mono text-sm bg-muted p-4 rounded-lg overflow-x-auto">
                  {skill.skillMd.content}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Install */}
          <InstallButton skill={skill} />

          {/* Repository Info */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold">Repository Information</h3>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Owner</p>
                  <p className="font-medium">{skill.repo.owner}</p>
                </div>

                <div>
                  <p className="text-muted-foreground">Repository</p>
                  <p className="font-medium">{skill.repo.name}</p>
                </div>

                {skill.metadata.language && (
                  <div>
                    <p className="text-muted-foreground">Language</p>
                    <p className="font-medium">{skill.metadata.language}</p>
                  </div>
                )}

                {skill.metadata.license && (
                  <div>
                    <p className="text-muted-foreground">License</p>
                    <p className="font-medium">{skill.metadata.license}</p>
                  </div>
                )}

                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{createdDate}</p>
                </div>

                <div>
                  <p className="text-muted-foreground">Last Updated</p>
                  <p className="font-medium">{updatedDate}</p>
                </div>
              </div>

              <Button asChild className="w-full">
                <a
                  href={skill.repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on GitHub
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>

              {skill.repo.homepage && (
                <Button asChild variant="outline" className="w-full">
                  <a
                    href={skill.repo.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Visit Homepage
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Topics */}
          {skill.metadata.topics.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {skill.metadata.topics.map((topic) => (
                    <Badge key={topic} variant="secondary">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
