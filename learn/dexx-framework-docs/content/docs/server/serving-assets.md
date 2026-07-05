---
title: "Serving Assets"
---

# Serving Assets

Dex serves static assets from `web/public/` in development and `build/assets/` in production.

## Development

Assets are served from `web/public/`:

```
web/public/
├─ assets/
│  ├─ client.js
│  └─ styles.css
└─ images/
   └─ logo.png
```

URL: `http://localhost:7990/assets/client.js`

## Production

After `bun run build`, assets are in `build/assets/`:

```
build/
├─ assets/
│  ├─ client.js
│  └─ styles.css
└─ server
```

## Asset Helper

Use `dexAssetsRoute()` from `@dex/server`:

```ts
import { dexAssetsRoute } from '@dex/server'

app.use(dexAssetsRoute({
  dir: 'web/public',  // or 'build/assets' in prod
  prefix: '/assets'
}))
```

## Cache Headers

| Environment | Cache-Control |
|-------------|---------------|
| Development | `no-cache` |
| Production | `public, max-age=31536000` |

## See Also

- [Build Process](../../core-concepts/build-process) — Build output
- [Production](./production) — Deployment