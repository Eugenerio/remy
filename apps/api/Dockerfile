# syntax=docker/dockerfile:1.7
FROM node:20.11-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
WORKDIR /app

# ----- deps -----
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/config/package.json packages/config/
RUN pnpm install --frozen-lockfile=false --filter=@remy/api...

# ----- build (Prisma client only; runtime uses tsx) -----
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/api apps/api
RUN pnpm --filter @remy/api db:generate

# ----- runtime -----
FROM node:20.11-bookworm-slim AS runtime
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/packages ./packages
COPY --from=build /app/node_modules ./node_modules

EXPOSE 8000
# tsx runs TS source directly — no separate compile step. This keeps the
# shared package consumable as .ts without needing Node ESM's strict .js
# extension requirement.
CMD ["pnpm", "--filter", "@remy/api", "start"]
