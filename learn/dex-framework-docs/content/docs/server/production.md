---
title: "Production"
---

# Production Server

Deploy your Dex app as a standalone compiled Bun server binary alongside prerendered HTML and content-hashed static assets.

## Build

```bash
bun run build
# or
dex build
```

`dexBuild` produces `build/`:

```
build/
├─ server              # Compiled standalone Bun binary
├─ index.html          # Fallback HTML with cache-busted asset ?v=<hash> links
├─ __ssg/              # Prerendered SSG route HTML files
├─ <route>/index.html  # Prerendered static routes copied at build root
└─ assets/
   ├─ client.js        # ESM entry bundle
   ├─ chunks/          # Code-split ESM chunks ([name]-[hash].js)
   └─ styles.css       # Minified Tailwind CSS bundle
```

## Run

```bash
cd build
NODE_ENV=production PORT=7990 ./server
# or from project root
dex start -p
```

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `7990` | Base port to listen on (automatically advances via `findAvailablePort` if busy). |
| `DEX_API_ONLY` | `0` | Set to `1` or `true` to serve only `/api/*` routes (no assets or SPA fallback). |
| `NODE_ENV` | `production` | Enables immutable asset cache headers and disables `/__dev/reload` and ANSI log colors. |

## Google Fonts & Variable Fonts

Configure `fonts` in `dex.config.ts`:

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

### Font API (`@dex/server`)

- **`DexFontSpec` & `DexFontsConfig`**: Each key in `fonts` accepts either a font family string (defaults to variable weights `'100..900'`, `display: 'swap'`, `provider: 'google'`, CSS var `--font-<key>`) or a `DexFontSpec` object:
  - `family: string` — Font family name (e.g. `'Inter'`, `'JetBrains Mono'`).
  - `variable?: string` — CSS custom property name (defaults to `--font-<key>`).
  - `weights?: string` — Variable range (`'100..900'`) or semicolon-separated weights (`'400;600;700'`).
  - `ital?: boolean` — Include italic axes (`ital,wght@0,...;1,...`).
  - `display?: 'swap' | 'auto' | 'block' | 'fallback' | 'optional'` — CSS `font-display` strategy (default `'swap'`).
  - `provider?: 'google' | 'none'` — Use `'none'` for self-hosted/local fonts while still generating CSS variables and `.font-*` classes.
- **`buildGoogleFontsUrl(fonts)`**: Builds a Google Fonts CSS2 stylesheet URL (`https://fonts.googleapis.com/css2?...`), returning `null` if only `provider: 'none'` fonts are defined.
- **`injectGoogleFonts(html, fonts)`**: Injects `<link rel="preconnect">` tags, the Google Fonts CSS2 `<link rel="stylesheet">`, and `<style id="dex-fonts-theme">` defining `:root` variables and `.font-<key>` classes before `</head>`.
- **`generateFontThemeCss(fonts)`**: Emits a Tailwind v4 `@theme { --font-sans: 'Inter', sans-serif; ... }` CSS block so font keys map directly to Tailwind v4 `font-*` theme tokens.

## Environment & Port Helpers (`@dex/server`)

### `getPublicEnvDefines(cwd?)`

Reads `.env` in `cwd` (if present) merged with `process.env`, filters for valid client-safe identifiers matching `/^(NEXT_PUBLIC_|PUBLIC_|VITE_)[A-Za-z0-9_]+$/`, and returns `--define process.env.<KEY>=<JSON>` CLI arguments for `bun build`:

```ts
import { getPublicEnvDefines } from '@dex/server'

const defineArgs = getPublicEnvDefines(process.cwd())
// e.g. ['--define', 'process.env.PUBLIC_API_URL="https://api.example.com"']
```

### `findAvailablePort(startPort, maxAttempts?)` & `isPortAvailable(port)`

Probes port availability using `Bun.serve({ port, reusePort: false })` and increments from `startPort` until an open port is found (stopping at `maxAttempts`, default `100`, and strictly capped at port `65535`):

```ts
import { findAvailablePort, isPortAvailable } from '@dex/server'

const free = await isPortAvailable(7990)
const port = await findAvailablePort(Number(process.env.PORT ?? 7990))
```

## API-Only Mode

Deploy backend API routes only without serving frontend assets or HTML:

```bash
cd build
DEX_API_ONLY=1 ./server
```

## Platform Deployment

### Railway / Render

Build the project (`bun run build`) and deploy the `build/` directory, starting `./server` with `NODE_ENV=production`.

### Docker

Because `build/server` is a compiled standalone Bun executable, the runtime image does not need Node.js or Bun installed:

```dockerfile
FROM debian:bookworm-slim
WORKDIR /app
COPY build/ .
ENV NODE_ENV=production
EXPOSE 7990
CMD ["./server"]
```

## See Also

- [Build Process](../../core-concepts/build-process) — Build output
- [SPA Fallback](./spa-fallback) — Client-side routing, SSG lookup, and head injection
