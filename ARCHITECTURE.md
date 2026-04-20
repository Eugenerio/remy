# Remy — Architecture

Remy is a SaaS platform for creating AI influencers end-to-end: train a
character LoRA from a handful of photos, discover trending TikTok formats,
and one-click a full-length video that preserves the character's identity
while matching the reference motion.

This document is the single source of truth for **how the system is
built**. It pairs with [README.md](./README.md) (how to run it) and
[docs/pricing.md](./docs/pricing.md) (what credits cost).

---

## 1. High-level topology

```
                ┌────────────────────────────┐
                │       Next.js (Vercel)      │
                │  apps/web · Claude design   │
                └──────────────┬──────────────┘
                               │  HTTPS (Supabase JWT bearer)
                               ▼
                ┌────────────────────────────┐
                │        Node API (Hono)      │
                │   apps/api · Railway        │
                │   auth · credits · billing  │
                │   CRUD · jobs · webhooks    │
                └──────┬──────────────┬───────┘
        Prisma │       │              │  BullMQ
    (via pgbouncer)    │              │ (Redis)
                       ▼              ▼
         ┌──────────────────┐   ┌─────────────────────┐
         │   Supabase       │   │   Redis (Railway)   │
         │  Postgres · Auth │   │   queues · cache    │
         │  Storage         │   └──────────┬──────────┘
         └──────────────────┘              │
                       ▲                   │  HMAC-signed dispatch
                       │                   ▼
                       │        ┌─────────────────────┐
                       │        │    FastAPI (Rly)    │
                       │        │    services/ai      │
                       │        │  preprocess · prompt│
                       │        │   orchestrate       │
                       │        └──────────┬──────────┘
                       │                   │
                       │                   ▼
                       │        ┌─────────────────────┐
                       │        │    Modal (GPUs)     │
                       │        │  services/modal     │
                       │        │ LoRA · img · video  │
                       │        │ ComfyUI in-process  │
                       │        └──────────┬──────────┘
                       │                   │  webhook back
                       └───────────────────┘
```

The four data planes:

- **Web** — Next.js 15 App Router on Vercel. Server Components for list
  pages, Client Components for the generate wizard. Supabase `getUser()`
  runs on every request (edge runtime where possible).
- **API** — Hono on Node 20, containerised, running on Railway behind
  Railway's HTTPS ingress. All business logic, credits, Stripe, job
  creation, webhook ingestion.
- **AI orchestration** — FastAPI on Python 3.11 on Railway. Wraps ComfyUI,
  Modal, and the prompt templates. Pure workhorse — no database writes
  except through the API's internal endpoints.
- **GPU compute** — Modal apps (one per workload: LoRA, outfit image,
  video). Modal pulls ComfyUI in as a Python dependency and runs it
  in-process with a GPU.

Data stores:

- **Postgres (Supabase)** for everything transactional.
- **Supabase Storage** for user uploads and generated media.
- **Redis (Railway)** for BullMQ queues and rate-limiter buckets.

---

## 2. Cloud choice — the long answer

The question was "AWS or GCP?". The honest answer is **neither, as a
cost-efficient MVP platform for this workload**. The actual production
stack is a Supabase + Vercel + Railway + Modal composition.

Here is the reasoning, starting with the canonical comparison.

### 2.1 AWS vs GCP — side by side

| Dimension | AWS | GCP |
|---|---|---|
| **Up-front cost to MVP** | Medium. NAT gateway hourly cost bites early; account baseline ≈ $40–80/mo even idle. | Low. Cloud Run / Cloud SQL / Cloud Storage scale to zero cleanly. |
| **Scalability ceiling** | Highest. Nothing in this stack hits it. | Very high. Also won't hit ceilings. |
| **AI/ML tooling** | SageMaker is enterprise-grade but overkill and expensive; Bedrock for hosted models. | Vertex AI tighter for training jobs; TPUs available but irrelevant for ComfyUI. |
| **Serverless ecosystem** | Lambda is mature; Fargate Spot is excellent for background work; EventBridge + SQS robust. | Cloud Run is the cleanest container-serverless anywhere; Pub/Sub robust. |
| **GPU/container support** | EC2 + ECS or EKS with GPU node groups; spot GPUs available; Fargate has no GPU. | GKE autopilot with GPUs; TPU v5e optional; simpler quota ramp. |
| **Node + FastAPI + ComfyUI fit** | Workable; needs ALB + Fargate + RDS + EFS or S3 + custom ECR builds. | Workable; Cloud Run + Cloud SQL + Cloud Storage + GKE for ComfyUI. |
| **Managed SaaS essentials (auth, email, payments)** | Cognito is OK, SES is cheap, Route53 + ACM easy; no built-in Stripe-grade UX. | Identity Platform is OK; payments via 3rd party regardless. |
| **Operational simplicity** | Most things possible; nothing is simple. Terraform table stakes. | Considerably simpler for services we care about. |
| **Cold-start economics for GPU** | EC2 GPU instances take 30–90s to boot; ECS doesn't auto-scale GPUs down gracefully. | Similar story on GKE; cold GPU requests still cost minutes. |
| **Free tier for MVP** | 12-month limited; NAT + RDS will eat it. | Sustained-use discounts + $300 credit; Cloud Run generous free tier. |
| **Operational knobs we don't need** | Many (VPC, subnets, security groups per hop, KMS policies). | Fewer. |

