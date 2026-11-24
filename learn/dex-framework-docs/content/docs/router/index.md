---
title: "Router"
---

# Router

`@dex/router` is Dex's file-based React router, route/layout code generator, and client runtime (`@dex/router/client`). In v0.2.6 it provides concurrent route transitions, built-in error boundaries, subdomain routing, SSG prerender context, expanded page metadata, and deterministic route precedence.

## Topics

- [Routing Rules](./routing-rules) — File-based routing patterns, ignore rules, and precedence
- [Dynamic Routes](./dynamic-routes) — Capturing `[param]` and `[...catchAll]` URL segments
- [Layouts](./layouts) — Global layouts, named layouts, `<Outlet />`, and page metadata
- [Client Navigation](./client-navigation) — `<Link />`, `<FileRouter />`, `<RouterErrorBoundary />`, hooks, subdomain routing, and SSG context
- [Reference](./reference) — Complete `@dex/router` and `@dex/router/client` API reference

## How It Works

1. **Generate** — `generateFsRoutes` and `generateLayouts` scan `web/pages/` and `web/layouts/` (ignoring `_`-prefixed entries and symbolic links) to emit `core/router/.generated/routes.ts`, `manifest.json`, and `layouts.ts`.
2. **Prerender & Serve** — `dexPrerender` and `@dex/server` match static routes, provide `RouterContext` via `createStaticRouterState`, and serve prerendered HTML or SPA fallback.
3. **Navigate** — `<FileRouter />` matches routes client-side, loads page and layout modules with error-evicting caches, commits updates inside React `useTransition`, and wraps views in `<RouterErrorBoundary />`.

## Quick Example

```
web/pages/
├─ index.tsx               # /
├─ about.tsx               # /about
├─ _helpers/format.ts      # Ignored (_ prefix)
└─ users/[id].tsx          # /users/:id
```

## CLI Commands

```bash
# Generate routes and layouts once
bunx --bun dex-router generate

# Watch pages and layouts during development
bunx --bun dex-router watch

# Start full dev environment (includes router watcher)
bun run dev

# Build for production (regenerates routes + SSG prerendering)
bun run build
```

## See Also

- [File-Based Routing](../../core-concepts/file-based-routing) — Core concept
- [How Dex Works](../../getting-started/how-dex-works) — Mental model
