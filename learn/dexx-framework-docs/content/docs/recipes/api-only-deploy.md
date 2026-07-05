---
title: "Api Only Deploy"
---

# API-Only Deployment

Deploy your Dex app as an API backend without serving the frontend.

## Build

```bash
bun run build
```

## Run API-Only

```bash
cd build
DEX_API_ONLY=1 ./server
```

## What Changes

- No static assets served
- No SPA fallback
- Only `/api/*` routes work
- Smaller memory footprint

## Use Cases

- API gateway
- Separate frontend deployment
- Backend-only microservice

## Example: Deploy to Railway

```bash
# Set environment
railway variables set DEX_API_ONLY=1

# Deploy
railway up
```

## See Also

- [Production Deployment](./production) — Full deployment guide
- [Recipes Index](./index) — Other recipes