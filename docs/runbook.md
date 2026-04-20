# Runbook

What to do when something is broken at 3am. Keep it short and actionable.

## Symptoms → first move

| Symptom | First move |
|---|---|
| `/healthz` fails on api | Railway logs → most likely DB unreachable; check Supabase status |
| Users see "Setting up your studio…" indefinitely | Supabase `on_auth_user_created` trigger failed; re-apply migration |
| Generate clicks but nothing queues | Redis connection — Railway internal network blip, usually self-heals <60s |
| Job stuck in `running` | AI service webhook missed; `POST /v1/jobs/:id/settle` to reconcile |
| Credit balance looks wrong | Compare `credit_balances.current_balance` to `sum(credit_transactions.amount where status='applied')`; off = bug, open incident |
| Stripe webhook events pile up "unprocessed" | Stripe signing secret rotated without redeploy; update `STRIPE_WEBHOOK_SECRET` |
| Modal function cold-starts > 60s | First invocation after image rebuild — pre-warm by running once via `modal run` |
| TikTok ingest failing | Check RapidAPI quota; `MOCK_TIKTOK=1` is fallback in dev |

## Credit ledger invariants

All must hold at all times:

1. `current_balance >= 0`
2. `pending_balance >= 0`
3. `sum(credit_transactions.amount where status='applied' and user_id=X) = credit_balances.current_balance - credit_balances.pending_balance` — wait, actually the sum of applied txs = current_balance. pending is a separate counter incremented on reserve and decremented on settle. Treat a mismatch here as a **ledger corruption incident**.

Reconcile query:

```sql
select
  b.user_id,
  b.current_balance,
  coalesce(sum(t.amount) filter (where t.status='applied'), 0) as applied_sum,
  b.pending_balance,
  coalesce(sum(-t.amount) filter (where t.status='pending' and t.kind='usage_reserve'), 0) as pending_sum
from credit_balances b
left join credit_transactions t on t.user_id = b.user_id
group by b.user_id, b.current_balance, b.pending_balance
having
  b.current_balance <> coalesce(sum(t.amount) filter (where t.status='applied'), 0)
  or b.pending_balance <> coalesce(sum(-t.amount) filter (where t.status='pending' and t.kind='usage_reserve'), 0);
```

Any rows returned → incident.

## Operational endpoints

- `/healthz` — liveness (api + ai)
- `/readyz` — readiness
- `POST /v1/jobs/:id/settle` — force-settle a stuck job (auth required; ok for users' own jobs)
- `POST /v1/admin/credits/adjust` — manual credit adjustment (admin)

## Rollback

- Vercel: instant via the "Promote" button on any previous deploy
- Railway: revert via the Deploys tab
- Modal: `modal deploy` at a previous git SHA
- Supabase migrations: `supabase migration squash` + revert SQL (only for non-destructive migrations)

## Dependencies we rely on

| Dep | Impact if down | Mitigation |
|---|---|---|
| Supabase Auth | No logins | Stripe Checkout still works for existing sessions |
| Supabase DB | Full outage | Hard dependency; wait for SLA |
| Supabase Storage | No uploads, no playback | Library pages still render metadata |
| Stripe | No payments | Reads from mirrored tables still work |
| Modal | No generations | Queue backs up; show `upstream_unavailable` |
| Gemini | No outfit analysis | Fall back to user-provided outfit override |
| RapidAPI TikTok | No fresh trends | Keep serving cached `SuggestedVideo`s |
