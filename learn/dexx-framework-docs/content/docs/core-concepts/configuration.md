---
title: "Configuration"
---

# Configuration

Dex works out of the box with sensible defaults. When you need customization, use `dex.config.ts`.

## Default Structure

By default, Dex expects this layout:

```
my-app/
├─ web/
│  ├─ pages/           # Route components
│  ├─ layouts/         # Layout components
│  └─ public/          # Static assets
└─ core/               # Generated files
```

No configuration needed — just start building.

## Custom Configuration

Create `dex.config.ts` (or `dex.config.js` / `.mjs` / `.cjs`) in your project root:

```ts
import type { DexConfig } from '@dex/router'

export default {
  // Router generation paths
  pagesDir: 'web/pages',
  layoutsDir: 'web/layouts',
  outRoutesTs: 'core/router/.generated/routes.ts',
  outRoutesJson: 'core/router/.generated/manifest.json',
  outLayoutsTs: 'core/router/.generated/layouts.ts',

  // Server and runtime options
  mode: 'spa',
  port: 7990,
  renderStrategy: 'spa',

  // Watch configuration
  watchFiles: [],
  watchDirs: [],
} satisfies DexConfig
```

You can also export a plain object without type annotations:

```ts
export default {
  pagesDir: 'src/pages',
  layoutsDir: 'src/layouts',
}
```

## Path Precedence

Dex resolves paths in this order (highest to lowest priority):

1. **CLI flags** — `--pagesDir src/views`
2. **Config file** — `dex.config.ts` values (nearest project root)
3. **Built-in defaults** — `DEFAULT_PATHS` (`web/pages`, `web/layouts`, etc.)

All paths are relative to the directory containing the `dex.config.*` file (project root).

## Available Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `pagesDir` | `string` | `web/pages` | Directory containing page route components (`.tsx`) |
| `layoutsDir` | `string` | `web/layouts` | Directory containing layout components (`.tsx`, `.ts`) |
| `outRoutesTs` | `string` | `core/router/.generated/routes.ts` | Target path for generated TypeScript route definitions |
| `outRoutesJson` | `string` | `core/router/.generated/manifest.json` | Target path for generated route manifest JSON |
| `outLayoutsTs` | `string` | `core/router/.generated/layouts.ts` | Target path for generated layout loader map |
| `mode` | `string` | `'spa'` | Application mode (`'spa'` or `'mpa'`) |
| `port` | `number` | `7990` | Server and dev server port |
| `renderStrategy` | `string` | `'spa'` | Rendering strategy (`'spa'`, `'ssg'`, `'ssr'`, `'ppr'`, `'dynamic'`) |
| `watchFiles` | `string[]` | `[]` | Additional file paths to watch for changes |
| `watchDirs` | `string[]` | `[]` | Additional directories to watch for changes |

## CLI Overrides

Override config values on the command line:

```bash
# Override pages directory
bunx dex-router generate --pagesDir src/routes

# Override output routes file
bunx dex-router generate --outRoutesTs src/.generated/routes.ts
```

## Programmatic Usage

When using Dex functions directly:

```ts
import { generateFsRoutes, generateLayouts } from '@dex/router'

await generateFsRoutes({
  pagesDir: 'app/routes',
  outTs: 'app/.generated/routes.ts',
  outJson: 'app/.generated/manifest.json',
})

await generateLayouts({
  layoutsDir: 'app/layouts',
  outTs: 'app/.generated/layouts.ts',
})
```

Passed options always take precedence over config file values.

## Environment Variables

Some features respect environment variables:

| Variable | Purpose |
|----------|---------|
| `PORT` | Dev/prod server port (default: 7990) |
| `DEX_API_ONLY` | Set to `1` for API-only mode |
| `NODE_ENV` | `development` or `production` |

## Validation

Dex validates and loads configuration files (`dex.config.ts`, `dex.config.js`, `dex.config.mjs`, `dex.config.cjs`) from the nearest parent directory relative to your working directory.

## See Also

- [File-Based Routing](./file-based-routing) — How pages map to routes
- [How Dex Works](../getting-started/how-dex-works) — Build process overview
- [Config Schema Reference](../reference/config-schema) — Full schema reference
- [Recipes: Custom Structure](../recipes/custom-structure) — Real-world config example