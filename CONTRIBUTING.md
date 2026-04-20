# Contributing

## Before you start

1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) — it's the map.
2. Read [docs/adr/](./docs/adr/) — these are decisions, not suggestions.
   If you want to revisit one, write an ADR supplement (`NNNN-supplement-*.md`).
3. Run `./scripts/bootstrap.sh` once.

## House rules

- **lucide-react is banned.** Add icons to `apps/web/src/components/icons.tsx`
  by hand. See [ADR 0002](./docs/adr/0002-claude-design-system.md).
- **Don't bypass the credits service.** Every credit-consuming endpoint
  must go through `CreditsService.reserve` / `.settle` / `.cancelReservation`.
- **Don't mutate `credit_transactions`.** They're append-only. The DB
  trigger will reject any update that violates that.
- **Don't call Prisma from the AI service.** It doesn't have DB creds.
  Everything flows through the API's `/v1/internal/*` endpoints.

## Workflow

```bash
git checkout -b feature/my-thing
# …code, tests, format…
pnpm test
pnpm typecheck
pnpm format
git commit -m "feat: add X"
git push origin feature/my-thing
```

PRs are auto-CI'd. The `ci.yml` workflow blocks merge on:

- `pnpm typecheck`
- `pnpm test`
- `pnpm format:check`
- `uv run pytest` (for Python changes)
- `uv run ruff check` (for Python changes)

## Adding a new credit-consuming action

1. Add the cost to `packages/shared/src/credits.ts`.
2. Add a label to `CREDIT_ACTION_LABELS`.
3. Bump the pricing doc at `docs/pricing.md`.
4. In the API route, call `CreditsService.reserve` in a `Serializable`
   transaction, then enqueue the BullMQ job.
5. Ensure the AI pipeline returns `status=completed|failed` via the
   `/v1/webhooks/ai` endpoint; the API settles automatically.

## Adding a new UI page

1. Drop it under `apps/web/src/app/(app)/<name>/page.tsx`.
2. Reuse `<PageHeader>`, `<Card>`, `<Button>` — don't introduce a new
   design primitive without an ADR.
3. If it needs data, call `apiFetch()` from a Server Component.
4. Keep Client Components small — only the interactive parts.

## Adding a new Modal function

1. Define it in `services/modal/app.py` with a specific GPU type.
2. Drop the workflow JSON under `services/comfyui/workflows/`.
3. Add a client method to `services/ai/app/modal_client.py` with a
   matching mock path so local dev stays fast.
4. Redeploy with `modal deploy services/modal/app.py`.
