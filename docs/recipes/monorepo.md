# Monorepo Setup

Use Dex in a monorepo with other packages.

## Structure

```
my-monorepo/
├─ packages/
│  ├─ web/           # Dex app
│  │  ├─ dex.config.ts
│  │  ├─ web/
│  │  └─ package.json
│  └─ api/           # Other package
├─ package.json
└─ tsconfig.json
```

## Workspace Config

In `packages/web/dex.config.ts`:

```ts
import { defineConfig } from 'dex/config'

export default defineConfig({
  pagesDir: 'web/pages',
  layoutsDir: 'web/layouts',
  publicDir: 'web/public',
  outDir: 'web/.generated',
})
```

## Root Package.json

```json
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "dev": "cd packages/web && bun run dev",
    "build": "cd packages/web && bun run build"
  }
}
```

## Cross-Package Imports

```ts
// packages/web/web/pages/index.tsx
import { shared } from '@my-org/shared'

export default function Home() {
  return <h1>{shared.title}</h1>
}
```

## See Also

- [Custom Structure](./custom-structure) — Config options
- [Workspace Setup](https://bun.sh/doc/workspace) — Bun workspaces