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

Create `dex.config.ts` in your project root:

```ts
import { defineConfig } from 'dex/config'

export default defineConfig({
  // Where pages live
  pagesDir: 'src/pages',
  
  // Where layouts live
  layoutsDir: 'src/layouts',
  
  // Where static assets live
  publicDir: 'static',
  
  // Where generated files go
  outDir: 'src/.generated',
})
```

## Path Precedence

Dex resolves paths in this order (highest to lowest priority):

1. **CLI flags** — `--pagesDir src/views`
2. **Config file** — `dex.config.ts` values
3. **Defaults** — `web/pages`, `web/layouts`, etc.

## Available Options

| Option | Default | Description |
|--------|---------|-------------|
| `pagesDir` | `web/pages` | Page components |
| `layoutsDir` | `web/layouts` | Layout components |
| `publicDir` | `web/public` | Static assets |
| `outDir` | `core` | Generated files |
| `distDir` | `build` | Production output |

## CLI Overrides

Override config values on the command line:

```bash
# Override pages directory
bun run dev --pagesDir src/routes

# Override output directory
bun run build --outDir dist
```

## Programmatic Usage

When using Dex functions directly:

```ts
import { generateFsRoutes } from '@dex/router'

await generateFsRoutes({
  pagesDir: 'app/routes',
  outTs: 'app/.generated/routes.ts',
})
```

Passed paths always win over config file values.

## Environment Variables

Some features respect environment variables:

| Variable | Purpose |
|----------|---------|
| `PORT` | Dev/prod server port (default: 7990) |
| `DEX_API_ONLY` | Set to `1` for API-only mode |
| `NODE_ENV` | `development` or `production` |

## Validation

Dex validates your config and shows helpful errors:

```
❌ Invalid config: pagesDir must be a string
   → Expected string, got undefined
```

## See Also

- [File-Based Routing](./file-based-routing) — How pages map to routes
- [How Dex Works](./how-dex-works) — Build process overview
- [Recipes: Custom Structure](../recipes/custom-structure) — Real-world config example