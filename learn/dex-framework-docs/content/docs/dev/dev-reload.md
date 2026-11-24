---
title: "Dev Reload"
---

# Dev Reload

Hot reload in development with `dexDevReloadRouter()` from `@dex/server`.

## How It Works

When `client:watch` or `styles:watch` rebuilds assets into `web/public/assets`, `dexDevReloadRouter` detects the updated files or directory changes and pushes a `reload` event over Server-Sent Events (SSE) at `/__dev/reload`.

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

## Configuration Resolution

Resolution precedence for `dexDevReloadRouter`:

1. Explicit options passed to `dexDevReloadRouter({ watchFiles, watchDirs, pollIntervalMs })`
2. Values from `dex.config.*` (`watchFiles` / `devWatchFiles`, `watchDirs` / `devWatchDirs`)
3. Built-in defaults (`web/public/assets`, `web/public/assets/client.js`, `web/public/assets/styles.css`)

## EventSource Listener

`web/public/index.html` connects to `/__dev/reload` and listens for the `reload` SSE event:

```html
<script>
  (() => {
    try {
      const es = new EventSource('/__dev/reload')
      let reloading = false
      es.addEventListener('reload', () => {
        if (reloading) return
        reloading = true
        location.reload()
      })
      es.onerror = () => {
        try { es.close() } catch {}
      }
    } catch {}
  })()
</script>
```

In production (`NODE_ENV === 'production'`), `/__dev/reload` returns `404` so the script closes cleanly without starting any file watchers.

## See Also

- [Watch Process](./watch-process) — File watching and build pipeline
- [Server Dev Reload](../server/dev-reload) — Server plugin details
- [Dev vs Production](../core-concepts/dev-vs-prod) — Environment differences
