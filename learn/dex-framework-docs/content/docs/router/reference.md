---
title: "Reference"
---

# Router API Reference

Comprehensive reference for `@dex/router` client hooks, components, and server/generator APIs.

---

## Client API (`@dex/router/client`)

### `<Link />`

Client-side navigation link component that renders an accessible `<a>` tag, intercepts clicks for SPA routing, and provides intelligent route prefetching.

```tsx
import { Link } from '@dex/router/client'

<Link to="/about" prefetch="intent" className="nav-link">
  About
</Link>
```

#### Props
- `to: string` — Destination route path.
- `replace?: boolean` — If true, replaces the current history entry instead of pushing a new one.
- `prefetch?: 'intent' | 'render' | 'none' | boolean` — Prefetch strategy (default: `'intent'`):
  - `'intent'` — Prefetches route module on hover (debounced by 65ms) or focus.
  - `'render'` — Prefetches route module immediately when the link renders.
  - `'none'` / `false` — Disables prefetching.
  - Note: Prefetching automatically disables when data-saver mode (`navigator.connection.saveData`) is active.
- All standard `React.AnchorHTMLAttributes<HTMLAnchorElement>` (`className`, `target`, `rel`, `onClick`, etc.).

---

### `useNavigate()`

Returns the `navigate(to: string, options?: NavigateOptions)` function for programmatic client-side navigation.

```tsx
import { useNavigate } from '@dex/router/client'

const navigate = useNavigate()

// Push new history entry
navigate('/dashboard')

// Replace current history entry
navigate('/login', { replace: true })
```

---

### `useIsNavigating()`

Returns a boolean indicating whether a route transition or asynchronous page module is currently loading in the background.

```tsx
import { useIsNavigating } from '@dex/router/client'

export function LoadingBar() {
  const isNavigating = useIsNavigating()
  return isNavigating ? <div className="loading-bar" /> : null
}
```

---

### `useRouterState()`

Returns the complete current router state context.

```tsx
import { useRouterState } from '@dex/router/client'

const { pathname, search, hash, params, query, isNavigating, navigate, prefetch } = useRouterState()
```

---

### `usePrefetch()`

Returns a programmatic `prefetch(to: string): Promise<void>` function to preload route code and layouts ahead of time.

```tsx
import { usePrefetch } from '@dex/router/client'

const prefetch = usePrefetch()
prefetch('/settings')
```

---

### `<Outlet />` & `useOutletContext<T>()`

Provides an outlet point for nested layout rendering and lets child pages consume context passed down from the parent layout.

```tsx
// In layout:
import { Outlet } from '@dex/router/client'

export default function DashboardLayout() {
  const [user, setUser] = useState({ name: 'Alice' })
  return (
    <div className="dashboard">
      <Outlet context={{ user, setUser }} />
    </div>
  )
}

// In child page:
import { useOutletContext } from '@dex/router/client'

export default function ProfilePage() {
  const { user } = useOutletContext<{ user: { name: string } }>()
  return <h1>Hello, {user.name}</h1>
}
```

---

### `useParams<T>()`

Returns an object of parsed route parameters from dynamic route segments (`[id]`, `[...slug]`).

```tsx
import { useParams } from '@dex/router/client'

// Single param from /users/[id].tsx
const { id } = useParams<{ id: string }>()

// Catch-all param from /[...slug].tsx
const { slug } = useParams<{ slug: string[] }>()
```

---

### `useLocation()`

Returns the current route location object.

```tsx
import { useLocation } from '@dex/router/client'

const { pathname, search } = useLocation()
```

---

### `useQuery()`

Returns the current URL query parameters as a standard `URLSearchParams` instance.

```tsx
import { useQuery } from '@dex/router/client'

const query = useQuery()
const sort = query.get('sort')
```

---

### `<ClientOnly />` & `clientOnly()`

Client-side rendering boundaries to avoid hydration mismatches during SSG/prerendering.

```tsx
import { ClientOnly, clientOnly } from '@dex/router/client'

// Component Boundary
<ClientOnly fallback={<div>Loading...</div>}>
  <ClientComponent />
</ClientOnly>

// Higher-Order Component
const SafeComponent = clientOnly(ClientComponent, <div>Loading...</div>)
```

---

### `<FileRouter />`

Root router component that resolves matching pages, metadata, and layouts.

```tsx
import { FileRouter } from '@dex/router/client'
import { routes } from '@core/router/.generated/routes'
import { layouts } from '@core/router/.generated/layouts'
import GlobalLayout from '../../web/layouts/global'

<FileRouter
  routes={routes}
  layouts={layouts}
  GlobalLayout={GlobalLayout}
  notFound={<div>Page Not Found</div>}
  loading={<div>Loading...</div>}
/>
```

---

## Route & Server APIs (`@dex/router`)

### `composeRoutes(app, routes)`

Chains and composes an array of Elysia route registration functions into a single typed app instance.

```ts
import { composeRoutes } from '@dex/router'
import health from './health'
import users from './users'

export function apiRoutes() {
  return <const App extends Elysia>(app: App) => {
    return composeRoutes(app, [health, users])
  }
}
```

---

### `generateFsRoutes(options)`

Scans the pages directory and emits typed route definitions and a manifest JSON.

```ts
import { generateFsRoutes } from '@dex/router'

await generateFsRoutes({
  pagesDir: 'web/pages',
  outTs: 'core/router/.generated/routes.ts',
  outJson: 'core/router/.generated/manifest.json'
})
```

---

### `generateLayouts(options)`

Scans the layouts directory and generates a lazy-loading layout map.

```ts
import { generateLayouts } from '@dex/router'

await generateLayouts({
  layoutsDir: 'web/layouts',
  outTs: 'core/router/.generated/layouts.ts'
})
```

---

### `watchAndGenerate(options)`

Starts file watchers on pages and layouts directories for automatic regeneration during development.

```ts
import { watchAndGenerate } from '@dex/router'

const stop = watchAndGenerate({
  pagesDir: 'web/pages',
  layoutsDir: 'web/layouts',
  outRoutesTs: 'core/router/.generated/routes.ts',
  outRoutesJson: 'core/router/.generated/manifest.json',
  outLayoutsTs: 'core/router/.generated/layouts.ts',
})
```

---

### Route Matching & Sorting Utilities

- `sortRoutesByPrecedence(routes)` — Sorts an array of routes using segment-based specificity rules (Static score 3 > Param score 2 > CatchAll score 1).
- `compareRouteSegments(a, b)` — Comparator function for two `RouteSegment[]` lists.
- `parseSegment(seg)` — Parses an individual path segment string into a `RouteSegment` descriptor (`static`, `param`, or `catchAll`).
- `fileToRoute(relPosixNoExt)` — Converts a relative file path into a URL route path and segment array.
- `fileToLayoutName(relPosixNoExt)` — Converts a layout relative file path into a normalized layout name.

---

## See Also

- [Routing Rules](./routing-rules) — Route patterns and segment precedence
- [Client Navigation](./client-navigation) — Navigation guide and examples
- [Layouts](./layouts) — Layout composition and page metadata