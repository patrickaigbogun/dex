---
title: "Production Build"
---

# Production Build

Create a production-ready build of your Dex app.

## Build

```bash
dex build
# or
bun run build
```

This executes:
1. `core/bootstrap/build.ts` via `dexBuild`
2. Route generation (`dex-router generate`)
3. Client bundling with ESM code-splitting (`build/assets/chunks/[name]-[hash].js`) and `?v=<hash>` cache-busting
4. Server binary compilation (`core/runtime/server/prod.ts` → `build/server`)
5. SSG prerendering (`dexPrerender`) and asset copying

## Output Layout

```
build/
├─ server               # Compiled executable server binary
├─ index.html           # SPA entry point
├─ __ssg/               # Pre-rendered static pages
├─ assets/              # Static assets and ESM chunks
│  ├─ client.js
│  ├─ styles.css
│  └─ chunks/           # Code-split ESM chunks ([name]-[hash].js)
└─ core/
   └─ router/.generated/
      ├─ routes.ts
      └─ layouts.ts
```

## Run Locally

```bash
cd build
PORT=7990 ./server
```

## See Also

- [Production Server](../server/production) — Running in prod
- [Platforms](./platforms) — Deploying to specific platforms