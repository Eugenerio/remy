# ADR 0003 — Modal for GPU Compute

**Status:** Accepted
**Date:** 2026-04-20

## Context

ComfyUI needs GPUs. Options evaluated: AWS EC2 GPU + ECS, GCP GKE +
GPU node pool, Runpod serverless, Lambda Labs reserved, Modal.

## Decision

Modal. Reasons:

- **Per-second billing.** Our workload is bursty — training bursts,
  video generation bursts. Hourly-billed reserved GPUs are wrong.
- **Cold start.** Modal pre-warmed containers boot in 2–5s. Cloud
  alternatives are 30–90s. For a "one-click generate" product, this is
  the difference between acceptable and not.
- **DX.** `@modal.function(gpu="H100", image=image)` and Modal handles
  scaling, logging, lifecycle. No Kubernetes, no Terraform.
- **No quota dance.** AWS/GCP require quota increases for every new GPU
  type; approval time is days to weeks. Modal has H100/A10G/L40S
  available immediately.

## Alternatives considered

- **Runpod serverless.** Similar model, slightly cheaper for sustained
  load, worse DX for Python-heavy code paths. Evaluate at ≥ $2k/mo.
- **Lambda Labs reserved.** Lowest $/hour for high utilisation. Wrong
  shape for MVP — no auto-scale, no serverless, fixed cost at idle.
- **Self-hosted H100 server.** Out of scope for MVP; may return for
  sustained production load.

## Consequences

- Vendor lock to Modal's SDK in `services/modal/*`. Contained: the AI
  service talks to Modal behind an abstraction; swap cost is ~2 days.
- Monthly bill scales linearly with usage — comes out of credit revenue.
- Cold-start variability (2s–30s worst case) → the UI shows "warming
  up" copy to set expectations.
