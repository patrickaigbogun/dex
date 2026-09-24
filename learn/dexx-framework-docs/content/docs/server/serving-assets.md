---
title: "Serving Assets"
---

# Serving Assets

Dex serves static assets from your assets directory at the `/assets/*` URL path.

## Asset Helper

Use `dexAssetsRoute()` from `@dex/server` to mount static asset serving on your Elysia server:

```ts
import { dexAssetsRoute } from '@dex/server'

app.use(dexAssetsRoute({
  assetsDir: 'web/public/assets' // in development, or 'build/assets' in production
}))
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `assetsDir` | `string` | *(required)* | Directory on disk containing the static assets to serve. |
| `cacheControlProd` | `string` | `'public, max-age=31536000, immutable'` | Value of the `Cache-Control` header sent in production (`NODE_ENV=production`). |
| `cacheControlDev` | `string` | `'no-store'` | Value of the `Cache-Control` header sent in development. |

## Path Routing and Security

`dexAssetsRoute` automatically handles `/assets/*` routes:
- A request to `/assets/client.js` resolves to `<assetsDir>/client.js`.
- Nested paths like `/assets/icons/logo.png` resolve to `<assetsDir>/icons/logo.png`.
- Normalized paths containing `..` or attempting directory traversal are rejected with HTTP `400 Bad asset path`.

## Directory Structure

### Development
In development, assets are served from `web/public/assets`:
```
web/public/
└─ assets/
   ├─ client.js
   └─ styles.css
```
URL: `http://localhost:7990/assets/client.js`

### Production
In production builds, assets are placed in `build/assets`:
```
build/
├─ assets/
│  ├─ client.js
│  └─ styles.css
└─ server
```

## Cache Headers

| Environment | Default `Cache-Control` |
|-------------|-------------------------|
| Development (`NODE_ENV !== 'production'`) | `no-store` |
| Production (`NODE_ENV === 'production'`) | `public, max-age=31536000, immutable` |

You can override these cache headers using the `cacheControlDev` and `cacheControlProd` options.

## See Also

- [Server Exports](../reference/server-exports) — Server helpers API
- [Build Process](../../core-concepts/build-process) — Build output
- [Production Server](./production) — Deployment setup