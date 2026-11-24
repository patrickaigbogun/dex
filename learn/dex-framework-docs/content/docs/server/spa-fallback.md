---
title: "SPA Fallback"
---

# SPA Fallback

`dexSpaFallback` serves prerendered SSG HTML pages when present, handles canonical subdomain redirects, injects server-side `<head>` metadata and Google Fonts, and falls back to `index.html` for client-side SPA routes.

## Usage

```ts
import { dexSpaFallback } from '@dex/server'

app.use(
  dexSpaFallback({
    indexHtmlPath: 'build/index.html', // or 'web/public/index.html' in dev
    ssgDir: 'build/__ssg',
    subdomains: { blog: '/blog' },
    trustProxy: true,
    allowedHosts: ['example.com', 'blog.example.com'],
    fonts: {
      sans: 'Inter',
      mono: { family: 'JetBrains Mono', weights: '100..800' },
    },
    resolveHead: async ({ pathname }) => {
      if (pathname === '/about') {
        return {
          title: 'About Us',
          description: 'Learn about our team.',
          ogType: 'website',
        }
      }
      return null
    },
  })
)
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `indexHtmlPath` | `string` | *(required)* | Path to the fallback `index.html` file. |
| `ssgDir` | `string` | `undefined` | Directory of prerendered SSG HTML pages (typically `build/__ssg`). |
| `subdomains` | `Record<string, string>` | `dexConfig.subdomains ?? {}` | Maps subdomain labels to internal route prefixes (e.g. `{ blog: '/blog' }`). |
| `fonts` | `DexFontsConfig` | `dexConfig.fonts` | Google Fonts configuration injected into served HTML. |
| `trustProxy` | `boolean` | `false` | When `true`, honors `X-Forwarded-Host` and `X-Forwarded-Proto` headers for host validation and redirects. |
| `allowedHosts` | `string[]` | `undefined` | Optional host allowlist (case-insensitive). Unknown hosts receive `403 Forbidden`. |
| `resolveHead` | `(ctx) => Promise<DexHeadMeta \| null> \| DexHeadMeta \| null` | `undefined` | Per-request callback receiving `{ pathname, url, hostname, request }` to inject `<head>` metadata. |

## Request Pipeline

`dexSpaFallback` mounts a catch-all `*` route and processes every request through four ordered stages:

### 1. Method Check & Bypasses

1. **Method check**: Only `GET` requests are served. Any other HTTP method receives `405 Method Not Allowed`.
2. **Reserved path bypasses**: Requests starting with `/api/`, `/assets/`, or `/__dev/` return `404 Not Found` (so unhandled API or asset paths never accidentally serve HTML).
3. **Path traversal check**: Null bytes (`\0`), backslashes (`\`), `.`/`..` segments, and invalid percent-encodings return `400 Bad Path`.
4. **Last-segment file extension check**: If the **final** path segment ends with a file extension matching `/\.[a-zA-Z0-9]{1,10}$/` (such as `/favicon.ico`, `/robots.txt`, `/logo.png`, or `/chunk.js`), the middleware returns `404 Not Found`. Dots in earlier or non-extension route segments like `/users/jane.doe` are allowed unless the trailing portion looks like a file extension.
5. **Accept header negotiation**: If an `Accept` header is present and includes neither `text/html` nor `*/*`, `dexSpaFallback` returns `404 Not Found`.

### 2. Host Validation & Canonical `308` Subdomain Redirects

- When `trustProxy: true`, `X-Forwarded-Proto` and `X-Forwarded-Host` are parsed (taking the first comma-separated value and validating host syntax); otherwise `Host` and the request URL are used.
- If `allowedHosts` is configured and the resolved hostname is not in the list, the server returns `403 Forbidden`.
- When `subdomains` is configured (and the host is not `localhost`, `::1`, IPv4, or `host:port`):
  - Visiting a subdomain prefix on the main domain (e.g. `https://example.com/blog/post-1`) issues a `308` redirect to `https://blog.example.com/post-1`.
  - Visiting the prefix while already on the subdomain (e.g. `https://blog.example.com/blog/post-1`) issues a `308` redirect to `https://blog.example.com/post-1`.
  - Requests on `*.localhost` skip main-domain-to-subdomain redirects so local testing works smoothly.

### 3. Prerendered SSG HTML Lookup

Before falling back to `indexHtmlPath`, `dexSpaFallback` checks for a prerendered static page in order:

1. `<ssgDir>/<route>/index.html` (or `<ssgDir>/index.html` for `/`)
2. `<dirname(indexHtmlPath)>/<route>/index.html`
3. Fallback: `indexHtmlPath`

Path lookup validates against `..`, `.`, `\`, `%2e%2e%5c`, null bytes, and directory-escape attempts (`400 Bad Path`).

### 4. Server-Side `<head>` Metadata & Google Fonts Injection

If `resolveHead` returns a `DexHeadMeta` object or `fonts` is non-empty, `dexSpaFallback` reads the target HTML and transforms `<head>`:
1. **`injectHeadMeta(html, meta)`**: Replaces or inserts `<title>` and appends `<meta>` tags for `description`, `og:title`, `og:description`, `og:type`, `og:url`, `og:image`, `og:video`, `og:video:secure_url`, `og:video:type`, `twitter:title`, `twitter:description`, `twitter:image`, and `twitter:card` (filtering out `javascript:`, `data:`, and `vbscript:` URLs).
2. **`injectGoogleFonts(html, fonts)`**: Injects Google Fonts `<link rel="preconnect">` hints, the Google Fonts CSS2 `<link rel="stylesheet">`, and `<style id="dex-fonts-theme">` with `:root` CSS variables and `.font-*` utility classes (skipped if `id="dex-fonts-theme"` is already present, such as on prerendered SSG HTML).

## `DexHeadMeta` Shape

```ts
export interface DexHeadMeta {
  title?: string | null
  description?: string | null
  ogTitle?: string | null
  ogDescription?: string | null
  ogImage?: string | null
  ogVideo?: string | null
  ogType?: string | null
  url?: string | null
  twitterCard?: 'summary' | 'summary_large_image' | 'player' | null
}
```

## Request Handling Summary

| Request | `dexSpaFallback` Behavior |
|---|---|
| `GET /` | Serves `<ssgDir>/index.html` or `indexHtmlPath` (+ head/fonts injection) |
| `GET /about` | Serves `<ssgDir>/about/index.html` or `indexHtmlPath` |
| `GET /users/jane.doe` | Serves `indexHtmlPath` (dots allowed in route segments when not matching an extension) |
| `GET /blog/hello` (with `subdomains: { blog: '/blog' }`) | `308` redirect to `https://blog.example.com/hello` |
| `GET /api/health` | `404` (bypassed if not matched by earlier API routes) |
| `GET /assets/client.js` | `404` (bypassed; handled by `dexAssetsRoute`) |
| `GET /__dev/reload` | `404` (bypassed; handled by `dexDevReloadRouter`) |
| `GET /favicon.ico` | `404` (last segment matches file extension) |
| `GET /../etc/passwd` or `/%2e%2e%5c` | `400 Bad Path` |
| `POST /submit` | `405 Method Not Allowed` |

## See Also

- [Server Exports](../reference/server-exports) — Server helpers API
- [Serving Assets](./serving-assets) — Static asset delivery
- [Production Server](./production) — Production deployment, fonts, and env helpers
