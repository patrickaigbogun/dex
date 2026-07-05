---
title: "Server Exports"
---

# Server Exports

API reference for `@dex/server` helpers.

## dexAssetsRoute

Serve static assets.

```ts
import { dexAssetsRoute } from '@dex/server'

app.use(dexAssetsRoute({
  dir: 'web/public',
  prefix: '/assets',
  cache: true
}))
```

## dexSpaFallback

Enable SPA fallback for client-side routes.

```ts
import { dexSpaFallback } from '@dex/server'

app.use(dexSpaFallback({
  skip: ['/api', '/assets']
}))
```

## dexDevReloadRouter

Hot reload for development.

```ts
import { dexDevReloadRouter } from '@dex/server'

app.use(dexDevReloadRouter({
  watchDirs: ['build/assets'],
  watchFiles: ['build/assets/client.js']
}))
```

## dexPrettyLogger

Pretty-print request logs.

```ts
import { dexPrettyLogger } from '@dex/server'

app.use(dexPrettyLogger())
```

## See Also

- [Server Guide](../server/) — Server concepts
- [Production Deployment](../deployment/production-build) — Deployment guide