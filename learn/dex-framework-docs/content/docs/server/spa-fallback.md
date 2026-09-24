---
title: "SPA Fallback"
---

# SPA Fallback

SPA fallback ensures client-side routes work seamlessly by serving your `index.html` for non-API, non-asset GET requests.

## How It Works

`dexSpaFallback` mounts a catch-all GET route (`*`) and serves the file at `indexHtmlPath`.

It automatically bypasses fallback for:
- Non-`GET` HTTP methods
- `/api/*` (API endpoints)
- `/assets/*` (static asset requests)
- `/__dev/*` (dev reload SSE requests)
- Any path containing `.` (requests for files with extensions like `.ico`, `.png`, `.json`)
- Requests with an `Accept` header that explicitly does not accept `text/html` or `*/*`

## Usage

```ts
import { dexSpaFallback } from '@dex/server'

app.use(dexSpaFallback({
  indexHtmlPath: 'build/index.html' // in production, or 'web/public/index.html'
}))
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `indexHtmlPath` | `string` | *(required)* | Path to the entry `index.html` file to serve for SPA routing. |

## Request Handling Example

| Request | `dexSpaFallback` Behavior |
|---------|---------------------------|
| `GET /` | Serves `index.html` |
| `GET /about` | Serves `index.html` |
| `GET /users/123` | Serves `index.html` |
| `GET /api/health` | Bypassed (handled by API routes) |
| `GET /assets/client.js` | Bypassed (handled by `dexAssetsRoute`) |
| `GET /__dev/reload` | Bypassed (handled by `dexDevReloadRouter`) |
| `GET /favicon.ico` | Bypassed (contains `.`) |
| `POST /submit` | Bypassed (non-GET method) |

## See Also

- [Server Exports](../reference/server-exports) — Server helpers API
- [Serving Assets](./serving-assets) — Static asset delivery
- [Production Server](./production) — Production deployment setup