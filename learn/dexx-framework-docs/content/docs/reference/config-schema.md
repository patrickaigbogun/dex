---
title: "Config Schema"
---

# Config Schema

Reference for `dex.config.ts`.

## Basic Config

```ts
import type { DexConfig } from '@dex/router'

export default {
  // Router generation paths
  pagesDir: 'web/pages',
  layoutsDir: 'web/layouts',
  outRoutesTs: 'core/router/.generated/routes.ts',
  outRoutesJson: 'core/router/.generated/manifest.json',
  outLayoutsTs: 'core/router/.generated/layouts.ts',

  // Runtime and server settings
  mode: 'spa',
  port: 7990,
  renderStrategy: 'spa',

  // Watch configuration
  watchFiles: [],
  watchDirs: [],
} satisfies DexConfig
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `pagesDir` | `string` | `'web/pages'` | Directory containing route page components (`.tsx`) |
| `layoutsDir` | `string` | `'web/layouts'` | Directory containing layout components (`.tsx`, `.ts`) |
| `outRoutesTs` | `string` | `'core/router/.generated/routes.ts'` | Output file path for generated route definitions TypeScript |
| `outRoutesJson` | `string` | `'core/router/.generated/manifest.json'` | Output file path for generated route manifest JSON |
| `outLayoutsTs` | `string` | `'core/router/.generated/layouts.ts'` | Output file path for generated layout loader map TypeScript |
| `mode` | `string` | `'spa'` | Application mode (`'spa'` or `'mpa'`) |
| `port` | `number` | `7990` | Server and dev port |
| `renderStrategy` | `string` | `'spa'` | Page rendering strategy (`'spa'`, `'ssg'`, `'ssr'`, `'ppr'`, `'dynamic'`) |
| `watchFiles` | `string[]` | `[]` | Additional file paths to watch |
| `watchDirs` | `string[]` | `[]` | Additional directory paths to watch |

## Config File Resolution

Dex searches for configuration files starting from the current working directory up to the filesystem root, checking for:
- `dex.config.ts`
- `dex.config.js`
- `dex.config.mjs`
- `dex.config.cjs`

All relative paths specified in the configuration are resolved against the directory containing the config file.

## See Also

- [CLI Flags](./cli-flags) — Command-line overrides
- [Configuration Concept](../core-concepts/configuration) — How config works