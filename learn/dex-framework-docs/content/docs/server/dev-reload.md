---
title: "Dev Reload"
---

# Dev Reload

`dexDevReloadRouter` exposes a Server-Sent Events (SSE) endpoint at `/__dev/reload` for automatic browser refresh during development.

## How It Works

1. The browser opens an `EventSource('/__dev/reload')` connection (included in `web/public/index.html`).
2. `dexDevReloadRouter` watches `watchDirs` (for `.js` and `.css` changes) and `watchFiles` (both via `fs.watch` / `fs.watchFile` and an mtime polling interval).
3. When an asset changes (debounced by `100ms`), the server emits an SSE `reload` event (`event: reload\ndata: now\n\n`).
4. The browser receives the `reload` event and calls `location.reload()`.

In production (`NODE_ENV === 'production'`), `/__dev/reload` immediately returns `404 Not found` and starts no watchers.

## Configuration

```ts
import { dexDevReloadRouter } from '@dex/server'

app.use(
  dexDevReloadRouter({
    watchDirs: ['web/public/assets'],
    watchFiles: ['web/public/assets/client.js', 'web/public/assets/styles.css'],
    pollIntervalMs: 250,
  })
)
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `watchFiles` | `string[]` | `['web/public/assets/client.js', 'web/public/assets/styles.css']` | Files monitored for mtime changes. |
| `watchDirs` | `string[]` | `['web/public/assets']` | Directories watched for `.js` and `.css` updates. |
| `pollIntervalMs` | `number` | `250` | Interval (ms) for stat-based mtime polling on `watchFiles`. |

## Resolution Precedence

1. Explicit options passed to `dexDevReloadRouter({ watchFiles, watchDirs, pollIntervalMs })`
2. `watchFiles`/`devWatchFiles` and `watchDirs`/`devWatchDirs` in `dex.config.*`
3. Built-in defaults (`web/public/assets`, `web/public/assets/client.js`, `web/public/assets/styles.css`)

## See Also

- [Watch Process](../../dev/watch-process) — File watching and 4-process dev pipeline
- [Dev Reload (`@dex/dev`)](../../dev/dev-reload) — Client EventSource snippet
- [Dev vs Production](../../core-concepts/dev-vs-prod) — Mode differences
