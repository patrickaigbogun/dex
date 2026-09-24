---
title: "Client Navigation"
---

# Client Navigation

Use the client router (`@dex/router/client`) for fast, client-side navigation between pages without full browser reloads.

## Link Component & Prefetching

The `<Link />` component performs client-side navigation via HTML5 History API while maintaining accessible anchor attributes and intelligent route prefetching:

```tsx
import { Link } from '@dex/router/client'

export default function Nav() {
  return (
    <nav>
      {/* Prefetches route module when hovered (debounced by 65ms) or focused */}
      <Link to="/" prefetch="intent">Home</Link>
      
      {/* Prefetches immediately on initial component render */}
      <Link to="/about" prefetch="render">About</Link>
      
      {/* Disable prefetching for heavy or rarely visited routes */}
      <Link to="/admin" prefetch="none">Admin</Link>
      
      {/* Replace current history entry */}
      <Link to="/login" replace>Login</Link>
    </nav>
  )
}
```

> [!TIP]
> **Data Saver Aware:** If the user has Data Saver enabled (`navigator.connection.saveData === true`), Dex automatically suppresses background hover/render prefetching to conserve user bandwidth.

External links (e.g. `https://...`), anchor hashes (`#section`), or clicks with modifier keys (`Cmd` / `Ctrl`) automatically fall back to native browser navigation.

## useNavigate Hook

Use `useNavigate()` for programmatic navigation:

```tsx
import { useNavigate } from '@dex/router/client'

export default function LoginButton() {
  const navigate = useNavigate()
  
  const handleLogin = async () => {
    // perform login...
    // Push new entry:
    navigate('/dashboard')
    
    // Or replace history entry:
    // navigate('/dashboard', { replace: true })
  }

  return (
    <button onClick={handleLogin}>
      Log In
    </button>
  )
}
```

## useIsNavigating Hook

Track background route loading and concurrent transition state:

```tsx
import { useIsNavigating } from '@dex/router/client'

export function GlobalNavProgress() {
  const isNavigating = useIsNavigating()
  
  if (!isNavigating) return null
  return <div className="fixed top-0 left-0 right-0 h-1 bg-blue-500 animate-pulse" />
}
```

## usePrefetch Hook

Programmatically preload route modules and layouts ahead of user action:

```tsx
import { usePrefetch } from '@dex/router/client'

export function QuickMenu() {
  const prefetch = usePrefetch()
  
  return (
    <div onMouseEnter={() => prefetch('/heavy-dashboard')}>
      Hover to warm up dashboard
    </div>
  )
}
```

## useParams Hook

Access dynamic route parameters (e.g. `[id].tsx` or `[...slug].tsx`):

```tsx
import { useParams } from '@dex/router/client'

export default function UserPage() {
  const { id } = useParams<{ id: string }>()
  
  return (
    <div>
      <h1>User: {id}</h1>
    </div>
  )
}
```

For catch-all routes like `[...slug].tsx`, `slug` is returned as a `string[]`.

## useLocation Hook

Access the current URL pathname and search string:

```tsx
import { useLocation } from '@dex/router/client'

export default function CurrentPath() {
  const { pathname, search } = useLocation()
  
  return <p>Current path: {pathname}{search}</p>
}
```

## useQuery Hook

Access URL query parameters as a standard `URLSearchParams` object:

```tsx
import { useQuery } from '@dex/router/client'

export default function FilterPage() {
  const query = useQuery()
  const tab = query.get('tab') || 'overview'
  
  return <div>Active tab: {tab}</div>
}
```

## ClientOnly & clientOnly

Prevent hydration mismatches for components that rely on browser-only APIs during SSG/prerendering:

```tsx
import { ClientOnly, clientOnly } from '@dex/router/client'
import DynamicChart from '../components/Chart'

// As a JSX component wrapper:
export function Dashboard() {
  return (
    <ClientOnly fallback={<p>Loading chart...</p>}>
      <DynamicChart />
    </ClientOnly>
  )
}

// Or as a Higher-Order Component (HOC):
export const ClientChart = clientOnly(DynamicChart, <p>Loading...</p>)
```

## See Also

- [Routing Rules](./routing-rules) — Route patterns
- [Dynamic Routes](./dynamic-routes) — Capturing URL parameters
- [Layouts](./layouts) — Layout composition
- [Router API Reference](./reference) — Complete API signatures