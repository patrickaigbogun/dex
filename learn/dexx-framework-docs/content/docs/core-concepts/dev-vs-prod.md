---
title: "Dev Vs Prod"
---

# Development vs Production

Dex behaves differently in development and production modes. This guide explains the differences.

## Development Mode

Run with `bun run dev`:

```bash
bun run dev
```

**Characteristics:**
- Hot reload on file changes
- Detailed error messages
- Source maps enabled
- Faster startup, slower runtime
- Watches and rebuilds on demand

**Server behavior:**
- Serves from `core/router/.generated/`
- SPA fallback for client-side routes
- Pretty logging (colored output)

**Environment:**
- `NODE_ENV=development`
- `PORT=7990` (default)

## Production Mode

Build with `bun run build`, then run:

```bash
cd build
PORT=7990 ./server
```

**Characteristics:**
- Optimized bundles
- Minified code
- No source maps
- Faster runtime, slower startup
- Single-threaded

**Server behavior:**
- Serves static assets from `build/assets/`
- SPA fallback for client-side routes
- Plain logging (no colors)

**Environment:**
- `NODE_ENV=production`
- `PORT` from env (default: 7990)

## Key Differences

| Feature | Development | Production |
|---------|-------------|------------|
| Hot Reload | ✅ | ❌ |
| Error Details | Full stack traces | Generic messages |
| Logging | Colored, pretty | Plain text |
| Assets | Served from source | Bundled |
| Performance | Fast startup | Fast runtime |

## API-Only Mode

Run without serving the frontend:

```bash
cd build
DEX_API_ONLY=1 ./server
```

Useful for:
- API gateway setups
- Separate frontend deployment
- Backend-only services

## Environment Variables

| Variable | Development | Production |
|----------|-------------|------------|
| `PORT` | 7990 | 7990 |
| `NODE_ENV` | `development` | `production` |
| `DEX_API_ONLY` | N/A | Set to `1` |

## Best Practices

1. **Develop locally** — use `bun run dev`
2. **Test production build** — run `bun run build && ./server` before deploying
3. **Use API-only** — for backend-only deployments
4. **Set PORT** — in production environments

## See Also

- [Build Process](./build-process) — How builds work
- [Production Server](./server/production) — Deployment guide
- [Development Watch](./watch-process) — Dev tooling