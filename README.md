# {{PROJECT_NAME}}

A **Next.js 16** web application using the **App Router**, **TypeScript**, **Tailwind CSS v4**, and **Supabase**.

## Tech Stack

- **Framework:** Next.js 16 (App Router, `src/app/`)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **Backend/DB:** Supabase (PostgreSQL, Auth, RLS)
- **Deployment:** Vercel (via GitHub Actions CI/CD)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Fill in your Supabase credentials in .env.local

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |

## Documentation

- **[HOWTO.md](HOWTO.md)** - Full setup & deployment guide (DE/EN)
- **[AGENTS.md](AGENTS.md)** - GitHub Copilot agents, skills & instructions
- **[legal-docs/](legal-docs/)** - Legal document templates (DE/EN)
