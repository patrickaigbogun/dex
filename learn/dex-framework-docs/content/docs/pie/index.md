---
title: "Pie (Typed API Client)"
---

# `@dex/pie` — Typed API Client

Dex Pie is a **framework-agnostic, typed route-tree HTTP client** and **OpenAPI code generator**.

It turns any backend API contract (Phoenix, Go, Rails, FastAPI, NestJS, Express, Elysia) into a fully autocompleteable TypeScript route tree:

```ts
// Chainable, type-safe API calls
const { data, error, status } = await api.v1.guilds('123').channels('456').messages.get({
  query: { limit: 50 }
})
```

---

## Key Features

1. **Framework-Agnostic**: Zero runtime framework dependencies. Uses standard `fetch`, `Headers`, and `Request` — works in Browsers, Node.js, Bun, Deno, and Cloudflare Workers.
2. **OpenAPI Route-Tree Generator**: Automatically parses OpenAPI 3.0 / 3.1 / Swagger specs to generate TypeScript DTO interfaces and route-tree types.
3. **Resilient HTTP**: Built-in exponential backoff with jitter on network retries (`408`, `429`, `5xx`).
4. **Dynamic Authentication**: Asynchronous headers support for token refresh logic.
5. **Request Interceptors**: `onRequest`, `onResponse`, and `onError` lifecycle hooks.

---

## 1. Code Generation (`dex pie generate`)

Generate a typed route-tree client from an OpenAPI specification:

```bash
# From a remote URL
dex pie generate https://api.example.com/openapi.json

# Or from a local file
dex pie generate ./openapi.json
```

### Configuration (`dex.config.ts`)

You can also specify your OpenAPI configuration in `dex.config.ts`:

```ts
// dex.config.ts
export default {
  mode: 'spa',
  apiSpec: 'https://api.example.com/openapi.json',
  apiUrl: 'https://api.example.com',
  outApiTs: 'core/api/generated.ts',
  apiPrefix: '/api', // Stripped so route calls start cleanly: api.v1...
}
```

Then run:
```bash
dex pie generate
```

This generates `core/api/generated.ts` containing:
- All schema models and DTO interfaces (e.g. `User`, `Message`, `CreateMessageDto`).
- The `ApiRoutes` route tree type interface.
- Preconfigured `createApiClient()` helper.

---

## 2. Client Setup (`lib/api.ts`)

In your application's userland directory (e.g. `lib/api.ts`):

```ts
// lib/api.ts
import { createPie } from '@dex/pie'
import type { ApiRoutes } from '@/core/api/generated'

export const api = createPie<ApiRoutes>({
  baseUrl: process.env.PUBLIC_API_URL || 'https://api.example.com',
  prefix: '/api',
  headers: () => ({
    Authorization: `Bearer ${getAuthToken()}`,
  }),
  retry: {
    retries: 3,
    minDelayMs: 150,
    maxDelayMs: 2000,
    factor: 2,
    jitter: 0.2,
    retryOnStatuses: [408, 425, 429, 500, 502, 503, 504],
  },
})
```

---

## 3. Usage Examples

### Static Subroutes & Query Parameters
```ts
// GET /api/v1/health?verbose=true
const { data, error, status } = await api.v1.health.get({
  query: { verbose: true }
})

if (error) {
  console.error('Health check failed:', error)
} else {
  console.log('Uptime:', data.uptime)
}
```

### Dynamic Path Parameters
```ts
// GET /api/v1/guilds/123/channels/456/messages?limit=50
const { data: messages } = await api.v1
  .guilds('123')
  .channels('456')
  .messages.get({
    query: { limit: 50 }
  })
```

### Typed Request Body
```ts
// POST /api/v1/channels/456/messages
const { data: message, status } = await api.v1
  .channels('456')
  .messages.post({
    body: {
      content: 'Hello Dex!',
    }
  })
```

### Per-Request BaseURL & Header Overrides
```ts
// Call a microservice endpoint with a custom base URL:
const { data: voiceSession } = await api.voice.session.get({
  baseUrl: 'https://voice.example.com',
  headers: {
    'X-Special-Scope': 'voice:read'
  }
})
```

---

## 4. Fullstack Elysia Treaty Compatibility (Optional)

If your project shares TypeScript types in a monorepo with an Elysia backend, `@dex/pie` also exports the `treatyPie` adapter:

```ts
import { treatyPie } from '@dex/pie/treaty'
import type { App } from './server'

export const api = treatyPie<App>('http://localhost:3000')
```
