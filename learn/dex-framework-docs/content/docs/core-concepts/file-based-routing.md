---
title: "File Based Routing"
---

# File-Based Routing

Dex uses your folder structure under `web/pages/` to define routes. No manual route table is needed — create `.tsx` files in `web/pages/`, and `@dex/router` generates typed route definitions automatically.

## Basic Routes

| File | Route |
|------|-------|
| `web/pages/index.tsx` | `/` |
| `web/pages/about.tsx` | `/about` |
| `web/pages/contact.tsx` | `/contact` |

## Nested Routes

| File | Route |
|------|-------|
| `web/pages/blog/index.tsx` | `/blog` |
| `web/pages/blog/posts.tsx` | `/blog/posts` |
| `web/pages/blog/[slug].tsx` | `/blog/:slug` |

## Dynamic Routes

Use `[param]` to capture URL segments:

| File | Route | Example URL |
|------|-------|-------------|
| `web/pages/users/[id].tsx` | `/users/:id` | `/users/123` |
| `web/pages/posts/[year]/[month]/[slug].tsx` | `/posts/:year/:month/:slug` | `/posts/2026/01/hello` |

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
      <h1>Post: {slug}</h1>
      <p>Published: {month}/{year}</p>
    </article>
  )
}
```

## Catch-All Routes

Use `[...param]` to match any remaining path segments:

| File | Route |
|------|-------|
| `web/pages/[...slug].tsx` | `/*slug` |

```tsx
// web/pages/[...slug].tsx
import { useParams } from '@dex/router/client'

export default function CatchAll() {
  const { slug } = useParams<{ slug: string[] }>()

  return <h1>Not found: {slug?.join('/') || '/'}</h1>
}
```

## Ignore Rules

Files and folders starting with `_` (as well as symlinks) are ignored by the route generator:

| File | Status |
|------|--------|
| `web/pages/_private.tsx` | Ignored |
| `web/pages/_utils/helper.tsx` | Ignored |
| `web/pages/blog/_internal/index.tsx` | Ignored |

## Route Precedence

Routes are sorted deterministically by segment specificity (`sortRoutesByPrecedence`):

1. **Static segments** (score 3) — `/about` matches before `/[slug]`
2. **Dynamic param segments** (score 2) — `/blog/[slug]` matches `/blog/123`
3. **Catch-all segments** (score 1) — `/[...slug]` matches everything else

When two routes share the same prefix scores, routes with more segments take precedence, followed by alphabetical ordering.

## Edge Cases

### Trailing Slashes

- `web/pages/blog.tsx` resolves to `/blog`
- `web/pages/blog/index.tsx` also resolves to `/blog`

Avoid creating both `about.tsx` and `about/index.tsx`, as they map to the same `/about` path.

### Optional Catch-All

Combine an index page with a catch-all file:

```text
web/pages/index.tsx        -> /
web/pages/[...slug].tsx    -> /*slug
```

## Generated Output

Running `dex start`, `dex build`, or `dex-router generate` outputs `core/router/.generated/routes.ts` and `core/router/.generated/manifest.json`:

```ts
/* eslint-disable */
// AUTO-GENERATED. DO NOT EDIT.
import type { Route } from '@dex/router'

export const routes: Route[] = [
  {
    file: 'index.tsx',
    path: '/',
    segments: [],
    importPage: () => import('../../../web/pages/index.tsx'),
  },
  {
    file: 'about.tsx',
    path: '/about',
    segments: [{ kind: 'static', value: 'about' }],
    importPage: () => import('../../../web/pages/about.tsx'),
  },
  {
    file: 'blog/[slug].tsx',
    path: '/blog/:slug',
    segments: [
      { kind: 'static', value: 'blog' },
      { kind: 'param', name: 'slug' },
    ],
    importPage: () => import('../../../web/pages/blog/[slug].tsx'),
  },
]
```

Each entry uses a lazy `importPage: () => import(...)` loader so Bun can code-split route chunks cleanly during production builds. **Do not edit generated files** — they are overwritten automatically.

## See Also

- [Pages and Layouts](./pages-and-layouts) — How pages compose with layouts and metadata
- [Configuration](./configuration) — Customize route directories and subdomains
- [Client Navigation](../router/client-navigation) — `<Link>`, prefetching, and `RouterErrorBoundary`
