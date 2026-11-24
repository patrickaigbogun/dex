---
title: "Pie (Typed API Client)"
---

# `@dex/pie` — Typed API Client

Dex Pie is a **framework-agnostic, typed route-tree HTTP client** and **OpenAPI code generator**.

It turns any OpenAPI 3.0 / 3.1 / Swagger contract (Phoenix, Go, Rails, FastAPI, NestJS, Express, Elysia) into an autocompleteable TypeScript route tree:

```ts
// Chainable, type-safe API calls
const { data, error, status } = await api.v1.guilds('123').channels('456').messages.get({
  query: { limit: 50 },
})
```

---

## Key Features

1. **Framework-Agnostic**: Zero runtime framework dependencies. Uses standard `fetch`, `Headers`, `Request`, and `AbortSignal` — works in Browsers, Bun, Node.js, Deno, and Cloudflare Workers.
2. **Native YAML & JSON OpenAPI 3.0/3.1 Codegen**: Both the native Go CLI (`dex pie generate`) and `@dex/pie/generator` (`generateApi` using `Bun.YAML.parse` / `JSON.parse`) support JSON and YAML specs out of the box (up to 50 MB) with code-injection sanitization for titles, versions, parameter names, query keys, and `$ref` schemas.
3. **Safe Idempotent-Only Default Retries**: Automatic exponential backoff with jitter retries only idempotent HTTP methods (`GET`, `HEAD`, `OPTIONS`, `PUT`, `DELETE`) by default so `POST` and `PATCH` mutations are never duplicated on transient 5xx errors unless explicitly opted in.
4. **Hardened Security Defaults**: Built-in Client-Side Path Traversal (CSPT) protection rejecting `.` / `..` / `/` / `\` path segments, plus automatic stripping of global auth headers on cross-origin `baseUrl` overrides.
5. **Per-Request Timeouts & Raw Bodies**: `timeoutMs` via `AbortSignal.timeout` (composed with any caller `signal` via `AbortSignal.any`) and first-class support for `Uint8Array`, `ArrayBuffer`, `FormData`, `Blob`, `URLSearchParams`, and `string` bodies.
6. **Lifecycle Hooks**: `onRequest`, `onResponse`, and `onError` interceptors, plus async `headers` factories for dynamic token refresh.

---

## 1. Code Generation (`dex pie generate`)

Generate a typed route-tree client from a JSON or YAML OpenAPI specification:

```bash
# From a remote URL (JSON or YAML)
dex pie generate https://api.example.com/openapi.yaml

# Or from a local file
dex pie generate ./openapi.json
dex pie generate ./openapi.yaml
```

You can also invoke the TypeScript generator programmatically via `@dex/pie/generator`:

```ts
import { generateApi } from '@dex/pie/generator'

await generateApi({
  spec: './openapi.yaml',
  outTs: 'core/api/generated.ts',
  prefix: '/api',
  defaultBaseUrl: 'https://api.example.com',
})
```

### Identifier & Comment Sanitization

Both the Go CLI generator and `@dex/pie/generator` sanitize untrusted OpenAPI metadata before emitting TypeScript:
- Schema `$ref` names, dynamic route parameter names, and TypeScript reserved words are normalized into safe identifiers (`sanitizeTsIdentifier`).
- Non-identifier object property names and query parameter keys are safely JSON-quoted.
- `info.title` and `info.version` strip `\r`, `\n`, `\u2028`, and `\u2029` to prevent comment-breakout code injection.

### Configuration (`dex.config.ts`)

```ts
// dex.config.ts
export default {
  mode: 'spa',
  apiSpec: 'https://api.example.com/openapi.yaml',
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
- All schema models and DTO interfaces/types (including `oneOf`/`anyOf` unions, `enum` literals, `additionalProperties` maps, and `format: 'binary'` -> `Blob | File`).
- The `ApiRoutes` route-tree type interface.
- A preconfigured `createApiClient(options?)` factory.

---

## 2. Client Setup (`lib/api.ts`)

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
    retries: 2,
    minDelayMs: 150,
    maxDelayMs: 1500,
    factor: 2,
    jitter: 0.2,
    methods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'],
    retryOnStatuses: [408, 425, 429, 500, 502, 503, 504],
  },
})
```

### Default Retry Behavior (Idempotent Methods Only)

By default, `@dex/pie` only retries idempotent methods (`['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']`) on network errors and status codes `[408, 425, 429, 500, 502, 503, 504]`. `POST` and `PATCH` requests are **not** retried automatically so transient `500`s never cause duplicate writes.

To explicitly allow retries on `POST` (for example with an idempotency key) or customize retry logic:

```ts
export const idempotentPostApi = createPie<ApiRoutes>({
  baseUrl: 'https://api.example.com',
  retry: {
    retries: 3,
    methods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE', 'POST'],
    // Or provide a custom predicate (bypasses default method allowlist):
    retryOn: ({ attempt, method, response, error }) => {
      if (error) return attempt <= 2
      return Boolean(response && response.status >= 500)
    },
  },
})
```

---

## 3. Usage Examples

### Static Subroutes & Query Parameters

```ts
// GET /api/v1/health?verbose=true
const { data, error, status } = await api.v1.health.get({
  query: { verbose: true },
})

