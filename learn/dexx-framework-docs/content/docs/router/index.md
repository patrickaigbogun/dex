---
title: "Router"
---

# Router

Dex's file-based router handles routing, layouts, and client-side navigation.

## Topics

- [Routing Rules](./routing-rules) — File-based routing patterns
- [Dynamic Routes](./dynamic-routes) — Capturing URL parameters
- [Layouts](./layouts) — Layout composition
- [Client Navigation](./client-navigation) — Link, useRouter, useParams

## How It Works

1. **Generate** — Scans `web/pages/` and creates `routes.ts`
2. **Serve** — Server uses generated routes
3. **Navigate** — Client router handles SPA navigation

## Quick Example

```
web/pages/
├─ index.tsx         # /
├─ about.tsx         # /about
└─ users/[id].tsx    # /users/:id
```

## CLI Commands

```bash
# Generate routes
bun run generate

# Dev with watch
bun run dev

# Build for production
bun run build
```

## See Also

- [File-Based Routing](../../core-concepts/file-based-routing) — Core concept
- [How Dex Works](../../getting-started/how-dex-works) — Mental model