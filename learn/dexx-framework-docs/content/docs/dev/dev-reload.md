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
  watchDirs: ['build/assets'],
  watchFiles: ['build/assets/client.js', 'build/assets/styles.css']
}))
```

## Automatic

By default, it reads from your `dex.config.ts`:

```ts
// dex.config.ts
export default {
  pagesDir: 'src/pages',
  layoutsDir: 'src/layouts',
  outDir: 'src/.generated',
}

// Server automatically watches:
// - src/.generated/routes.ts
// - src/.generated/layouts.ts
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