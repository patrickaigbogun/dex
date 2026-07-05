---
title: "Server"
---

# Server

Dex's server handles asset serving, SPA fallback, and production deployment.

## Topics

- [Serving Assets](./serving-assets) — Static file serving
- [SPA Fallback](./spa-fallback) — Client-side routing support
- [Dev Reload](./dev-reload) — Hot reload in development
- [Logging](./logging) — Request logs and output
- [Production](./production) — Running in production

## Quick Start

```bash
# Dev server
bun run dev

# Production build
bun run build

# Run production server
cd build
./server
```

## Key Features

| Feature | Purpose |
|---------|---------|
| Asset Serving | Static files from `web/public/` |
| SPA Fallback | Client-side routes work in production |
| Dev Reload | Hot reload on file changes |
| API Routes | Server-side endpoints |

## See Also

- [Build Process](../../core-concepts/build-process) — How builds work
- [Production Deployment](../deployment/production-build) — Deploying your app