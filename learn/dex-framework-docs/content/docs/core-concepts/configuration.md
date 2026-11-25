---
title: "Configuration"
---

# Configuration

Dex uses **Config-as-Composition**: framework configuration lives in `config/core/` (`core/` is the only subfolder in `config/`), while app-level service configs (`auth.ts`, `db.ts`, `email.ts`, `cache.ts`, `queues.ts`) sit flat inside `config/`. Legacy `dex.config.ts` files at the project root remain supported for backward compatibility.

## Default Structure

```text
my-app/
├─ config/
│  ├─ core/
│  │  ├─ index.ts      # Exports the composed Dex config
│  │  ├─ router.ts     # File-based routing paths (enables @dex/router)
│  │  ├─ server.ts     # Port, subdomains, fonts, trustProxy (enables @dex/server)
│  │  ├─ api.ts        # Pie OpenAPI spec, prefix, baseUrl (enables @dex/pie)
│  │  └─ build.ts      # mode (spa/mpa), renderStrategy (spa/ssg) (enables @dex/dev)
│  └─ (optional app configs: auth.ts, db.ts, email.ts, cache.ts, queues.ts)
├─ web/
│  ├─ pages/           # Route components
│  ├─ layouts/         # Layout components
│  ├─ public/          # Static index.html & dev assets
│  └─ styles/          # Tailwind CSS entrypoint (index.css)
├─ routes/api/         # Elysia API routes (optional)
├─ lib/api.ts          # Userland @dex/pie client
└─ .dex/generated/     # Auto-generated routes, layouts, manifest, API types (gitignored)
```

After editing `config/core/`, run `dex install` to install only the enabled `@dex/*` packages and scaffold any missing userland directories without overwriting your existing files.

## Rendering Strategies

| Strategy | Status | Behavior |
| :--- | :--- | :--- |
| `'spa'` | **Implemented** | Client-side React rendering with ESM code-splitting (`--splitting --format esm`) and `dexSpaFallback`. |
| `'ssg'` | **Implemented** | Build-time prerendering (`renderToString` with `<RouterContext.Provider>`, `<head>` metadata, and Google Fonts) served before SPA fallback. Supports `<ClientOnly>` islands. |
| `'ssr'` | *Planned* | Reserved in `RenderStrategy` type; runtime per-request SSR + `hydrateRoot` not yet implemented (use `resolveHead` for dynamic `<head>` tags today). |
| `'ppr'` / `'isr'` | *Planned* | Reserved in types / roadmap; not yet implemented. |

## Custom Configuration

Create `dex.config.ts` (or `.js`, `.mjs`, `.cjs`, `.json`) in your project root:

```ts
import type { DexConfig } from '@dex/router'

export default {
  // Server & rendering
  mode: 'spa',
  port: 7990,
  renderStrategy: 'spa',

  // Router generation paths
  pagesDir: 'web/pages',
  layoutsDir: 'web/layouts',
  outRoutesTs: 'core/router/.generated/routes.ts',
  outRoutesJson: 'core/router/.generated/manifest.json',
  outLayoutsTs: 'core/router/.generated/layouts.ts',

  // Subdomain mounting
  subdomains: {
    docs: '/docs',
    admin: '/admin',
  },

  // Google Variable Fonts & Tailwind v4 @theme injection
  fonts: {
    sans: 'Inter',
    mono: {
      family: 'JetBrains Mono',
      variable: '--font-mono',
      weights: '400;500;700',
      display: 'swap',
    },
  },

  // @dex/pie OpenAPI codegen
  apiSpec: 'https://api.example.com/openapi.json',
  apiUrl: 'https://api.example.com',
  outApiTs: 'core/api/generated.ts',
  apiPrefix: '/api',

  // Extra watch targets for @dex/server dev reload
  watchFiles: [],
  watchDirs: [],
} satisfies DexConfig
```

## Path Precedence

Dex resolves configuration in this order (highest to lowest priority):

1. **CLI flags** — e.g. `--pagesDir src/views` or `--out core/api/generated.ts`
2. **Config file** — `dex.config.*` values (resolved from the nearest parent directory)
3. **Built-in defaults** — `DEFAULT_PATHS` (`web/pages`, `web/layouts`, `core/api/generated.ts`, `/api`, etc.)

All relative paths in `dex.config.*` are resolved relative to the directory containing the config file.