### 2.2 The verdict

**If forced to choose one:** GCP, because Cloud Run + Cloud SQL + Cloud
Storage lets a small team ship a serverless-first SaaS without living in
Terraform. AWS wins only if you already have deep in-house AWS expertise.

**But we aren't forced to choose one**, and the following composition is
measurably cheaper and faster to ship for an MVP of this shape:

| Concern | Provider | Why this, not AWS/GCP |
|---|---|---|
| Frontend hosting | **Vercel** | Native Next.js, preview URLs per PR, edge cache, sub-minute deploys. |
| API + AI service hosting | **Railway** | Container-native. Managed Postgres, Redis, TCP ingress. `railway.toml`. Scales to multiple instances; $5 hobby + usage. |
| GPU compute | **Modal** | Per-second billing, sub-2s cold starts for pre-warmed containers, native Python. You write `@modal.function(gpu="H100")` and you have a GPU. No AWS/GCP quota dance. |
| Database, Auth, Storage | **Supabase** | One product: Postgres + RLS, email/OAuth/magic-link auth, S3-compatible storage with signed URLs. Open-source, self-hostable later. |
| Queue / cache | **Railway Redis** | Same-network low latency to the API. |
| Payments | **Stripe** | Non-negotiable. |
| Email | **Resend** | Clean API, React email templates. |
| Observability | **Sentry + BetterStack** | Error + uptime + log tail. Both free tiers for MVP. |

Total fixed monthly cost at zero users: **≈ $25** (Vercel Pro optional,
Railway $5 hobby, Supabase free tier, Modal $0 idle, Resend free tier).

We revisit this decision when: (a) GPU spend passes ~$2k/mo (then evaluate
reserved H100s on Lambda Labs / RunPod), or (b) we need SOC 2 Type II
(Supabase and Railway both issue attestations; still worth a look).

### 2.3 Can we migrate later?

Yes, by construction. The code does not depend on any provider-specific
primitive:

- **DB** — we speak plain Postgres via Prisma. Any managed Postgres works.
- **Storage** — we speak S3-compatible signed URLs. Supabase Storage,
  AWS S3, Cloudflare R2, GCS XML API — all identical code.
- **Auth** — we verify Supabase JWTs, but the verifier is a 40-line
  module. Swap it for Auth0 / Clerk / custom by replacing one file.
- **GPU** — Modal is behind the AI service's `modal_client` abstraction.
  Swap for Runpod / Lambda / self-hosted H100 by swapping the client.
- **API hosting** — Hono runs anywhere Node runs. Docker image on any
  PaaS.

---

## 3. Service contracts

### 3.1 Web → API

Transport: HTTPS, JSON. Auth: `Authorization: Bearer <supabase_access_token>`.

```
GET    /v1/me                         → account, plan, credits
POST   /v1/auth/magic-link            → send magic link
POST   /v1/uploads/presign            → presigned PUT URL
GET    /v1/characters
POST   /v1/characters
PATCH  /v1/characters/:id
POST   /v1/characters/:id/train       → starts LoRA job
GET    /v1/characters/:id/training    → latest training job
GET    /v1/trends/sources
POST   /v1/trends/sources
DELETE /v1/trends/sources/:id
GET    /v1/trends/suggested           → ranked video feed
POST   /v1/generate/estimate          → returns cost + preflight checks
POST   /v1/generate                   → reserves credits + creates job
POST   /v1/generate/:id/regenerate    → reserves credits + re-runs
POST   /v1/generate/:id/approve
POST   /v1/generate/:id/discard
GET    /v1/jobs                       → list with filters
GET    /v1/jobs/:id                   → single job with progress
GET    /v1/jobs/:id/stream            → SSE progress feed
GET    /v1/library                    → generations grouped by character
GET    /v1/billing                    → usage + invoices
POST   /v1/billing/checkout           → Stripe Checkout Session (topup / plan)
POST   /v1/billing/portal             → Stripe Billing Portal
POST   /v1/webhooks/stripe            → Stripe webhook (signed)
POST   /v1/webhooks/ai                → AI service job updates (HMAC)
POST   /v1/webhooks/modal             → Modal function webhook (HMAC)
GET    /v1/admin/users                → admin only
POST   /v1/admin/credits/adjust       → admin only
```

