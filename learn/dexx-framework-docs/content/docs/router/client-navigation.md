---
title: "Client Navigation"
---

# Client Navigation

Use the client router for navigation between pages without full page loads.

## Link Component

```tsx
import Link from '@dex/router/client/link'

export default function Nav() {
  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/about">About</Link>
      <Link href="/users/123">User 123</Link>
    </nav>
  )
}
```

## useRouter Hook

Programmatic navigation:

```tsx
import { useRouter } from '@dex/router/client'

export default function BackButton() {
  const router = useRouter()
  
  return (
    <button onClick={() => router.back()}>
      Go Back
    </button>
  )
}
```

## useParams Hook

Access route parameters:

```tsx
import { useParams, useRouter } from '@dex/router/client'

export default function UserPage() {
  const { id } = useParams()
  const router = useRouter()
  
  return (
    <div>
      <h1>User: {id}</h1>
      <button onClick={() => router.push('/users')}>
        All Users
      </button>
    </div>
  )
}
```

## router.push vs window.location

Use `router.push()` for client-side navigation:

```tsx
// Client-side (no full reload)
router.push('/about')

// Full page load
window.location.href = '/about'
```

## See Also

- [Routing Rules](./routing-rules) — Route patterns
- [Dynamic Routes](./dynamic-routes) — Route parameters
- [SPA Fallback](../server/spa-fallback) — How client routing works