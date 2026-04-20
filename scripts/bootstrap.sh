#!/usr/bin/env bash
# Bootstrap the local dev environment. Run once after cloning.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Remy bootstrap"
echo

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "! Missing: $1 — $2"
    return 1
  fi
}

missing=0
need node   "Install Node 20+ (e.g. nvm use)" || missing=1
need pnpm   "Install pnpm: npm i -g pnpm"     || missing=1
need python3 "Install Python 3.11+"           || missing=1
need uv     "Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh" || missing=1
need docker "Install Docker"                  || missing=1
need supabase "Install Supabase CLI: brew install supabase/tap/supabase" || missing=1
need stripe "Install Stripe CLI (optional for webhooks): brew install stripe/stripe-cli/stripe" || true
if [[ $missing -eq 1 ]]; then
  echo
  echo "Fix the missing tools above, then rerun."
  exit 1
fi

echo "==> Installing JS deps"
pnpm install

echo "==> Installing Python deps (AI service)"
( cd services/ai && uv sync )

echo "==> Copying .env templates"
for f in .env.example apps/api/.env.example apps/web/.env.example services/ai/.env.example; do
  dest="${f%.example}"
  if [[ ! -f "$dest" ]] && [[ -f "$f" ]]; then
    cp "$f" "$dest"
    echo "  created $dest"
  fi
done

echo "==> Starting Supabase (db, auth, storage)…"
supabase start || echo "(Supabase may already be running — that's fine.)"

echo "==> Starting Redis…"
docker compose -f infra/docker/compose.dev.yml up -d redis

echo "==> Running Prisma migrations"
pnpm --filter @remy/api db:generate
pnpm --filter @remy/api db:migrate

echo "==> Seeding demo data"
pnpm --filter @remy/api db:seed

echo
echo "✓ Bootstrap complete."
echo
echo "Next:"
echo "  pnpm dev             # starts web + api"
echo "  pnpm dev:ai          # starts FastAPI in another terminal"
echo "  stripe listen --forward-to localhost:8000/v1/webhooks/stripe"
echo
