# File-Based Routing

Dex uses your folder structure to define routes. No config needed — just create files in `web/pages/`.

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
| `web/pages/posts/[year]/[month]/[slug].tsx` | `/posts/:year/:month/:slug` | `/posts/2024/01/hello` |

### Accessing Params

```tsx
import { useParams } from '@dex/router/client'

export default function Post() {
  const { year, month, slug } = useParams()
  
  return (
    <article>
      <h1>Post: {slug}</h1>
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

Files and folders starting with `_` are ignored:

| File | Status |
|------|--------|
| `web/pages/_private.tsx` | ❌ Ignored |
| `web/pages/_utils/helper.tsx` | ❌ Ignored |
| `web/pages/blog/_internal/index.tsx` | ❌ Ignored |

## Route Precedence

Routes are matched in this order:

1. **Static routes** — `/about` matches before `/blog/[slug]`
2. **Dynamic routes** — `/blog/[slug]` matches `/blog/123`
3. **Catch-all** — `/[...slug]` matches everything else

## Edge Cases

### Trailing Slashes

- `web/pages/blog.tsx` → `/blog` (no trailing slash)
- `web/pages/blog/index.tsx` → `/blog` (same as above)

### Optional Catch-All

To make a catch-all optional, use it alongside a static route:

```
web/pages/index.tsx        → /
web/pages/[...slug].tsx    → /*slug (optional)
```

### Duplicate Routes

Dex will error if you have duplicate route definitions:

```
web/pages/about.tsx
web/pages/blog/about.tsx   → ❌ Error: duplicate route
```

## Generated Output

After `bun run build`, routes are generated in `core/router/.generated/routes.ts`:

```ts
export const routes = [
  { path: '/', component: () => import('../pages/index.tsx') },
  { path: '/about', component: () => import('../pages/about.tsx') },
  { path: '/blog/:slug', component: () => import('../pages/blog/[slug].tsx') }
]
```

**Don't edit this file** — it's auto-generated.

## See Also

- [Pages and Layouts](./pages-and-layouts) — How pages compose with layouts
- [Configuration](./configuration) — Customize folder structure
- [Client Navigation](./client-navigation) — Navigate between routes