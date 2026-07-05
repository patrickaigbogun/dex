---
title: "Watch Process"
---

# Watch Process

The dev server watches your files and rebuilds on changes.

## What's Watched

- `web/pages/**` — Route components
- `web/layouts/**` — Layout components
- `web/styles/` — CSS files
- Configuration files

## How It Works

```bash
bun run dev
```

Starts multiple watchers:
1. **Router watcher** — Detects page/layout changes
2. **Style watcher** — Rebuilds CSS
3. **Client watcher** — Rebuilds client bundle
4. **Server watcher** — Restarts server on changes

## Hot Reload

When you save a file:
1. Dev process detects change
2. Regenerates affected files
3. Browser hot-reloads if possible
4. Falls back to full reload if needed

## Manual Regeneration

Force regenerate routes:

```bash
bun run generate
```

## See Also

- [Dev vs Production](../core-concepts/dev-vs-prod) — Mode differences
- [Build Process](../core-concepts/build-process) — Build details