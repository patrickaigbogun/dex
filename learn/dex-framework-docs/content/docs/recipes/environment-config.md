---
title: "Environment Config"
---

# Environment-Specific Config

Configure Dex and environment variables across development and production.

## Using `getPublicEnvDefines()`

Dex uses `getPublicEnvDefines()` (from `@dex/server` and dev tasks) to automatically inspect `.env` and `process.env`, capturing and injecting variables prefixed with `PUBLIC_*`, `NEXT_PUBLIC_*`, and `VITE_*`.

These are automatically defined during:
- Development (`dexDev` / `client:watch`)
- Production building (`dexBuild` / `dexBuildClient`)

## Example `.env`

```bash
# .env
PORT=7990
API_URL=https://api.example.com
PUBLIC_SITE_NAME=My Dex App
NEXT_PUBLIC_ANALYTICS_ID=UA-XXXXX
```

## Consuming in Components

```tsx
// web/pages/index.tsx
const siteName = process.env.PUBLIC_SITE_NAME
const apiUrl = process.env.API_URL // Note: non-public env vars are not bundled client-side unless prefixed

export default function Home() {
  return (
    <div>
      <h1>{siteName}</h1>
    </div>
  )
}
```

## See Also

- [Configuration](../core-concepts/configuration) — Config options
- [Dev vs Production](../core-concepts/dev-vs-prod) — Environment differences