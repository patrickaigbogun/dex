# Dynamic Routes

Use `[param]` syntax to create dynamic routes that capture URL segments.

## Basic Dynamic Route

Create `web/pages/users/[id].tsx`:

```tsx
import { useParams } from '@dex/router/client'

export default function User() {
  const { id } = useParams()
  
  return <h1>User: {id}</h1>
}
```

| URL | Params |
|-----|--------|
| `/users/123` | `{ id: '123' }` |
| `/users/john` | `{ id: 'john' }` |

## Multiple Parameters

Create `web/pages/posts/[year]/[month]/[slug].tsx`:

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

| URL | Params |
|-----|--------|
| `/posts/2024/01/hello` | `{ year: '2024', month: '01', slug: 'hello' }` |

## Type Safety

Params are typed as strings. Parse as needed:

```tsx
const { id } = useParams()
const userId = parseInt(id, 10)
```

## Optional Parameters

For optional segments, use a layout to handle missing params:

```tsx
// web/pages/blog/[...slug].tsx
import { useParams } from '@dex/router/client'

export default function BlogPost() {
  const { slug } = useParams()
  
  if (!slug) return <h1>All Posts</h1>
  
  return <h1>Post: {slug.join('/')}</h1>
}
```

## See Also

- [Routing Rules](./routing-rules) — Route patterns overview
- [Layouts](./layouts) — Layout composition
- [Client Navigation](./client-navigation) — Navigation hooks