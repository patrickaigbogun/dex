# Dex roadmap

Dex is a composable, Bun-first stack for building offline-friendly full-stack apps with:
- file-based routing for React
- a small Elysia server with SPA fallback and dev reload
- minimal build/dev scripts that are easy to understand and extend

## Near-term (0.x)

- `@dex/router`:
  - stable public API for `FileRouter`, hooks, and `Link`
  - CLI: `dex-router generate` + `dex-router watch`
  - docs for route conventions, layouts, metadata

- `@dex/server`:
  - hardened static asset serving helper
  - SPA fallback helper
  - dev reload (SSE) helper

- `@dex/dev`:
  - small process supervisor for dev watch tasks

- Templates:
  - `templates/starter` (minimal SPA + server)

## Mid-term

- First-class template scaffolding (`create-dex` CLI)
- Optional persistence/sync packages (e.g. `@dex/storage-*`)
- Optional UI primitives package (kept separate from core)

## Principles

- Composability over monoliths: packages should stand alone.
- Explicitness over magic: generated files are readable and predictable.
- Bun-first: optimized for Bun workflows, but portable where practical.
