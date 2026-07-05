---
title: "Routing Rules"
---

# Routing Rules

Dex uses file-based routing. Your folder structure defines your routes.

## Basic Patterns

| File | Route |
|------|-------|
| `web/pages/index.tsx` | `/` |
| `web/pages/about.tsx` | `/about` |
| `web/pages/blog/index.tsx` | `/blog` |
| `web/pages/blog/posts.tsx` | `/blog/posts` |

## Dynamic Routes

Use `[param]` to capture URL segments:

| File | Route | Example |
|------|-------|---------|
| `web/pages/users/[id].tsx` | `/users/:id` | `/users/123` |
| `web/pages/blog/[year]/[month]/[slug].tsx` | `/blog/:year/:month/:slug` | `/blog/2024/01/hello` |

### Accessing Params

```tsx
import { useParams } from '@dex/router/client'

export default function Post() {
  const { year, month, slug } = useParams()
  
  return (
    <article>
      <h1>{slug}</h1>
      <p>Published: {month}/{year}</p>
    </article>
  )
}
```

## Catch-All Routes

Use `[...param]` to match any path:

| File | Route |
|------|-------|
| `web/pages/[...slug].tsx` | `/*` |

```tsx
// web/pages/[...slug].tsx
import { useParams } from '@dex/router/client'

export default function CatchAll() {
  const { slug } = useParams()
  return <h1>Not found: {slug?.join('/') || '/'}</h1>
}
```

## Ignore Rules

Files/folders starting with `_` are ignored:

| File | Status |
|------|--------|
| `web/pages/_private.tsx` | ❌ Ignored |
| `web/pages/_utils/helper.tsx` | ❌ Ignored |

## Route Precedence

1. **Static routes** — `/about` matches before `/blog/[slug]`
2. **Dynamic routes** — `/blog/[slug]` matches `/blog/123`
3. **Catch-all** — `/[...slug]` matches everything else

## Generated Output

After build, routes are in `core/router/.generated/routes.ts`:

```ts
export const routes = [
  { path: '/', component: () => import('../pages/index.tsx') },
  { path: '/about', component: () => import('../pages/about.tsx') },
  { path: '/blog/:slug', component: () => import('../pages/blog/[slug].tsx') }
]
```

**Don't edit this file** — it's auto-generated.

## See Also

- [Dynamic Routes](./dynamic-routes) — Using route parameters
- [Layouts](./layouts) — Layout composition
- [Client Navigation](./client-navigation) — Link and navigation