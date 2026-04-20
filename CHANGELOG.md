# Changelog

All notable changes to Remy are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Version
numbers follow [SemVer](https://semver.org/).

## [0.1.0] — 2026-04-20

Initial public preview.

### Added

- **Auth** — email + password and magic link via Supabase Auth; signup grants 30 free credits.
- **Characters** — create/view/edit; wizard uploads face + 10–20 references and kicks off LoRA training.
- **Trends** — add creators, hashtags, or category sources; daily ingest; ranked suggested feed.
- **Generate** — one-click video with motion transfer from any TikTok URL or suggested video.
- **Credits** — reserve-on-start, settle-on-finish with 50% partial refund on mid-pipeline failure.
- **Billing** — Stripe Checkout + Portal; three plans, three top-up packs.
- **Library** — every generation with before/after thumbnails and approve/discard/regenerate actions.
- **Admin** — user list, credit adjustments, failure feed.
- **Deploy** — Vercel (web), Railway (api/ai), Modal (GPU), Supabase (db/auth/storage).

### Infrastructure

- Prisma schema with append-only trigger on `credit_transactions`.
- HMAC-signed internal webhooks (AI→API, Modal→API).
- Stripe signature verification + idempotency via `webhook_events` table.
- Rate limiting on auth (5/min/IP) and generation (30/min/user).

### Tests

- Vitest unit coverage on shared + api (credit math, HMAC, schemas).
- Pytest coverage on ai service (prompt splitter, TikTok ranking, pipelines with mocked Modal).
- Playwright smoke tests on landing, login, and auth redirect.
