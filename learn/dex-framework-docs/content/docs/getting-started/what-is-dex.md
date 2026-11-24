---
title: "What Is Dex"
description: "Overview and key concepts of the Dex framework"
---

# What is Dex?

Dex is a **composable, Bun-first full-stack framework** paired with a **Native Go CLI (`dex`)** (<8 MB standalone binary, <5ms startup). It combines file-based React routing, Elysia server primitives, ESM code splitting, SSG prerendering, and typed OpenAPI API client generation without hidden magic.

## Why Dex?

| Problem | Dex Solution |
|---------|--------------|
| Slow JS CLI startup | Native Go CLI (`dex`) — under 8 MB binary, <5ms startup |
| Complex routing configs | File-based routing — `web/pages/` maps directly to routes |
| Build tool fatigue | Zero-config Bun bundling with ESM code splitting and `?v=<hash>` cache busting |
| Confusing layouts | Explicit `web/layouts/` files that compose cleanly |
| Untyped backend calls | `@dex/pie` generates typed route trees from JSON or YAML OpenAPI specs |
| Deployment friction | Compiles to a standalone Bun server executable (`build/server`) |

## Key Features

- **Native Go CLI**: Fast scaffolding (`dex scaffold`), upstream syncing (`dex sync`), template inspection (`dex template`), multi-version switching (`dex use`), and OpenAPI codegen (`dex pie generate`).
- **File-based routing (`@dex/router`)**: `web/pages/about.tsx` maps to `/about` with concurrent React transitions, intent prefetching, `RouterErrorBoundary`, and subdomain mounting.
- **Elysia server helpers (`@dex/server`)**: Path-traversal-safe `/assets/*` serving, SSG-aware SPA fallback, canonical subdomain redirects, Google variable fonts injection, and SSE dev reload.
- **Typed API client (`@dex/pie`)**: Framework-agnostic navigable route tree generated from JSON or YAML OpenAPI specs with idempotent retry safety.
- **Dev & build orchestration (`@dex/dev`)**: Parallel dev watchers (`routes:watch`, `styles:watch`, `client:watch`, `server:dev`) and production builds with SSG prerendering.

## How It Compares

| Framework | Runtime & CLI | Routing | Config |
|-----------|---------------|---------|--------|
| Next.js | Node.js / Rust tooling | File-based | `next.config.js` |
| Dex | Native Go CLI + Bun + Elysia | File-based | `dex.config.ts` (optional) |
| Remix | Node.js / Vite | Convention-based | `vite.config.ts` |
| Express | Node.js | Manual | Manual |

## Project Structure

```text
my-app/
├─ .dex/
│  └─ metadata.json               # Template version & sync metadata
├─ dex.config.ts                  # Optional framework configuration
├─ package.json                   # Workspace dependencies & scripts
├─ core/
│  ├─ api/
│  │  └─ generated.ts             # Generated @dex/pie OpenAPI route tree
│  ├─ bootstrap/
│  │  ├─ dev.ts                   # Dev supervisor entrypoint
│  │  ├─ build.ts                 # Production build entrypoint
│  │  ├─ scripts.ts               # Task runners (runDev, runBuild, runPrerender)
│  │  └─ web.tsx                  # Client hydration / FileRouter mount
│  ├─ router/.generated/          # Auto-generated routes.ts, layouts.ts, manifest.json
│  └─ runtime/
│     ├─ app/index.ts             # Dev Elysia server entrypoint
│     └─ server/prod.ts           # Production server entrypoint (compiled to build/server)
├─ lib/
│  └─ api.ts                      # Userland @dex/pie client instance
├─ routes/
│  └─ api/                        # Elysia API route handlers
├─ packages/                      # Local workspace packages (router, server, dev, pie)
└─ web/
   ├─ pages/                      # File-based React pages (index.tsx -> /)
   ├─ layouts/                    # Shared & named layouts (global.tsx, etc.)
   ├─ public/                     # index.html & dev public assets
   └─ styles/                     # Tailwind CSS entrypoint (index.css)
```

## Ready to Try It?

[Proceed to Your First App](./your-first-app) to scaffold and run your first Dex application.
