# Credits & Pricing

Canonical credit costs live in
[`packages/shared/src/credits.ts`](../packages/shared/src/credits.ts). This
document explains **why** each number was chosen — it is the diffable
pricing policy and the reviewer cares about rationale.

## Per-action cost

| Action | Credits | Rationale |
|---|---:|---|
| LoRA training (Character creation) | **200** | 40–60 min of A10G / L40S. Modal pricing ~ $0.001/sec on A10G → roughly $2–3 compute. Sold for $8 equivalent at Starter plan rate → ≈3x margin covering storage + support. |
| Reference image | **8** | One Flux or SDXL generation (~30s on L40S). Batched with outfit analysis for a single trip. |
| Outfit image (extra still) | **5** | Same as reference image but no LoRA composition pass. |
| Video — short (≤ 5s) | **40** | Wan 2.2 / CogVideoX on H100 at 720p: ~3–5 min. ~$1.50 compute. 40 credits ≈ $1.60 at Starter rate → tight margin by design for acquisition. |
| Video — long (≤ 15s) | **90** | Linear scaling plus non-linear overhead for temporal consistency. |
| Video regeneration | **30** | Reuses the reference image → skips one step. |
| Trend ingest | **0** | Loss-leader; we want lots of sources. |
| Deep trend analysis | **3** | Claude API call against the user's entire feed. |

## Plans

| Plan | Monthly price | Monthly credits | Rollover cap | Effective $/credit |
|---|---:|---:|---:|---:|
| Starter | Free | 30 | 30 | — |
| Creator | $19 | 300 | 600 | $0.063 |
| Studio | $79 | 1,500 | 3,000 | $0.053 |
| Scale | $299 | 6,000 | 12,000 | $0.050 |

Rollover caps are deliberate — unused credits accumulate (so a vacation
doesn't cost you), but not unboundedly (so a dormant seat doesn't
explode the ledger). At the cap, new grants overwrite rolled-over
credits on renewal.

## Top-up packs

| Pack | Credits | Price | $/credit |
|---|---:|---:|---:|
| Pack 100 | 100 | $12 | $0.120 |
| Pack 500 | 500 | $49 | $0.098 |
| Pack 2000 | 2000 | $149 | $0.075 |

Top-ups never expire.

## Refund policy

Automatic, no support ticket needed:

- Failure before the job starts running → **full refund**.
- Failure during rendering → **50% refund**, 50% retained for compute.
- User cancellation before running → **full refund**.

Bug-induced failures (exceptions in our code, not Modal/ComfyUI) are
refunded fully and flagged for engineering.

## Taxation

Stripe Tax is enabled on all checkouts. VAT / sales tax is added at
checkout in supported jurisdictions.
