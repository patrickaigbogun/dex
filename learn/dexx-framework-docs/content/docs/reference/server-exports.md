---
title: "Server Exports"
---

# Server Exports

API reference for `@dex/server` helpers and utilities.

## dexAssetsRoute

Serve static assets from a directory at `/assets/*`.

```ts
import { dexAssetsRoute } from '@dex/server'

app.use(dexAssetsRoute({
  assetsDir: 'web/public/assets',
  cacheControlProd: 'public, max-age=31536000, immutable', // optional
  cacheControlDev: 'no-store'                             // optional
}))
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `assetsDir` | `string` | *(required)* | Path to the directory containing static assets. |
| `cacheControlProd` | `string` | `'public, max-age=31536000, immutable'` | `Cache-Control` header sent in production (`NODE_ENV === 'production'`). |
| `cacheControlDev` | `string` | `'no-store'` | `Cache-Control` header sent in development. |

> [!NOTE]
> `dexAssetsRoute` is fixed to mount at `/assets/*`. Directory traversal attempts (e.g. paths containing `..`) are blocked and return `400 Bad asset path`.

---

## dexSpaFallback

Serves the specified SPA `index.html` file for non-asset, non-API client GET requests.

```ts
import { dexSpaFallback } from '@dex/server'

app.use(dexSpaFallback({
  indexHtmlPath: 'build/index.html'
}))
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `indexHtmlPath` | `string` | *(required)* | Path to the `index.html` file to serve for SPA client routes. |

### Built-in Bypasses

`dexSpaFallback` automatically skips fallback handling (allowing subsequent handlers or 404s) for:
- Non-`GET` requests
- Paths starting with `/api/`
- Paths starting with `/assets/`
- Paths starting with `/__dev/`
- Paths containing a `.` (file extensions like `.js`, `.css`, `.png`)
- Requests whose `Accept` header does not include `text/html` or `*/*`

---

## dexDevReloadRouter

Dev-only Server-Sent Events (SSE) router that triggers a client reload on file changes.

```ts
import { dexDevReloadRouter } from '@dex/server'

app.use(dexDevReloadRouter({
  watchDirs: ['web/public/assets'],
  watchFiles: ['web/public/assets/client.js', 'web/public/assets/styles.css'],
  pollIntervalMs: 250
}))
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `watchDirs` | `string[]` | `['web/public/assets']` | Directories to watch for file modifications (`.js`, `.css`). |
| `watchFiles` | `string[]` | `['web/public/assets/client.js', 'web/public/assets/styles.css']` | Specific files to watch and poll for mtime changes. |
| `pollIntervalMs` | `number` | `250` | Polling interval in milliseconds for detecting file timestamp changes. |

> [!NOTE]
> `dexDevReloadRouter` mounts an SSE endpoint at `/__dev/reload`. In production (`NODE_ENV === 'production'`), requests to this endpoint receive a `404 Not found` response.
>
> **Resolution Order:** Explicit `opts` > `dex.config.*` (`watchFiles`/`watchDirs`) > built-in defaults. Paths are resolved relative to the nearest `dex.config.*` location.

---

## dexPrettyLogger

Pretty request and error logger plugin for Elysia apps.

```ts
import { dexPrettyLogger } from '@dex/server'

app.use(dexPrettyLogger({
  includeQuery: false,
  ignore: (pathname) => pathname.startsWith('/__dev')
}))
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `ignore` | `(pathname: string) => boolean` | `undefined` | Predicate function to exclude matching paths from being logged. |
| `includeQuery` | `boolean` | `false` | When `true`, includes query parameters in the logged URL path. |

### Log Format

Logs are output to `console.log` (for requests) and `console.error` (for errors):
```
[timestamp] LEVEL METHOD /path status durationMs
```

---

## Port Utilities

Utilities from `@dex/server` (or internal port helpers) for port discovery:

### `isPortAvailable(port: number): Promise<boolean>`

Checks if a specific port is currently available by attempting to bind a temporary Bun server.

### `findAvailablePort(startPort: number, maxAttempts = 100): Promise<number>`

Finds the first available port starting from `startPort`, scanning up to `maxAttempts`. Throws an error if no available port is found.

---

## See Also

- [Server Guide](../server/) — Server concepts
- [Production Deployment](../deployment/production-build) — Deployment guide