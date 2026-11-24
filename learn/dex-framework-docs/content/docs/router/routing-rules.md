---
title: "Routing Rules"
---

# Routing Rules

Dex uses file-based routing. Your folder structure under `web/pages/` defines your application's URL routes.

## Basic Patterns

| File | Route |
|------|-------|
| `web/pages/index.tsx` | `/` |
| `web/pages/about.tsx` | `/about` |
| `web/pages/blog/index.tsx` | `/blog` |
| `web/pages/blog/posts.tsx` | `/blog/posts` |

Route files must use the `.tsx` extension. Index files (`index.tsx` or `folder/index.tsx`) map to the directory's root path.

## Dynamic Routes

Use `[param]` to capture URL segments:

| File | Route | Example |
|------|-------|---------|
| `web/pages/users/[id].tsx` | `/users/:id` | `/users/123` |
| `web/pages/blog/[year]/[month]/[slug].tsx` | `/blog/:year/:month/:slug` | `/blog/2026/01/hello` |

### Accessing Params

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

## Catch-All Routes

Use `[...param]` to match any remaining path depth:

| File | Route |
|------|-------|
| `web/pages/[...slug].tsx` | `/*` |
| `web/pages/docs/[...slug].tsx` | `/docs/*` |

```tsx
// web/pages/[...slug].tsx
import { useParams } from '@dex/router/client'

export default function CatchAll() {
  const { slug } = useParams<{ slug: string[] }>()
  return <h1>Not found: {slug?.join('/') || '/'}</h1>
}
```

## Ignore Rules & Symlink Safety

Both `generateFsRoutes` and `generateLayouts` enforce strict filtering when walking directories:

- **Underscore (`_`) prefix**: Any file or directory whose path segment starts with `_` is ignored. Use this for co-located helpers, components, or private modules.
- **Symbolic links**: Symbolic links (`isSymbolicLink()`) are skipped automatically during directory traversal to prevent infinite loops or unintended path traversal outside `web/pages/` and `web/layouts/`.
- **Type declarations**: In `web/layouts/`, `.d.ts` files are excluded; only `.tsx` and `.ts` modules are registered.

| Entry | Status | Reason |
|-------|--------|--------|
| `web/pages/_private.tsx` | Ignored | `_`-prefixed file |
| `web/pages/_utils/helper.tsx` | Ignored | `_`-prefixed directory |
| `web/pages/shared -> ../../shared` | Ignored | Symbolic link |

## Route Precedence & Ranking

`sortRoutesByPrecedence` sorts routes deterministically using segment specificity scoring (`getSegmentScore` / `compareRouteSegments`):

1. **Static segments (`kind: 'static'`, Score = 3)** — Exact path matches (e.g. `/posts/new`).
2. **Dynamic param segments (`kind: 'param'`, Score = 2)** — Named parameters (e.g. `/posts/[slug]`).
3. **Catch-all segments (`kind: 'catchAll'`, Score = 1)** — Rest parameters (e.g. `/posts/[...all]`).

When two segments at the same index have equal score, sorting compares their segment `value`/`name` lexicographically (`localeCompare`), then prefers routes with more segments, and finally breaks ties by `path.localeCompare(...)`.

### Example Ordering

| Specificity Order | Route File | Pattern | Matches Example |
|---|---|---|---|
| **1 (Highest)** | `web/pages/posts/new.tsx` | `/posts/new` | `/posts/new` |
| **2** | `web/pages/posts/[slug].tsx` | `/posts/:slug` | `/posts/announcing-dex` |
| **3 (Lowest)** | `web/pages/posts/[...all].tsx` | `/posts/*` | `/posts/2026/09/21/deep-dive` |

This guarantees that a static page like `/posts/new` is never eclipsed by a dynamic parameter `[slug]`.

## Generated Output

When running `dex-router generate` or during `bun run build`, routes are written to `core/router/.generated/routes.ts` (and `core/router/.generated/manifest.json`):

```ts
import type { Route } from '@dex/router'

export const routes: Route[] = [
  {
    file: 'posts/new.tsx',
    path: '/posts/new',
    segments: [
      { kind: 'static', value: 'posts' },
      { kind: 'static', value: 'new' },
    ],
    importPage: () => import('../../web/pages/posts/new.tsx'),
  },
  {
    file: 'posts/[slug].tsx',
    path: '/posts/[slug]',
    segments: [
      { kind: 'static', value: 'posts' },
      { kind: 'param', name: 'slug' },
    ],
    importPage: () => import('../../web/pages/posts/[slug].tsx'),
  },
]
```

**Do not edit generated files** — they are overwritten automatically by `dex-router generate` and `dex-router watch`.

## Subdomain Prefix Mapping

If you configure `subdomains` in `dex.config.ts` and `<FileRouter subdomains={...} />`, a route subtree such as `web/pages/blog/` (`/blog/*`) can be served directly on `blog.example.com/*` while keeping standard file-based routing intact. See [Client Navigation](./client-navigation#subdomain-routing) for details.

## See Also

- [Dynamic Routes](./dynamic-routes) — Using route parameters
- [Layouts](./layouts) — Layout composition and page metadata
- [Client Navigation](./client-navigation) — `<Link />`, `<FileRouter />`, and subdomain routing
- [Router Reference](./reference) — Full API reference