All 4xx and 5xx responses conform to `packages/shared/errors.ts`:

```json
{
  "error": {
    "code": "insufficient_credits",
    "message": "Not enough credits: need 40, have 12",
    "details": { "need": 40, "have": 12 },
    "request_id": "req_01H..."
  }
}
```

### 3.2 API → AI

Transport: HTTPS, JSON. Auth: `X-Remy-Token: <INTERNAL_SERVICE_TOKEN>`.

```
POST /internal/jobs                   → body: { job_id, kind, input }
POST /internal/jobs/:id/cancel
POST /internal/prompts/outfit         → returns structured outfit prompt
GET  /internal/health
```

The AI service is stateless. It does not have DB credentials. It pushes
progress to the API via signed webhooks:

```
POST {API}/v1/webhooks/ai
X-Remy-Signature: sha256=...
{
  "job_id": "job_...",
  "status": "running",
  "progress": { "percent": 42, "stage": "sampling" },
  "output": null
}
```

### 3.3 AI → Modal

Each GPU workload is a Modal app. The AI service imports the client stubs
(they act as remote-call proxies) and calls them like regular functions.
Modal handles queuing, scaling, logging.

### 3.4 Modal → API

Modal functions post a terminal webhook back to the API on completion
(success or failure). This is the **only** place the credit ledger is
finalised. See §5.4.

---

## 4. Data model

See [`apps/api/prisma/schema.prisma`](./apps/api/prisma/schema.prisma) for
the definitive schema. Summary:

- `User` (mirrors `auth.users.id` from Supabase; 1:1)
- `Profile` — display name, avatar, plan, onboarding flags
- `CreditBalance` — single row per user; `current`, `pending`, `lifetime_granted`
- `CreditTransaction` — immutable append-only ledger
- `Subscription` — Stripe subscription state
- `Invoice` — Stripe invoice mirror
- `Character` — an AI influencer identity
- `CharacterDataset` — face image + reference images (Storage keys)
- `LoraModel` — trained weights, version, status
- `TrendSource` — user-defined TikTok creator / hashtag / category
- `SuggestedVideo` — ingested candidate content, scored and ranked
- `Job` — the universal work envelope (kind, status, progress, io)
- `Generation` — a rendered video with before/after and user decision
- `WebhookEvent` — idempotency ledger for Stripe and Modal

Rules we enforce at the DB level:

- `CreditBalance.current >= 0` (CHECK constraint)
- `CreditTransaction` is append-only — no `UPDATE`/`DELETE` permitted via
  Prisma (we revoke those privileges in migration `002`).
- All `userId`-scoped tables carry a foreign key with `ON DELETE CASCADE`
  but the DB is the backstop — business logic soft-deletes where possible.
- RLS is disabled on the application-owned tables because the API is the
  only client and uses the service role key. RLS is kept on `auth.*`.

---

## 5. Credits — the load-bearing system

### 5.1 Invariants

1. A user's visible balance equals `sum(CreditTransaction.amount WHERE status='applied')`.
2. A user's usable balance equals `balance - sum(active_reservations)`.
3. Every job has at most one `usage_reserve` transaction in `pending`.
4. Every terminal job has exactly one of: `usage_charge` (success) or
   `usage_refund` + cancelled reservation (failure).
5. Sum of transactions for any user never goes below zero.

### 5.2 The two-phase commit

```
  user clicks Generate
         │
         ▼
  POST /v1/generate/estimate ─── returns { cost: 40 }
         │
  confirm modal ── user clicks Confirm
         │
         ▼
  POST /v1/generate
         │
         ▼
┌─────────────────────────────────────────────────────┐
│ TX: SELECT balance FOR UPDATE (row lock, SERIALIZABLE)│
│     IF balance < cost → abort with insufficient_credits│
│     INSERT usage_reserve transaction (status=pending)│
│     UPDATE balance.pending += cost                    │
│     INSERT Job (status=reserved, reserved_credits=40)│
│ COMMIT                                                │
└─────────────────────────────────────────────────────┘
         │
         ▼
  Enqueue BullMQ job → AI service
         │
         ▼
  Job runs, progress webhooks tick
         │
         ▼
  Terminal webhook lands:
    success  → TX: charge (reservation → applied; balance.pending -= cost; balance.current -= cost)
    failure  → TX: refund (reservation cancelled; balance.pending -= cost; optional partial charge)
```

