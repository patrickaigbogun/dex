---
title: "Config Schema"
---

# Config Schema

Reference for `dex.config.ts`.

## Basic Config

```ts
import { defineConfig } from 'dex/config'

export default defineConfig({
  // Pages directory
  pagesDir: 'web/pages',
  
  // Layouts directory
  layoutsDir: 'web/layouts',
  
  // Static assets directory
  publicDir: 'web/public',
  
  // Generated files output
  outDir: 'core',
  
  // Production build output
  distDir: 'build',
})
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `pagesDir` | string | `web/pages` | Page components |
| `layoutsDir` | string | `web/layouts` | Layout components |
| `publicDir` | string | `web/public` | Static assets |
| `outDir` | string | `core` | Generated files |
| `distDir` | string | `build` | Production output |

## Validation

Dex validates your config and shows errors for:
- Invalid paths
- Missing required fields
- Wrong types

## See Also

- [CLI Flags](./cli-flags) — Command-line overrides
- [Configuration Concept](../../core-concepts/configuration) — How config works