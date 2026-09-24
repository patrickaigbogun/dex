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

## Route Precedence & Ranking

Dex sorts routes deterministically using segment specificity scoring:

1. **Static segments (`kind: 'static'`, Score = 3)** — Exact path matches (e.g. `/posts/new`).
2. **Param segments (`kind: 'param'`, Score = 2)** — Named dynamic parameters (e.g. `/posts/[slug]`).
3. **Catch-All segments (`kind: 'catchAll'`, Score = 1)** — Fallback rest parameters (e.g. `/posts/[...all]`).

### Example Ordering
When an incoming request is evaluated, routes are checked in precedence order:

| Specificity Order | Route File | Pattern | Matches Example |
|---|---|---|---|
| **1 (Highest)** | `web/pages/posts/new.tsx` | `/posts/new` | `/posts/new` |
| **2** | `web/pages/posts/[slug].tsx` | `/posts/:slug` | `/posts/announcing-dex` |
| **3 (Lowest)** | `web/pages/posts/[...all].tsx` | `/posts/*` | `/posts/2026/09/21/deep-dive` |

This guarantees that a static page like `/posts/new` is never eclipsed by a dynamic parameter `[slug]`.

## Generated Output

When running `dex-router generate` or during `bun run build`, routes are written to `core/router/.generated/routes.ts`:

```ts
import type { Route } from '@dex/router'

export const routes: Route[] = [
  {
    file: 'posts/new.tsx',
    path: '/posts/new',
    segments: [
      { kind: 'static', value: 'posts' },
      { kind: 'static', value: 'new' }
    ],
    importPage: () => import('../../web/pages/posts/new.tsx'),
  },
  {
    file: 'posts/[slug].tsx',
    path: '/posts/[slug]',
    segments: [
      { kind: 'static', value: 'posts' },
      { kind: 'param', name: 'slug' }
    ],
    importPage: () => import('../../web/pages/posts/[slug].tsx'),
  }
]
```

**Don't edit this file** — it is automatically generated and synchronized on file changes.

## See Also

- [Dynamic Routes](./dynamic-routes) — Using route parameters
- [Layouts](./layouts) — Layout composition
- [Client Navigation](./client-navigation) — Link and navigation