---
title: "Server Exports"
---

# Server Exports

API reference for `@dex/server` helpers and utilities.

## dexAssetsRoute

```ts
import { dexAssetsRoute } from '@dex/server'

app.use(dexAssetsRoute({
  assetsDir: 'web/public/assets',
  cacheControlProd: 'public, max-age=31536000, immutable',
  cacheControlDev: 'no-store'
}))
```

| Option | Type | Default | Description |
|---|---|---|---|
| `assetsDir` | `string` | *(required)* | Path to the directory containing static assets. |
| `cacheControlProd` | `string` | `'public, max-age=31536000, immutable'` | Production cache control header. |
| `cacheControlDev` | `string` | `'no-store'` | Development cache control header. |

---

## dexSpaFallback

```ts
import { dexSpaFallback } from '@dex/server'

app.use(dexSpaFallback({
  indexHtmlPath: 'build/index.html',
  ssgDir: 'build/__ssg',
  subdomains: { admin: '/admin' },
  trustProxy: true,
  allowedHosts: ['example.com'],
  fonts: {},
  resolveHead: async ({ pathname }) => ({ title: 'Page' })
}))
```

| Option | Type | Default | Description |
|---|---|---|---|
| `indexHtmlPath` | `string` | *(required)* | Path to base `index.html`. |
| `ssgDir` | `string` | `'build/__ssg'` | Directory containing pre-rendered SSG HTML files. |
| `subdomains` | `Record<string, string>` | `{}` | Subdomain routing prefix mapping. |
| `trustProxy` | `boolean` | `false` | Trust proxy headers for host resolution. |
| `allowedHosts` | `string[]` | `[]` | Allowed incoming host headers. |
| `fonts` | `DexFontsConfig` | `{}` | Google Fonts configuration spec. |
| `resolveHead` | `Function` | `undefined` | Async function to resolve page head metadata dynamically. |

---

## dexDevReloadRouter

```ts
import { dexDevReloadRouter } from '@dex/server'

app.use(dexDevReloadRouter({
  watchDirs: ['web/public/assets'],
  watchFiles: ['web/public/assets/client.js'],
  pollIntervalMs: 250
}))
```

---

## dexPrettyLogger

```ts
import { dexPrettyLogger } from '@dex/server'

app.use(dexPrettyLogger({
  ignore: (pathname) => pathname.startsWith('/__dev'),
  includeQuery: false
}))
```

---

## Head Meta & Google Fonts

### `injectHeadMeta(html: string, meta: DexHeadMeta): string`
Injects title, description, OpenGraph, and Twitter card meta tags into HTML.

### `buildGoogleFontsUrl(fonts: DexFontsConfig): string \| null`
Builds Google Fonts CSS2 stylesheet URL.

### `injectGoogleFonts(html: string, fonts: DexFontsConfig): string`
Injects preconnect links, Google Fonts stylesheet, and `:root` CSS variables into HTML.

### `generateFontThemeCss(fonts: DexFontsConfig): string`
Generates Tailwind v4 `@theme` block CSS for fonts.

---

## Environment & Port Utilities

### `getPublicEnvDefines(cwd?: string): string[]`
Reads `.env` and `process.env`, filtering for `PUBLIC_*`, `NEXT_PUBLIC_*`, and `VITE_*` variables to produce `--define` arguments.

### `isPortAvailable(port: number): Promise<boolean>`
Checks if a port is available.

### `findAvailablePort(startPort: number, maxAttempts?: number): Promise<number>`
Finds the first available port starting from `startPort`.

---

## See Also

- [Server Guide](../server/) — Server concepts
- [Production Deployment](../deployment/production-build) — Deployment guide