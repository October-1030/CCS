"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Skill } from "@/types/skill";

interface InstallButtonProps {
  skill: Skill;
}

export function InstallButton({ skill }: InstallButtonProps) {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const commands = {
    claudeCode: `git clone ${skill.repo.url} ~/.claude/skills/${skill.name}`,
    codexCli: `codex skill add ${skill.repo.fullName}`,
    manual: `curl -o SKILL.md ${skill.repo.url}/raw/${skill.repo.defaultBranch}/SKILL.md`,
  };

  const copyCommand = async (command: string, type: string) => {
    await navigator.clipboard.writeText(command);
    setCopiedCommand(type);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const downloadZip = () => {
    window.open(
      `${skill.repo.url}/archive/refs/heads/${skill.repo.defaultBranch}.zip`,
      "_blank"
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Install This Skill</CardTitle>
        <CardDescription>
          Choose your preferred installation method
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Claude Code */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Claude Code</p>
          <div className="flex gap-2">
            <code className="flex-1 p-3 bg-muted rounded-md text-sm font-mono overflow-x-auto">
              {commands.claudeCode}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyCommand(commands.claudeCode, "claude")}
            >
              {copiedCommand === "claude" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Codex CLI */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Codex CLI</p>
          <div className="flex gap-2">
            <code className="flex-1 p-3 bg-muted rounded-md text-sm font-mono overflow-x-auto">
              {commands.codexCli}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyCommand(commands.codexCli, "codex")}
            >
              {copiedCommand === "codex" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Manual Download */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Manual Installation</p>
          <div className="flex gap-2">
            <code className="flex-1 p-3 bg-muted rounded-md text-sm font-mono overflow-x-auto">
              {commands.manual}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyCommand(commands.manual, "manual")}
            >
              {copiedCommand === "manual" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Download ZIP */}
        <Button
          variant="secondary"
          className="w-full"
          onClick={downloadZip}
        >
          <Download className="h-4 w-4 mr-2" />
          Download ZIP Archive
        </Button>
      </CardContent>
    </Card>
  );
}
