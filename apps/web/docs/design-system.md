# Remy — Design system

A small, deliberate set of tokens and patterns inspired by Claude's
product surface. The goal is a product that feels *crafted* rather than
generated — warm, typographic, calm.

## Palette

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-paper` | `#F5F0E8` | `#1B1A17` | Page background |
| `--color-paper-2` | `#EBE5DB` | `#24231F` | Card background |
| `--color-paper-3` | `#D9D2C4` | `#2E2D28` | Pressed / nested surface |
| `--color-ink` | `#1F1E1C` | `#F4EFE6` | Primary text, primary buttons |
| `--color-ink-2` | `#4B4A47` | `#D8D2C6` | Secondary text |
| `--color-ink-3` | `#76736E` | `#A8A29A` | Tertiary text, metadata |
| `--color-coral` | `#D97757` | `#E8906F` | Accent, focus, primary CTA highlight |
| `--color-coral-ink` | `#9D4A32` | `#D97757` | Accent text on light surfaces |
| `--color-leaf` | `#5A7A5E` | — | Success |
| `--color-amber` | `#B78B3F` | — | Warning |
| `--color-rose` | `#B0554A` | — | Error |

## Typography

- **Display / headings** — Source Serif 4 (Tiempos Headline fallback
  locally). Medium weight at the top of pages; lighter body serif can
  appear in blockquotes.
- **UI / body** — Inter with `ss01`, `cv11`, `calt` features on.
- **Monospace** — JetBrains Mono. Only in logs, code, and the one-off
  `kbd` tag.

Rules:

- Display text never exceeds 4xl on cards, 6xl on hero sections.
- Use italic for accented display phrases sparingly (one per page).
- Body never goes below 13px.

## Motion

- Default ease: `cubic-bezier(.22,.61,.36,1)` (defined as `ease-claude`).
- Durations: `120ms` (hover/tap), `200ms` (surface changes), `280ms`
  (modal in/out).
- No bouncy springs. No bounce on popover/modal enter.

## Icons

Hand-drawn, 24×24 grid, 1.6 stroke, round linecaps. Maintained in
[`apps/web/src/components/icons.tsx`](../src/components/icons.tsx).
**lucide-react is not a dependency and will not be added** — see
[ADR 0002](../../../docs/adr/0002-claude-design-system.md).

When adding a new icon:

1. Design at 24×24.
2. Match the stroke width of existing icons.
3. Export as a React component wrapping the shared `base()` helper.
4. Add an entry to the barrel so it can be imported without path drift.

## Focus

- Always `outline: 2px solid var(--color-coral); outline-offset: 2px`.
- Never remove focus styles. If a custom focus is needed, match the
  coral treatment.

## Surfaces

- Cards: `shadow-card`, `border-line`, `bg-paper-2`.
- Raised: `shadow-raised`, `border-line-2`.
- Pop (modals/toasts): `shadow-pop`, paper surface with blurred overlay.

Never use pure white. Never use pure black. Always reach for a palette token.
