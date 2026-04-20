# Remy

SaaS platform for creating and scaling AI influencers — upload a few
photos, train a character LoRA, track trending TikTok formats, and
one-click motion-perfect videos with your character in them.

[ARCHITECTURE.md](./ARCHITECTURE.md) is the authoritative design doc —
read it first if you're orienting.

## What's in here

```
remy/
├── apps/
│   ├── web/                # Next.js 15 + Tailwind v4 — Vercel
│   └── api/                # Hono + Prisma + BullMQ — Railway
├── services/
│   ├── ai/                 # FastAPI orchestration — Railway
│   ├── modal/              # GPU functions (LoRA, image, video) — Modal
│   └── comfyui/            # ComfyUI workflow JSONs
├── packages/
│   ├── shared/             # Shared TS types (credits, jobs, prompts, schemas, errors)
│   └── config/             # tsconfig bases
├── supabase/               # Supabase CLI config + auth migrations
├── infra/docker/           # Local dev compose
├── docs/                   # ADRs, pricing, runbooks
└── .github/workflows/      # CI + deploy
```

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 (App Router, React 19), Tailwind v4, hand-drawn SVG icons |
| Auth + DB + Storage | Supabase (Postgres, Auth, Storage) |
| API | Hono 4 on Node 20, Prisma 5, BullMQ (Redis) |
| AI orchestration | FastAPI on Python 3.11, Gemini 2.0 Flash for outfit analysis |
| GPU compute | Modal (A10G / L40S / H100, per-second billing) |
| Generation | ComfyUI workflows (LoRA, Flux, Wan 2.2 motion transfer) |
| Billing | Stripe (Checkout + Billing Portal) |
| Hosting | Vercel (web) + Railway (api/ai/redis) + Modal (GPU) |
| Observability | Sentry + BetterStack |

## Quickstart

Requirements: Node 20+, pnpm 9, Python 3.11+, uv, Docker, Supabase CLI,
and optionally the Stripe CLI for webhook forwarding.

```bash
git clone <this repo>
cd remy  # or whatever you cloned into
./scripts/bootstrap.sh
```

The bootstrap script:

1. Installs JS + Python deps.
2. Copies every `.env.example` → `.env` if missing.
3. Boots Supabase locally (`supabase start`).
4. Boots Redis via docker compose.
5. Applies Prisma migrations + seeds a demo user.

Then:

```bash
# Terminal 1 — web + api
pnpm dev

# Terminal 2 — AI service
pnpm dev:ai

# Optional — Stripe webhooks (requires stripe login)
stripe listen --forward-to localhost:8000/v1/webhooks/stripe
```

Visit:

- App: <http://localhost:3000>
- API: <http://localhost:8000>
- AI: <http://localhost:8001>
- Supabase Studio: <http://localhost:54323>
- Inbucket (dev email): <http://localhost:54324>

## Environment variables

Canonical list lives in [`.env.example`](./.env.example). Each service
has its own scoped copy:

- [`apps/api/.env.example`](./apps/api/.env.example)
- [`apps/web/.env.example`](./apps/web/.env.example)
- [`services/ai/.env.example`](./services/ai/.env.example)

## Testing

```bash
pnpm test               # all JS packages (vitest)
pnpm test:e2e           # Playwright smoke tests against localhost:3000
cd services/ai && uv run pytest
```

What's covered:

- `packages/shared` — credit math, refund rules, zod schemas, error helpers.
- `apps/api` — credit reservations, settle idempotency, HMAC.
- `apps/web` — component tests (Button, utils), Playwright flows.
- `services/ai` — prompt splitter, tiktok ranking, pipeline with mocked Modal.

## Deploying

Four surfaces, three providers:

- **Web → Vercel.** Connect the repo, set root = `apps/web`. `vercel.json`
  handles the pnpm workspace install.
- **API + AI → Railway.** Create a project, add three services:
  `api` (Dockerfile `apps/api/Dockerfile`),
  `ai` (Dockerfile `services/ai/Dockerfile`),
  `redis` (managed).
  Railway's Postgres isn't used — point `DATABASE_URL` at Supabase's
  pooled connection string.
- **Modal.** `modal deploy services/modal/app.py` (CI does this on tag).
- **Supabase.** `supabase link && supabase db push`. The Prisma
  migration in `apps/api/prisma/migrations/` is idempotent and safe to
  re-run.

Secrets checklist before first deploy:

- Supabase: URL, anon key, service role key, JWT secret, DB URL
- Stripe: secret key, webhook secret, six price IDs (3 plans + 3 packs)
- Modal: token id + token secret
- Gemini: `GEMINI_API_KEY`
- Internal: a shared 32-byte `INTERNAL_SERVICE_TOKEN` across api + ai + modal

Copy `.env.example` to production envs, fill in real values, set
`ADMIN_EMAILS` to your team.

## Credits system

Reserve-on-start, settle-on-finish with SQL-level append-only guarantees.
See [ARCHITECTURE.md § 5](./ARCHITECTURE.md#5-credits--the-load-bearing-system)
and [docs/pricing.md](./docs/pricing.md).

## Design system

Claude-inspired: warm paper (`#F5F0E8`), coral accent (`#D97757`), soft
serif display (Source Serif 4), sans UI (Inter). All icons hand-drawn in
[`apps/web/src/components/icons.tsx`](./apps/web/src/components/icons.tsx).
**lucide-react is banned** — see [ADR 0002](./docs/adr/0002-claude-design-system.md).

## Support + feedback

- Runbooks: [`docs/runbook.md`](./docs/runbook.md)
- ADRs: [`docs/adr/`](./docs/adr/)
- Pricing policy: [`docs/pricing.md`](./docs/pricing.md)
- Changelog: [`CHANGELOG.md`](./CHANGELOG.md)

## License

MIT — see [LICENSE](./LICENSE).
