# Skills Marketplace

A platform for discovering and sharing Agent Skills, similar to skillsmp.com.

## Features

- 🔍 **Smart Search** - Keyword and fuzzy search powered by Fuse.js
- 📂 **Category Browsing** - Organize skills by 13+ categories
- 🏷️ **Tag Filtering** - Filter by tags, stars, language, and update date
- ⚡ **One-Click Install** - Copy install commands for Claude Code, Codex CLI
- 🔄 **Auto Sync** - Automatic GitHub data synchronization
- 🎨 **Modern UI** - Built with Next.js 15, Tailwind CSS, and shadcn/ui

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **Search**: Fuse.js
- **Data**: JSON files + GitHub API
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 20+
- GitHub Personal Access Token ([create one](https://github.com/settings/tokens))

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd CCS
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env.local
# Edit .env.local and add your GITHUB_TOKEN
```

4. Sync initial data:
```bash
npm run sync
```

5. Run development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run sync` - Sync skills from GitHub
- `npm run sync:full` - Full sync (reset all data)
- `npm run build:index` - Rebuild search index
- `npm run validate` - Validate data integrity

## Project Structure

```
CCS/
├── app/                    # Next.js app router
│   ├── page.tsx           # Homepage
│   ├── search/            # Search pages
│   ├── skills/            # Skill detail pages
│   ├── categories/        # Category pages
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── layout/           # Layout components
│   ├── skills/           # Skill-related components
│   └── search/           # Search components
├── lib/                  # Utilities and libraries
│   ├── github/           # GitHub API integration
│   ├── search/           # Search engine
│   ├── data/             # Data management
│   └── utils/            # Helper functions
├── types/                # TypeScript type definitions
├── data/                 # JSON data storage
│   ├── skills/           # Skills data
│   └── metadata/         # Metadata and stats
├── scripts/              # CLI scripts
└── public/               # Static assets
```

## Data Sync

The project uses GitHub Actions to automatically sync skills every 6 hours. You can also trigger manual syncs:

```bash
npm run sync              # Incremental sync
npm run sync:full         # Full sync (slower)
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables (GITHUB_TOKEN)
4. Deploy

The app will auto-deploy on every push to main branch.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

- Inspired by [skillsmp.com](https://skillsmp.com)
- Built with [anthropics/skills](https://github.com/anthropics/skills)
