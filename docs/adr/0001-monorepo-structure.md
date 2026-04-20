# ADR 0001 — Monorepo Structure

**Status:** Accepted
**Date:** 2026-04-20

## Context

Four services share types (credit costs, job shapes, prompt templates,
error codes). The Node API and the Next.js web need these in TypeScript;
the FastAPI AI service needs them in Python.

## Decision

pnpm workspace monorepo with one TypeScript package (`@remy/shared`)
that is the single source of truth. A small code-gen script emits a
matching Python module (`services/ai/app/shared.py`) on every change. We
accept the duplication cost for Python because it's a 200-line file and
the gen script runs in CI.

## Alternatives considered

- **Polyrepo + versioned npm/pypi packages.** Too much version skew for a
  two-engineer MVP.
- **Turborepo.** Adds caching but we don't have the pipeline size to
  justify it yet. Migrating is trivial later.
- **Nx.** Overkill.

## Consequences

- One `pnpm install` sets up everything TS.
- Python code-gen must run on any shared package change — enforced in CI.
- Adding a new language service follows the same pattern.
