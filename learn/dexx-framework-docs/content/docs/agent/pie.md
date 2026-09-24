---
title: "Pie"
---

# `@dex/pie` (Dex Pie)

A high-performance, framework-agnostic typed API client and OpenAPI route-tree generator:

- Turns any backend API contract (Phoenix, Go, Rails, FastAPI, Express) into a **typed, autocompleteable route tree** (`api.v1.guilds('123').channels('456').messages.get(...)`).
- Uses **OpenAPI as the cross-repository bridge** to generate route trees and DTO interfaces into `core/api/generated.ts`.
- Built-in resilient transport: exponential backoff with jitter retries, dynamic auth headers, request/response interceptors, and one-off `baseUrl` overrides.
- First-party Eden Treaty adapter (`treatyPie`) available for fullstack Elysia setups.

---

## 1. Generating Route Tree from Backend OpenAPI

Run the `dex pie generate` CLI command pointing to your backend's OpenAPI URL or local JSON file:

```bash
bunx dex pie generate https://api.concord.chat/api/openapi.json
```

Or configure `dex.config.ts`:

```ts
// dex.config.ts
export default {
  mode: 'spa',
  apiSpec: 'https://api.concord.chat/api/openapi.json',
  apiUrl: 'https://api.concord.chat',
  outApiTs: 'core/api/generated.ts',
  apiPrefix: '/api', // Stripped from tree access so you write api.v1... not api.api.v1...
}
```

Then simply run:

```bash
bunx dex pie generate
```

This generates `core/api/generated.ts` containing:
- All schema models & DTO interfaces (e.g. `Message`, `User`, `CreateMessageDto`).
- The `ApiRoutes` route tree contract.
- The preconfigured `createApiClient()` factory function.

---

## 2. Consuming the Typed API Route Tree in Frontend

```ts
// core/api/index.ts
import { createApiClient } from './generated'

export const api = createApiClient({
  headers: () => ({
    Authorization: `Bearer ${getAuthToken()}`,
  }),
  retry: {
    retries: 3,
    minDelayMs: 150,
    maxDelayMs: 2000,
    retryOnStatuses: [408, 425, 429, 500, 502, 503, 504],
  },
})
```

### Making Calls:

```ts
// 1. Static route with query parameters:
// GET /api/v1/health?verbose=true
const { data, error, status } = await api.v1.health.get({
  query: { verbose: true }
})

// 2. Dynamic subroutes:
// GET /api/v1/guilds/123/channels/456/messages?limit=50
const { data: messages } = await api.v1
  .guilds('123')
  .channels('456')
  .messages.get({
    query: { limit: 50 }
  })

// 3. Typed request body:
// POST /api/v1/channels/456/messages
const { data: createdMessage } = await api.v1
  .channels('456')
  .messages.post({
    body: {
      content: 'Hello Concord!',
    }
  })

// 4. One-off base URL override (e.g. calling a dedicated voice microservice):
const { data: voiceSession } = await api.voice.session.get({
  baseUrl: 'https://voice.concord.chat'
})
```

---

## 3. First-Party Elysia Eden Mode (Optional)

If backend and frontend share TypeScript types in a monorepo with Elysia:

```ts
import { treatyPie } from '@dex/pie/treaty'
import type { App } from './server'

export const elysiaClient = treatyPie<App>('http://localhost:3000')
```


