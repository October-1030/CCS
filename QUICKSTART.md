# Quick Start Guide

Get your Skills Marketplace up and running in minutes!

## Prerequisites

- Node.js 20+ installed
- A GitHub Personal Access Token ([Create one here](https://github.com/settings/tokens))

## Installation

1. **Clone the repository**
   ```bash
   cd D:\projects\CCS
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your GitHub token:
   ```
   GITHUB_TOKEN=ghp_your_token_here
   ```

## First Time Setup

1. **Sync skills data from GitHub**
   ```bash
   npm run sync
   ```

   This will:
   - Search GitHub for repositories containing SKILL.md files
   - Download and parse skill metadata
   - Generate categorized JSON files in the `data/` directory
   - Take 5-10 minutes depending on rate limits

2. **Start the development server**
   ```bash
   npm run dev
   ```

3. **Open your browser**

   Visit [http://localhost:3000](http://localhost:3000)

## Available Commands

### Development
```bash
npm run dev          # Start development server (with Turbopack)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Data Management
```bash
npm run sync              # Incremental sync (recommended)
npm run sync:full         # Full sync (reset all data)
npm run build:index       # Rebuild search index
npm run validate          # Validate data integrity
```

## Project Structure

```
CCS/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Homepage
│   ├── search/            # Search results
│   ├── skills/[id]/       # Skill details
│   └── categories/        # Category browsing
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── skills/           # Skill-specific components
│   ├── search/           # Search components
│   └── categories/       # Category components
├── lib/                  # Core libraries
│   ├── github/           # GitHub API integration
│   ├── data/             # Data management
│   ├── search/           # Search engine (Fuse.js)
│   └── utils/            # Utilities
├── types/                # TypeScript types
├── data/                 # JSON data (generated)
│   ├── skills/           # Skills data
│   │   ├── index.json   # Lightweight index
│   │   └── skills-full.json  # Complete data
│   └── metadata/         # Statistics
└── scripts/              # CLI tools
```

## Features

### 🔍 **Search**
- Fuzzy search powered by Fuse.js
- Search by name, description, or tags
- Sort by relevance, stars, or update date

### 📂 **Categories**
- 13 predefined categories
- Automatic categorization based on metadata
- Browse skills by category

### 📦 **One-Click Install**
- Copy commands for Claude Code
- Copy commands for Codex CLI
- Direct ZIP download
- GitHub repository links

### 🔄 **Auto-Sync**
- GitHub Actions workflow (runs every 6 hours)
- Incremental updates
- Rate limit handling

## Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your repository
   - Add environment variable: `GITHUB_TOKEN`
   - Deploy!

3. **Configure GitHub Actions**
   - Add repository secret: `SYNC_GITHUB_TOKEN` (for data sync workflow)

### Manual Deployment

```bash
npm run build
npm run start
```

## Troubleshooting

### No data showing up?
Run `npm run sync` to fetch initial data from GitHub.

### Rate limit errors?
- Make sure your `GITHUB_TOKEN` is set correctly
- Authenticated requests have 5000/hour limit
- The sync script automatically handles rate limiting

### Build errors?
```bash
# Clean build
rm -rf .next
npm run build
```

### TypeScript errors?
```bash
npx tsc --noEmit
```

## Next Steps

- **Add more skills**: Run `npm run sync` regularly to fetch new skills
- **Customize categories**: Edit `lib/utils/categories.ts`
- **Adjust search settings**: Modify `lib/search/keyword-search.ts`
- **Enhance UI**: Customize components in `components/`

## Contributing

This is an open-source project. Feel free to:
- Report issues
- Submit pull requests
- Suggest features
- Share your deployed version!

## Credits

- Inspired by [skillsmp.com](https://skillsmp.com)
- Built with [Next.js 15](https://nextjs.org)
- UI components based on [shadcn/ui](https://ui.shadcn.com)
- Search powered by [Fuse.js](https://fusejs.io)

## License

MIT

---

**Need help?** Check out the [README.md](README.md) for more details.
