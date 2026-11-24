---
title: "Dynamic Routes"
---

# Dynamic Routes

Use `[param]` and `[...param]` syntax to create dynamic routes that capture URL segments.

## Basic Dynamic Route

Create `web/pages/users/[id].tsx`:

```tsx
import { useParams } from '@dex/router/client'

export default function User() {
  const { id } = useParams<{ id: string }>()

  return <h1>User: {id}</h1>
}
```

| URL | Params |
|-----|--------|
| `/users/123` | `{ id: '123' }` |
| `/users/jane.doe` | `{ id: 'jane.doe' }` |
| `/users/hello%20world` | `{ id: 'hello world' }` |

Matched segments are automatically decoded with `decodeURIComponent` (falling back to the raw segment if percent-encoding is malformed).

## Multiple Parameters

Create `web/pages/posts/[year]/[month]/[slug].tsx`:

```tsx
import { useParams } from '@dex/router/client'

export default function Post() {
  const { year, month, slug } = useParams<{
    year: string
    month: string
    slug: string
  }>()

  return (
    <article>
      <h1>{slug}</h1>
      <p>Published: {month}/{year}</p>
    </article>
  )
}
```

| URL | Params |
|-----|--------|
| `/posts/2026/01/hello` | `{ year: '2026', month: '01', slug: 'hello' }` |

## Type Safety

Params are returned as `string` for `[param]` segments and `string[]` for `[...param]` catch-all segments. Parse numeric IDs as needed:

```tsx
const { id } = useParams<{ id: string }>()
const userId = Number.parseInt(id, 10)
```

## Catch-All Routes

Use `[...param]` to capture zero or more trailing segments as an array of strings:

```tsx
// web/pages/blog/[...slug].tsx
import { useParams } from '@dex/router/client'

export default function BlogCatchAll() {
  const { slug } = useParams<{ slug: string[] }>()

  if (!slug || slug.length === 0) return <h1>All Posts</h1>

  return <h1>Post: {slug.join('/')}</h1>
}
```

| URL | Params |
|-----|--------|
| `/blog` | `{ slug: [] }` |
| `/blog/2026/release` | `{ slug: ['2026', 'release'] }` |

## Precedence & Static Overrides

Static routes always take priority over dynamic routes at the same segment position (`Static = 3 > Param = 2 > Catch-All = 1`). For example, `web/pages/users/settings.tsx` always matches `/users/settings` ahead of `web/pages/users/[id].tsx`.

## Dynamic Routes and SSG

During `dexPrerender`, only routes where every segment has `kind: 'static'` are prerendered at build time. Dynamic `[param]` and `[...param]` routes fall back to SPA rendering via `dexSpaFallback` and hydrate smoothly on the client.

If you render a dynamic component manually during SSR/SSG with `renderToString`, wrap it in `<RouterContext.Provider value={createStaticRouterState('/users/123', { id: '123' })}>` so `useParams()` resolves cleanly.

## See Also

- [Routing Rules](./routing-rules) — Route patterns and precedence scoring
- [Layouts](./layouts) — Layout composition and metadata
- [Client Navigation](./client-navigation) — Navigation hooks and SSG context
