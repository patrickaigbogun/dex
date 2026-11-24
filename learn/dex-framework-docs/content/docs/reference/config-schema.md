---
title: "Config Schema"
---

# Config Schema

Reference for `dex.config.ts` (`DexConfig` schema).

## Complete `DexConfig` Example

```ts
import type { DexConfig } from '@dex/router'

export default {
  mode: 'spa',
  port: 7990,
  renderStrategy: 'spa',
  pagesDir: 'web/pages',
  layoutsDir: 'web/layouts',
  outRoutesTs: 'core/router/.generated/routes.ts',
  outRoutesJson: 'core/router/.generated/manifest.json',
  outLayoutsTs: 'core/router/.generated/layouts.ts',
  subdomains: {
    admin: '/admin',
    api: '/api',
  },
  fonts: {
    sans: {
      family: 'Inter',
      variable: '--font-sans',
      weights: '100..900',
      display: 'swap',
      provider: 'google',
    },
  },
  apiSpec: 'https://api.example.com/openapi.json',
  apiUrl: 'https://api.example.com',
  outApiTs: 'core/api/generated.ts',
  apiPrefix: '/api',
  watchFiles: [],
  watchDirs: [],
  packageVersions: {},
} satisfies DexConfig
```

## Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `'spa' \| 'mpa'` | `'spa'` | Application mode |
| `port` | `number` | `7990` | Default server port |
| `renderStrategy` | `'spa' \| 'ssg' \| 'ssr' \| 'ppr' \| 'dynamic'` | `'spa'` | Default page rendering strategy |
| `pagesDir` | `string` | `'web/pages'` | Directory containing route page components |
| `layoutsDir` | `string` | `'web/layouts'` | Directory containing layout components |
| `outRoutesTs` | `string` | `'core/router/.generated/routes.ts'` | Output path for generated routes TypeScript |
| `outRoutesJson` | `string` | `'core/router/.generated/manifest.json'` | Output path for generated route manifest JSON |
| `outLayoutsTs` | `string` | `'core/router/.generated/layouts.ts'` | Output path for generated layouts map TypeScript |
| `subdomains` | `Record<string, string>` | `{}` | Subdomain routing prefix mapping |
| `fonts` | `DexFontsConfig` | `{}` | Google Fonts configuration spec |
| `apiSpec` | `string` | `undefined` | OpenAPI spec path or URL for `dex pie generate` |
| `apiUrl` | `string` | `undefined` | Default API base URL for client initialization |
| `outApiTs` | `string` | `'core/api/generated.ts'` | Output path for generated API client |
| `apiPrefix` | `string` | `'/api'` | API prefix to strip from route tree |
| `watchFiles` | `string[]` | `[]` | Additional files to watch |
| `watchDirs` | `string[]` | `[]` | Additional directories to watch |
| `packageVersions` | `Record<string, string>` | `{}` | Pin framework package versions |

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