---
title: "Dev Reload"
---

# Dev Reload

Hot reload in development with `dexDevReloadRouter()`.

## How It Works

The dev reload helper watches your build output and triggers browser refresh when changes are detected.

## Configuration

```ts
import { dexDevReloadRouter } from '@dex/server'

app.use(dexDevReloadRouter({
  watchDirs: ['web/public/assets'],
  watchFiles: ['web/public/assets/client.js', 'web/public/assets/styles.css'],
  pollIntervalMs: 250
}))
```

## Configuration Resolution

By default, `dexDevReloadRouter` watches your client assets:

```ts
// Built-in defaults or configure via dex.config.ts:
export default {
  watchDirs: ['web/public/assets'],
  watchFiles: ['web/public/assets/client.js', 'web/public/assets/styles.css']
}
```

## EventSource

Dev reload works via EventSource (server-sent events):

```tsx
// Auto-injected in development
<script>
  const es = new EventSource('/__dev/reload')
  es.addEventListener('message', () => location.reload())
</script>
```

## See Also

- [Watch Process](./watch-process) — File watching
- [Dev vs Production](../core-concepts/dev-vs-prod) — Environment differences