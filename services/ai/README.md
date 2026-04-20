# Remy — AI service

Stateless orchestrator. Runs ComfyUI workflows via Modal, talks back to
the Node API over signed webhooks. Deployed on Railway.

## Run locally

```bash
cd services/ai
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload --port 8001
```

Tests:

```bash
uv run pytest
```

## Endpoints

- `GET  /internal/health`
- `POST /internal/jobs` — accepts a `JobDispatch`, runs the matching pipeline
- `POST /internal/prompts/outfit` — Gemini-backed outfit analysis
- `POST /internal/jobs/{id}/cancel`

All `/internal/*` endpoints require the `X-Remy-Token` header (shared
secret with the API).

## Pipelines

- `lora_training` — preprocess images → Modal `lora_train` → post weights key back
- `video_generation` — analyze outfit (Gemini) → Modal `img_gen` → Modal `video_gen` → post video key back
- `video_regeneration` — same as above, reuses reference image if possible
- `trend_ingest` — TikTok fetch → rank → POST to `/v1/internal/trends/ingest-result`

## Mock mode

- `MOCK_MODAL=1` → Modal calls return deterministic fake keys, pipeline
  runs end-to-end in ~100ms. Used for tests and local dogfooding.
- `MOCK_TIKTOK=1` → TikTok ingest returns seeded fake items.
- `GEMINI_API_KEY=` (empty) → outfit analysis returns a canned prompt.