The FOR UPDATE lock prevents two parallel `generate` calls from passing
the balance check simultaneously. The SERIALIZABLE isolation level is
used for the reservation transaction specifically.

### 5.3 Refund rules

See `packages/shared/src/jobs.ts`. Summary:

- Job failed during `queued`/`reserved`/`preparing` → **full refund**.
- Job failed during `running`/`rendering` → **50% refund**, 50% charged
  to cover the compute we already paid Modal for.
- Job succeeded → no refund, full charge.
- Job cancelled by user before `running` → full refund.

### 5.4 Sources of truth & idempotency

- Stripe is the source of truth for subscription state and top-up
  fulfillment; we mirror into `Subscription` / `Invoice` on webhook.
- Modal is the source of truth for job success. Our API treats Modal's
  webhook as authoritative and finalises the ledger there.
- Every webhook is stored in `WebhookEvent` keyed by `(source, event_id)`
  with a uniqueness constraint. Replays are a no-op.

---

## 6. Generation pipeline

### 6.1 Character creation

1. User uploads 1 face image and 10–20 reference images via presigned
   PUT URLs to Supabase Storage (`uploads` bucket).
2. Web calls `POST /v1/characters` with the Storage keys.
3. API writes `Character`, `CharacterDataset`, `Job(kind=lora_training)`.
4. BullMQ pushes to the `lora` queue.
5. Worker calls AI service `POST /internal/jobs`.
6. AI service: normalises images (face-align, crop, resize to 768×768),
   writes processed dataset to `datasets` bucket, then invokes Modal
   `lora_train` function.
7. Modal runs ComfyUI's LoRA trainer on an A10G (MVP) or L40S/H100.
8. On completion, Modal uploads `character_<id>.safetensors` to the
   `datasets` bucket and POSTs to `/v1/webhooks/modal`.
9. API updates `LoraModel` row + `Job.status=completed`, grants no
   credit refund because the training charge is final.

### 6.2 Trend ingestion

1. User adds a TikTok creator / hashtag as a `TrendSource`.
2. Cron job (Railway cron) enqueues a daily `trend_ingest` for each
   active source. Free ingest, no credits charged.
3. AI service fetches videos via RapidAPI's TikTok Scraper, computes
   `simplicity_score` (single subject, stable background, minimal cuts
   detected by a 3s OpenCV shot-change pass) and `engagement_score`
   (likes/view ratio). Results stored as `SuggestedVideo`.
4. Ranking at query time: `0.6 * engagement + 0.4 * simplicity`, filtered
   by freshness (default last 7 days).

### 6.3 One-click video

1. User selects a `SuggestedVideo`, opens the Generate wizard, picks a
   `Character`, duration, and resolution.
2. Web calls `POST /v1/generate/estimate` — confirms cost, surfaces
   warnings (low balance, stale LoRA, etc.).
3. User clicks Generate → `POST /v1/generate` → two-phase reserve.
4. AI service: downloads reference video from TikTok, extracts one
   representative frame for outfit analysis.
5. Outfit analysis → Gemini 2.0 Flash (multimodal, cheapest viable option
   for one-shot vision tasks) → structured prompt following
   `OUTFIT_ANALYSIS_PROMPT`.
6. Reference image generation via Modal `img_gen` using the character's
   LoRA + the composed outfit prompt + `REFERENCE_IMAGE_PROMPT`.
7. Video generation via Modal `video_gen` with the reference image, the
   motion-source video, and `VIDEO_MOTION_PROMPT`.
8. Final video uploaded to `generations` bucket; webhook closes the job.
9. UI polls (SSE) for status and reveals "Review" screen with
   before/after and Approve / Regenerate / Discard actions.

### 6.4 Why ComfyUI inside Modal, not alongside it

ComfyUI's dependency footprint (PyTorch, xformers, CUDA, node packs) is
measured in gigabytes. Running it on Railway means:

- Pinned GPU machines (Railway does offer GPU, but pricing is per-hour
  always-on, not per-second).
- Image build times > 5 minutes per deploy.
- Cold starts > 60s.

Modal solves all three: you bake the image once (`modal deploy`), Modal
caches it across invocations, and cold-start recovery is on the order of
2–5 seconds for a pre-warmed container. Per-second billing matches our
bursty workload exactly.

---

## 7. Frontend architecture

