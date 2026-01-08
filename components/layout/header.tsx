import Link from "next/link";
import { SearchBar } from "@/components/search/search-bar";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4">
        <div className="mr-8">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">Skills Marketplace</span>
          </Link>
        </div>

        <nav className="flex items-center space-x-6 text-sm font-medium flex-1">
          <Link
            href="/categories"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Categories
          </Link>
          <Link
            href="/search"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Browse All
          </Link>
        </nav>

        <div className="flex-1 max-w-md ml-auto">
          <SearchBar placeholder="Search skills..." />
        </div>
      </div>
    </header>
  );
}
