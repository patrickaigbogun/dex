# Dex roadmap

Dex is a composable, Bun-first stack for building offline-friendly full-stack apps with:
- file-based routing for React
- a small Elysia server with SPA fallback and dev reload
- minimal build/dev scripts that are easy to understand and extend

## Near-term (0.x)

### Done

- [x] `@dex/router` CLI: `dex-router generate` + `dex-router watch`
- [x] `@dex/router` docs for route conventions, layouts, metadata

- [x] `@dex/server` hardened static asset serving helper
- [x] `@dex/server` SPA fallback helper
- [x] `@dex/server` dev reload (SSE) helper

- [x] `@dex/dev` small process supervisor for dev watch tasks

- [x] Templates: `templates/starter` (minimal SPA + server)

### In progress

- [ ] `@dex/router`: stabilize public API for `FileRouter`, hooks, and `Link`
- [ ] Starter template: consolidate runtime entrypoints
  - [ ] Keep a single root file: `templates/starter/app.ts` (composition only)
  - [ ] Move listen/build entrypoints into a `runtime/` directory
  - [ ] Avoid any file named `server*`
  - [ ] Ensure `export type Api` (for `@dex/pie`) is available from `app.ts`

## Mid-term

- First-class template scaffolding (`create-dex` CLI) (partial: `dex scaffold` exists)
- Host the Dex docs site using Dex itself (dogfooding)
- Built-in documentation pages:
  - Treat `web/pages/docs/**/*.md` as routable pages (and ignore `.md` elsewhere)
  - Compile Markdown to renderable UI at build-time via a new `@dex/docs` package
- Optional persistence/sync packages (e.g. `@dex/storage-*`)
- Optional UI primitives package (kept separate from core)

## Principles

- Composability over monoliths: packages should stand alone.
- Explicitness over magic: generated files are readable and predictable.
- Bun-first: optimized for Bun workflows, but portable where practical.
