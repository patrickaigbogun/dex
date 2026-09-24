---
title: "Production"
---

# Production Server

Deploy your Dex app with a single binary.

## Build

```bash
bun run build
```

This creates `build/`:
```
build/
├─ server           # Node.js binary
├─ index.html       # Entry HTML
├─ assets/          # Static assets
└─ core/            # Generated routes
```

## Run

```bash
cd build
PORT=7990 ./server
```

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 7990 | Server port |
| `DEX_API_ONLY` | 0 | Set to `1` for API-only mode |
| `NODE_ENV` | production | Environment mode |

## API-Only Mode

Deploy backend only:

```bash
cd build
DEX_API_ONLY=1 ./server
```

Useful for:
- API gateway setups
- Separate frontend deployment
- Backend-only services

## Platform Deployment

### Railway

```bash
# In your build/ folder
railway up
```

### Render

Set build command:
```
cd build && ./server
```

### Docker

```dockerfile
FROM node:20
WORKDIR /app
COPY build/ .
EXPOSE 7990
CMD ["./server"]
```

## See Also

- [Build Process](../../core-concepts/build-process) — Build output
- [SPA Fallback](./spa-fallback) — Client-side routing