if (error) {
  console.error('Health check failed:', status, error)
} else {
  console.log('Uptime:', data.uptime)
}
```

### Dynamic Path Parameters & CSPT Protection

```ts
// GET /api/v1/guilds/123/channels/456/messages?limit=50
const { data: messages } = await api.v1
  .guilds('123')
  .channels('456')
  .messages.get({
    query: { limit: 50 },
  })
```

Every dynamic path segment is trimmed, validated against `.` / `..` / `/` / `\` (Client-Side Path Traversal protection — throws `[dex-pie] Invalid path segment: ...`), and URI-encoded via `encodeURIComponent`.

### JSON & Raw Binary Request Bodies

Plain objects are serialized with `JSON.stringify` and receive `content-type: application/json` automatically (unless already set). Raw `Uint8Array`, `ArrayBuffer`, `FormData`, `Blob`, `URLSearchParams`, and `string` bodies are passed directly to `fetch` without JSON serialization:

```ts
// JSON body
const { data: message } = await api.v1
  .channels('456')
  .messages.post({
    body: { content: 'Hello Dex!' },
  })

// Multipart FormData upload
const form = new FormData()
form.append('file', fileBlob, 'avatar.png')
await api.v1.uploads.post({ body: form })

// Raw Uint8Array binary payload
const bytes = new Uint8Array([1, 2, 3, 4])
await api.v1.telemetry.post({
  body: bytes,
  headers: { 'content-type': 'application/octet-stream' },
})
```

### Per-Request Timeouts (`timeoutMs`) & `AbortSignal`

Use `timeoutMs` on any request to enforce a per-call timeout via `AbortSignal.timeout(timeoutMs)`. If you also pass a `signal`, both signals are combined with `AbortSignal.any([signal, timeoutSignal])`:

```ts
const controller = new AbortController()

const { data, error } = await api.v1.reports.get({
  timeoutMs: 5000,
  signal: controller.signal,
})
```

### Per-Request `baseUrl` & Cross-Origin Credential Protection

```ts
// Call an external or microservice endpoint with a one-off baseUrl:
const { data: voiceSession } = await api.voice.session.get({
  baseUrl: 'https://voice.example.com',
  headers: {
    'X-Special-Scope': 'voice:read',
  },
})
```

When a per-request `baseUrl` resolves to a different origin than the client's configured `baseUrl` (or `window.location.origin`, or uses a protocol-relative `//` URL), global `headers` (such as `Authorization` tokens) are **automatically stripped** to prevent leaking credentials cross-origin. Only explicit per-request `options.headers` are included on that request.

---

## 4. Fullstack Elysia Treaty Compatibility (Optional)

If your project shares TypeScript types in a monorepo with an Elysia backend, `@dex/pie` also exports the `treatyPie` adapter:

```ts
import { treatyPie } from '@dex/pie/treaty'
import type { App } from './server'

export const api = treatyPie<App>('http://localhost:3000')
```
