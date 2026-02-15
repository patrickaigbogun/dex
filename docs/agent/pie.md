````markdown
# `@dex/pie` (Dex Pie)

A small wrapper around Eden `treaty` that keeps Dex’s “explicit + typed” philosophy:

- You export a single API app type from the server (`export type Api = typeof api`).
- You create a typed client from that type.
- Pie adds a retrying transport and a simple header-merge helper.

## Server side: define the API type

In the starter template this lives in `templates/starter/core/api/index.ts`:

```ts
import { Elysia } from 'elysia'

export const api = new Elysia()
  // ...routes...

export type Api = typeof api
```

## Client side: create a typed client

```ts
import pie from '@dex/pie'
import type { Api } from '@core/api'

const client = pie<Api>('http://localhost:7990/api', {
  pieHeaders: () => ({
    // Authorization: `Bearer ${token}`,
  }),
  retry: {
    retries: 2,
  },
})

const res = await client.health.get()

if (res.error) {
  // res.error is typed by status code
  throw new Error(`API error: ${res.status}`)
}

console.log(res.data)
```

## Options

Pie options are Eden `Treaty.Config` plus:

- `pieHeaders`: `Record<string, string>` or `() => Record<string, string>` merged into every request.
- `pieFetch`: custom fetch function (useful for SSR/tests).
- `retry`: retry policy (status-based + network errors).

````
