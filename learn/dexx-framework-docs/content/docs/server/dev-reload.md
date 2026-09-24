---
title: "Dev Reload"
---

# Dev Reload

Hot reload for development with automatic browser refresh.

## How It Works

When files change during development, the browser automatically reloads:

1. Dev server detects file change
2. Regenerates routes/assets
3. Sends EventSource signal
4. Browser refreshes

## Configuration

```ts
import { dexDevReloadRouter } from '@dex/server'

app.use(dexDevReloadRouter({
  watchDirs: ['web/public/assets'],
  watchFiles: ['web/public/assets/client.js', 'web/public/assets/styles.css'],
  pollIntervalMs: 250
}))
```

## Options and Configuration

If not explicitly passed in options, `dexDevReloadRouter` resolves watch targets from `dex.config.ts` or falls back to built-in defaults:

```ts
// dex.config.ts
export default {
  watchDirs: ['web/public/assets'],
  watchFiles: ['web/public/assets/client.js', 'web/public/assets/styles.css']
}
```

### Resolution Precedence:
1. Explicit options passed to `dexDevReloadRouter({ watchFiles, watchDirs, pollIntervalMs })`
2. Configuration properties (`watchFiles`/`devWatchFiles`, `watchDirs`/`devWatchDirs`) from `dex.config.ts`
3. Built-in defaults (`web/public/assets` directory, `web/public/assets/client.js`, and `web/public/assets/styles.css`)

## Disabling Hot Reload

```bash
bun run dev --no-hot
```

## Browser Requirements

Dev reload requires:
- Modern browser with EventSource support
- Same origin (no CORS issues)
- JavaScript enabled

## See Also

- [Watch Process](../dev/watch-process) — File watching
- [Dev vs Production](../core-concepts/dev-vs-prod) — Mode differences