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
  watchDirs: ['build/assets'],
  watchFiles: ['build/assets/client.js']
}))
```

## Auto-Configuration

If you use `dex.config.ts`, dev reload reads paths automatically:

```ts
// dex.config.ts
export default {
  pagesDir: 'src/routes',
  outDir: 'src/.generated'
}

// Dev reload watches:
// - src/.generated/routes.ts
// - src/.generated/layouts.ts
```

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