## Available Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `string` | `'spa'` | Application mode (`'spa'` or `'mpa'`) |
| `port` | `number` | `7990` | Default dev and production server port |
| `renderStrategy` | `'spa' \| 'ssg' \| 'ssr' \| 'ppr' \| 'dynamic'` | `'spa'` | Default rendering strategy for routes (`'ssg'` enables build-time prerendering) |
| `pagesDir` | `string` | `'web/pages'` | Directory containing page route components (`.tsx`) |
| `layoutsDir` | `string` | `'web/layouts'` | Directory containing layout components (`.tsx`, `.ts`) |
| `outRoutesTs` | `string` | `'core/router/.generated/routes.ts'` | Target path for generated TypeScript route definitions |
| `outRoutesJson` | `string` | `'core/router/.generated/manifest.json'` | Target path for generated route manifest JSON |
| `outLayoutsTs` | `string` | `'core/router/.generated/layouts.ts'` | Target path for generated layout loader map |
| `subdomains` | `Record<string, string>` | `{}` | Map subdomain names to route path prefixes (e.g. `{ docs: '/docs' }`) |
| `fonts` | `DexFontsConfig` | `undefined` | Google Fonts / custom font specs injected into HTML `<head>` with CSS variables & `.font-<key>` classes |
| `apiSpec` | `string` | `undefined` | OpenAPI JSON or YAML file path or URL used by `dex pie generate` |
| `apiUrl` | `string` | `undefined` | Default API base URL embedded into `createApiClient()` |
| `outApiTs` | `string` | `'core/api/generated.ts'` | Output path for `@dex/pie` generated TypeScript client |
| `apiPrefix` | `string` | `'/api'` | Path prefix stripped from generated `@dex/pie` route tree |
| `watchFiles` | `string[]` | `[]` | Additional files watched by `dexDevReloadRouter()` for SSE live reload |
| `watchDirs` | `string[]` | `[]` | Additional directories watched by `dexDevReloadRouter()` for SSE live reload |

## Subdomain Mounting (`subdomains`)

When `subdomains` is configured (for example `{ docs: '/docs' }`), pass `subdomains` to `<FileRouter />` and `dexSpaFallback()`:

- Visiting `docs.example.com/getting-started` transparently routes to `/docs/getting-started` while keeping `/getting-started` in the browser URL bar.
- Visiting `example.com/docs/getting-started` issues a canonical `308` redirect on the server (or client redirect via `resolveMainDomainSubdomainRedirect`) to `docs.example.com/getting-started`.
- Localhosts and IP addresses skip subdomain redirects so local development stays frictionless.

## Fonts (`fonts`)

Each entry in `fonts` accepts either a font family string (which defaults to variable weights `100..900` from Google Fonts) or an object:

```ts
fonts: {
  sans: 'Plus Jakarta Sans',
  serif: {
    family: 'Newsreader',
    variable: '--font-serif',
    weights: '400;600',
    ital: true,
    display: 'swap',
    provider: 'google', // or 'none' for local/custom fonts
  },
}
```

During SSG prerendering (`dexPrerender`) and dynamic fallback responses (`dexSpaFallback`), `@dex/dev` and `@dex/server` inject Google Fonts `<link>` tags, `:root` CSS variables, and `.font-<key>` utility classes. `@dex/server` also exports `generateFontThemeCss()` to emit a Tailwind v4 `@theme` block.

## CLI Overrides

Override config values on the command line:

```bash
# Override pages directory for router generation
bunx dex-router generate --pagesDir src/routes

# Override OpenAPI output and prefix for Pie
dex pie generate ./openapi.yaml --out lib/generated-api.ts --prefix /v1
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `PORT` | Dev/prod server port (overrides `dex.config.ts` `port`, default: `7990`) |
| `DEX_API_ONLY` | Set to `1` or `true` to serve only API routes in production |
| `DEX_API_SPEC` | Fallback OpenAPI spec URL/path for `dex pie generate` |
| `PUBLIC_API_URL` / `NEXT_PUBLIC_API_URL` | Default API base URL for `dex pie generate` and client defines |
| `NODE_ENV` | `development` or `production` |

## See Also

- [File-Based Routing](./file-based-routing) — How pages map to routes
- [How Dex Works](../getting-started/how-dex-works) — Build process overview
- [Config Schema Reference](../reference/config-schema) — Full schema reference
- [Recipes: Custom Structure](../recipes/custom-structure) — Real-world config example
