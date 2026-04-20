# ADR 0002 — Claude-Inspired Design System

**Status:** Accepted
**Date:** 2026-04-20

## Context

Requirement: "use Claude design, no lucide icons". The product is for
creators — it must feel crafted, not templated.

## Decision

Build a handcrafted design system inspired by Anthropic's Claude product
surface:

- **Palette:** warm off-white `#F5F0E8` (paper), near-black `#1F1E1C`,
  coral accent `#D97757`, muted slate secondaries, soft success/danger.
- **Typography:** serif display (Tiempos Headline → Source Serif 4
  fallback), sans UI (Styrene → Inter fallback).
- **Icons:** all icons are hand-drawn SVG in `components/icons.tsx`.
  **lucide-react is not a dependency and will not be added.** Bundle
  impact of lucide at 1.5k+ icons is ≈ 30KB stripped; ours is ≈ 4KB and
  distinctive.
- **Motion:** 120ms–280ms easings, `cubic-bezier(.22,.61,.36,1)`; no
  bouncy springs; generous static states.
- **Surfaces:** paper texture on primary surface; subtle vignette on
  modals; `1px` hairlines in warm grey, not the default black.

## Alternatives considered

- **shadcn/ui + lucide**. Banned explicitly. Even if it were allowed,
  the default look is too common.
- **Mantine / MUI / Chakra**. Fast to ship but opinionated away from
  what we want.
- **Radix primitives only**. Accepted — we use Radix for behavioural
  primitives (Dialog, DropdownMenu, Tooltip) and style everything
  ourselves.

## Consequences

- More design work up front; pays back in a memorable product.
- We own all visual components — breakage is our responsibility.
- Icons must be audited for consistency whenever added.
