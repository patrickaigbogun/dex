---
title: "Development"
---

# Development

`@dex/dev` orchestrates Dex's multi-process dev watcher, SSG prerenderer, code-split client bundler, and 6-stage production build pipeline.

## Topics

- [Watch Process](./watch-process) — `dexDev`, `spawnGroup`, and the 6-stage `dexBuild` pipeline
- [Dev Reload](./dev-reload) — Live browser reload via SSE in development

## Quick Start

```bash
# Start all 4 dev watchers
bun run dev
# or
dex start

# Run the 6-stage production build
bun run build
# or
dex build
```

## Exported API (`@dex/dev`)

| Export | Purpose |
|---|---|
| `dexDev(opts)` | Generates initial routes, injects public env defines, and starts 4 concurrent watchers via `spawnGroup`. |
| `dexBuild(opts)` | Executes the 6-stage production build pipeline (routes, prepare, prerender, CSS, client + hash busting, compiled server). |
| `dexPrepareBuild(opts)` | Cleans and creates `build/`, `build/assets/`, and copies `web/public/index.html` to `build/index.html`. |
| `dexPrerender(opts)` | Prerenders static `ssg` routes with `<RouterContext.Provider>`, `<head>` metadata, and Google Fonts into `build/__ssg/`. |
| `dexBuildClient(opts)` | Runs `bun build core/bootstrap/web.tsx --splitting --format esm --minify` into `build/assets/`. |
| `spawnGroup(tasks)` | Runs concurrent child processes with color-coded log prefixes and coordinated signal/error shutdown. |
