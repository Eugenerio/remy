# Remy — Web

Next.js 15 App Router. Server Components for list views, Client
Components for the generate/upload wizards. Supabase SSR for auth.

## Run locally

```bash
cd apps/web
cp .env.example .env
pnpm install
pnpm dev
```

Requires the API at `http://localhost:8000` and Supabase running.

## Structure

- `src/app/(app)/` — authenticated routes (dashboard, characters, trends, library, etc.)
- `src/app/(auth)/` — login/signup
- `src/app/auth/callback/` — Supabase exchange
- `src/components/` — design system + shell
- `src/lib/` — api client, supabase clients, utilities

## Design

See [`docs/design-system.md`](./docs/design-system.md). Icons are custom —
do not `pnpm add lucide-react`.
