# Remy — API service

Hono on Node 20, Prisma, BullMQ. Owns auth verification, credits,
billing, character CRUD, trends, and job lifecycle.

## Run locally

```bash
cd apps/api
cp .env.example .env
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Endpoints

See [ARCHITECTURE § 3.1](../../ARCHITECTURE.md#31-web--api).

## Dev notes

- Workers are started in-process when `REMY_DISABLE_WORKERS` is unset.
  In production we run API and workers as the same process (Railway
  doesn't price workers separately and the throughput is comfortable).
- Every route handler goes through `request-id` → `logger` → `auth` →
  `rate-limit` → handler → `error`. Don't reinvent.
- Credits: all reservations happen inside `SERIALIZABLE` transactions
  via `CreditsService`. Don't touch `credit_transactions` or
  `credit_balances` directly.
- Webhooks are signed (HMAC for internal, Stripe signature for Stripe)
  and idempotent via the `webhook_events` table's uniqueness constraint.
