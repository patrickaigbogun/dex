---
title: "Environment Config"
---

# Environment-Specific Config

Configure Dex differently for different environments.

## Using Environment Variables

```ts
// dex.config.ts
import { defineConfig } from 'dex/config'

export default defineConfig({
  // Use different paths in production
  pagesDir: process.env.NODE_ENV === 'production' 
    ? 'dist/pages'
    : 'web/pages',
  
  // Different output dirs
  outDir: process.env.CUSTOM_OUT_DIR || 'core',
})
```

## Environment-Specific Features

```ts
export default defineConfig({
  // Enable SPA fallback only in production
  spaFallback: process.env.NODE_ENV === 'production',
  
  // Different API endpoints
  apiUrl: process.env.API_URL || 'http://localhost:3000'
})
```

## .env Files

Create `.env` and `.env.production`:

```bash
# .env (development)
NODE_ENV=development
API_URL=http://localhost:3000

# .env.production
NODE_ENV=production
API_URL=https://api.example.com
```

## CLI Overrides

Pass environment at build time:

```bash
NODE_ENV=production bun run build
API_URL=https://api.example.com bun run build
```

## Using in Components

```tsx
// web/pages/index.tsx
const apiUrl = process.env.API_URL

export default function Home() {
  return (
    <div>
      <h1>Home</h1>
      <p>API: {apiUrl}</p>
    </div>
  )
}
```

## See Also

- [Configuration](../core-concepts/configuration) — Config options
- [Dev vs Production](../core-concepts/dev-vs-prod) — Environment differences