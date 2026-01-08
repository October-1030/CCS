import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t py-8 md:py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="font-semibold mb-3">Skills Marketplace</h3>
            <p className="text-sm text-muted-foreground">
              Discover and share Agent Skills for Claude Code, Codex CLI, and more.
            </p>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-3">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://github.com/anthropics/skills"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Official Skills Repo
                </a>
              </li>
              <li>
                <Link href="/categories" className="text-muted-foreground hover:text-foreground transition-colors">
                  Browse Categories
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="font-semibold mb-3">Community</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-3">Project</h3>
            <p className="text-sm text-muted-foreground">
              Built with Next.js
              <br />
              Inspired by{" "}
              <a
                href="https://skillsmp.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                skillsmp.com
              </a>
            </p>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Skills Marketplace. Open source project.</p>
        </div>
      </div>
    </footer>
  );
}
