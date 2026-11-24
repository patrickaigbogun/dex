---
title: "Core Concepts"
---

# Core Concepts

Core concepts you need to understand before building with Dex.

## Topics

- [File-Based Routing](./file-based-routing) — How `web/pages/` maps to routes and `importPage` loaders
- [Pages and Layouts](./pages-and-layouts) — Layout composition, `<Outlet>`, and page metadata
- [Configuration](./configuration) — Customize paths, subdomains, Google fonts, and API codegen
- [Build Process](./build-process) — ESM code splitting, SSG prerendering, and the standalone Bun server executable
- [Dev vs Production](./dev-vs-prod) — Runtime differences between `dex start` and `dex start -p`

## Learning Path

1. **Start with routing** — understand how files in `web/pages/` become sorted route records
2. **Add layouts and metadata** — wrap pages with `GlobalLayout` and named layouts in `web/layouts/`
3. **Configure your app** — customize `dex.config.ts` for subdomains, fonts, rendering strategy, and `@dex/pie`
4. **Build and deploy** — produce a code-split client bundle, SSG HTML, and `build/server`