- **Framework:** Next.js 15 (App Router, React 19, Server Actions).
- **Styling:** Tailwind v4 + a custom token layer (`design-tokens.css`).
- **Design system:** Claude-inspired. Warm paper (`#F5F0E8`), coral
  accent (`#D97757`), soft black (`#1F1E1C`). Serif for display
  (Tiempos Headline / Source Serif 4 as fallback), sans for UI (Styrene
  via Inter fallback). See `apps/web/docs/design-system.md`.
- **Icons:** No third-party icon library — **lucide-react is explicitly
  banned.** Icons are hand-drawn SVG in `components/icons.tsx`. This
  keeps the bundle small and the look distinctive.
- **State:** TanStack Query for server state; no global client store
  (Zustand/Redux explicitly avoided). URL state via `useSearchParams`.
- **Forms:** React Hook Form + Zod resolvers pulling schemas from
  `@remy/shared`.
- **Uploads:** resumable presigned PUT (`@supabase/storage-js`) with
  client-side compression for images > 5MP.
- **Realtime:** SSE for job progress on the job page; TanStack Query
  polling (5s) for the dashboard.
- **Auth:** `@supabase/ssr` — server-side session on every request; no
  client-only auth drift.
- **Error UX:** Boundary per route segment with a
  "Copy diagnostics" button (request_id + trace).

---

## 8. Security

- All browser traffic over HTTPS (Vercel + Railway both terminate TLS).
- Service-to-service traffic uses `INTERNAL_SERVICE_TOKEN` + HMAC
  signatures on webhooks.
- Stripe webhooks verified with their signing secret.
- Supabase Storage uses short-lived (5 min) signed URLs for uploads and
  long-lived (7 days max) signed URLs for user-owned generations.
- CSP: strict on web; `frame-ancestors 'none'`; `default-src 'self'`.
- Rate limiting on `/v1/auth/*` (5/min/IP) and `/v1/generate` (30/min/user)
  via Redis token bucket.
- Admin endpoints gated by `ADMIN_EMAILS` check **plus** a role column.
- No PII beyond email + name is stored. Generated content is private by
  default.

---

## 9. Observability

- **Metrics** — OTLP traces exported to BetterStack (Node + Python both
  instrumented). A handful of business metrics (`credits_reserved_total`,
  `jobs_failed_total`) scraped by Prometheus.
- **Logs** — structured JSON, shipped via stdout (Railway and Vercel
  both forward to BetterStack).
- **Errors** — Sentry on web and Node API; Python uses `sentry-sdk`.
- **Uptime** — BetterStack heartbeats `/healthz` on api + ai every 60s.
- **Cost** — a daily cron emails `stripe:usage` summary to admins.

---

## 10. Testing strategy

| Layer | Tool | What |
|---|---|---|
| shared | vitest | pure functions (credits math, refund rules) |
| api | vitest + supertest | routes with Prisma pointed at a throwaway schema |
| api | vitest | credits atomicity (parallel reserves, crash mid-TX) |
| ai | pytest | prompt rendering, orchestration with mocked Modal |
| web | vitest + React Testing Library | component tests |
| e2e | Playwright | signup → character → trend → generate → review |

Test DB uses Supabase's local Postgres, schema reset per test via
`prisma migrate reset --skip-seed --force`.

---

## 11. Deployment

- **Vercel** — `apps/web` is a Vercel project linked via `vercel.json`.
  Preview deploys on every PR; production on `main`.
- **Railway** — one Railway project with three services: `api`, `ai`,
  `redis`. Each service pulls from the monorepo path specified in
  `railway.json`. Environments: `production` and `preview` (on `develop`).
- **Modal** — `pnpm modal:deploy` pushes all Modal apps using token from
  CI secrets. We deploy a new version on every tag `v*`.
- **Supabase** — migrations applied via `supabase db push` in CI; the
  production project is referenced by `SUPABASE_PROJECT_REF`.
- **Stripe** — products / prices seeded via `scripts/stripe-sync.ts` on
  first deploy and whenever `CREDIT_COSTS` or `PLANS` changes.

---

## 12. Implementation phases (for ongoing work)

**Phase 1 — Infrastructure (DONE in this revision)**
Monorepo, CI, Supabase, Railway, Vercel, Modal, Stripe wiring.

**Phase 2 — Core product (DONE in this revision)**
Auth, onboarding, credits, Stripe billing, character upload,
LoRA training, trend ingest, suggested feed, generate pipeline,
job tracking, library, admin.

**Phase 3 — Operations (DONE in this revision)**
CI/CD pipelines, env separation, observability, alerts, cost
tracking cron, backup (Supabase's daily PITR).

**Phase 4 — Post-MVP (tracked in the roadmap in README)**
Team collaboration, export to TikTok directly, iOS companion app,
hosted ComfyUI panel for power users.
