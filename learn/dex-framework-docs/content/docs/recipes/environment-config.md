---
title: "Environment Config"
---

# Environment-Specific Config

Configure Dex differently for different environments.

## Using Environment Variables

```ts
// dex.config.ts
export default {
  // Use different paths based on environment
  pagesDir: process.env.CUSTOM_PAGES_DIR || 'web/pages',
  
  // Custom generated routes output
  outRoutesTs: process.env.CUSTOM_ROUTES_TS || 'core/router/.generated/routes.ts',
}
```

## Environment-Specific Features

```ts
export default {
  // Set mode or port from environment
  port: Number(process.env.PORT) || 7990,
  mode: process.env.DEX_MODE || 'spa',
}
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