---
title: "Serving Assets"
---

# Serving Assets

Dex serves static assets and code-split ESM client chunks from your assets directory under the `/assets/*` URL prefix.

## Asset Helper

Use `dexAssetsRoute()` from `@dex/server` to mount static asset serving on your Elysia server:

```ts
import { dexAssetsRoute } from '@dex/server'

app.use(
  dexAssetsRoute({
    assetsDir: 'web/public/assets', // 'build/assets' in production
  })
)
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `assetsDir` | `string` | *(required)* | Directory on disk containing the static assets to serve. |
| `cacheControlProd` | `string` | `'public, max-age=31536000, immutable'` | Value of the `Cache-Control` header sent when `NODE_ENV === 'production'`. |
| `cacheControlDev` | `string` | `'no-store'` | Value of the `Cache-Control` header sent in development. |

## Path Routing & Traversal Protection

`dexAssetsRoute` serves all requests under `/assets/*`:
- `/assets/client.js` resolves to `<assetsDir>/client.js`.
- Code-split ESM chunks like `/assets/chunks/about-a1b2c3d4.js` resolve to `<assetsDir>/chunks/about-a1b2c3d4.js`.
- Nested assets like `/assets/icons/logo.png` resolve to `<assetsDir>/icons/logo.png`.
- Malformed percent-encodings, null bytes (`\0`), backslashes (`\`), `..` segments, and resolved paths escaping `assetsDir` are rejected with HTTP `400 Bad asset path`.

## Directory Structure

### Development

In development, `dexDev` outputs bundles into `web/public/assets`:

```
web/public/
└─ assets/
   ├─ client.js
   ├─ chunks/
   └─ styles.css
```

URL: `http://localhost:7990/assets/client.js`

### Production

In production builds (`dexBuild`), assets and content-hashed chunks are placed in `build/assets`:

```
build/
├─ assets/
│  ├─ client.js
│  ├─ chunks/
│  │  └─ [name]-[hash].js
│  └─ styles.css
├─ __ssg/
├─ index.html
└─ server
```

## Cache Headers

| Environment | Default `Cache-Control` |
|---|---|
| Development (`NODE_ENV !== 'production'`) | `no-store` |
| Production (`NODE_ENV === 'production'`) | `public, max-age=31536000, immutable` |

Because `dexBuild` stamps 8-character SHA-256 content hashes (`?v=<hash>`) onto `/assets/client.js` and `/assets/styles.css` in every HTML file (and hashes ESM chunk filenames), immutable caching in production is safe across deployments. Override defaults via `cacheControlDev` and `cacheControlProd`.

## See Also

- [Server Exports](../reference/server-exports) — Server helpers API
- [Build Process](../../core-concepts/build-process) — Build output
- [Production Server](./production) — Deployment setup
