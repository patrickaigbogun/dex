---
title: "Server"
---

# Server

`@dex/server` provides Elysia plugins and runtime utilities for static asset delivery, SSG-aware SPA fallback, subdomain canonical redirects, server-side `<head>` and Google Fonts injection, dev live-reload, logging, public env extraction, and port discovery.

## Topics

- [Serving Assets](./serving-assets) — Static file serving at `/assets/*`
- [SPA Fallback](./spa-fallback) — Request pipeline, SSG lookup, subdomains, `<head>` metadata, and fonts
- [Dev Reload](./dev-reload) — SSE live reload in development
- [Logging](./logging) — Request logging with `dexPrettyLogger`
- [Production](./production) — Standalone binary, Google Fonts `@theme`, `getPublicEnvDefines`, and port helpers

## Quick Start

```bash
# Dev server
bun run dev

# Production build (outputs standalone build/server binary + assets + SSG HTML)
bun run build

# Run production server
cd build
./server
```

## Google Fonts & Variable Fonts

Configure Google Fonts once in `dex.config.ts`:

```ts
// dex.config.ts
export default {
  mode: 'spa',
  renderStrategy: 'ssg',
  fonts: {
    sans: 'Inter',
    mono: { family: 'JetBrains Mono', weights: '100..800' },
  },
}
```

Both `dexSpaFallback` (at request time) and `dexPrerender` (at build time) automatically read `fonts` from `dex.config.ts` and inject `<link rel="preconnect">`, the Google Fonts CSS2 `<link rel="stylesheet">`, CSS custom properties (`--font-sans`, `--font-mono`), and `.font-sans` / `.font-mono` utility classes into `<head>`. `@dex/server` also exports `buildGoogleFontsUrl`, `injectGoogleFonts`, `generateFontThemeCss`, `DexFontSpec`, and `DexFontsConfig` for custom pipelines and Tailwind v4 `@theme` generation.

## Key Features

| Feature | API | Purpose |
|---|---|---|
| Asset Serving | `dexAssetsRoute` | Static files and ESM chunks from `/assets/*` with traversal protection |
| SPA & SSG Fallback | `dexSpaFallback` | Serves prerendered SSG HTML or `index.html`, handles 308 subdomain redirects, injects `<head>` & fonts |
| Dev Reload | `dexDevReloadRouter` | SSE reload stream at `/__dev/reload` in development |
| Request Logging | `dexPrettyLogger` | Colorized TTY / plain production HTTP & error logs |
| Google Fonts | `injectGoogleFonts`, `buildGoogleFontsUrl`, `generateFontThemeCss` | Variable & static Google Fonts injection and Tailwind v4 `@theme` CSS |
| Public Env & Ports | `getPublicEnvDefines`, `findAvailablePort`, `isPortAvailable` | Safe client env `--define` flags and dynamic port binding up to `65535` |

## See Also

- [Build Process](../../core-concepts/build-process) — How builds work
- [Production Deployment](../deployment/production-build) — Deploying your app
