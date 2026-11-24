---
title: "Client Navigation"
---

# Client Navigation

Use `@dex/router/client` for client-side navigation, prefetching, concurrent route transitions, error boundaries, subdomain routing, and SSG prerender context.

## `<Link />` Component

`<Link />` renders an accessible `<a>` tag, intercepts in-app clicks via the History API, rewrites subdomain hrefs, validates URL schemes, and supports Data Saver-aware prefetching:

```tsx
import { Link } from '@dex/router/client'

export default function Nav() {
  return (
    <nav>
      {/* Accepts `to` or `href`; default prefetch="intent" (65ms hover debounce + focus) */}
      <Link to="/" prefetch="intent">Home</Link>

      {/* Prefetches immediately when the link mounts */}
      <Link href="/about" prefetch="render">About</Link>

      {/* Disable prefetching (`"none"` or `false`) */}
      <Link to="/admin" prefetch="none">Admin</Link>

      {/* Replace current history entry */}
      <Link to="/login" replace>Login</Link>

      {/* External link: automatically receives rel="noopener noreferrer" */}
      <Link to="https://example.com" target="_blank">External Docs</Link>
    </nav>
  )
}
```

### Destination Validation & Security

- **Required `to` or `href`**: `<Link />` accepts either `to` or `href`. If neither is a `string`, it throws `[dex-router] <Link> requires a valid "to" or "href" destination prop.` at runtime.
- **Unsafe scheme neutralization**: `hasUnsafeScheme()` strips control characters/whitespace and blocks `javascript:`, `data:`, `vbscript:`, unknown non-allowlisted schemes (only `http`, `https`, `mailto`, `tel`, and relative paths are allowed), protocol-relative `//`, and `/\` bypasses. Unsafe links render `href="#"` and cancel clicks.
- **`target="_blank"` hardening**: When `target="_blank"` is set, `<Link />` automatically merges `noopener` and `noreferrer` into `rel`.
- **Subdomain href rewriting**: When a `RouterContext` is mounted with `subdomains`, `<Link />` rewrites destination paths through `ctx.resolveHref(to)` so links on a subdomain omit the internal mount prefix (for example `/blog/post-1` renders as `href="/post-1"` on `blog.example.com`).
- **Native fallback**: External URLs, modifier-key clicks (`Cmd`/`Ctrl`/`Shift`/`Alt`), non-`_self` targets, or `<Link />` rendered without a `RouterContext` behave as standard `<a>` navigation.

> [!TIP]
> **Data Saver Aware:** When `navigator.connection.saveData === true`, Dex automatically disables `"intent"` and `"render"` prefetching to conserve user bandwidth.

## `<FileRouter />` & `<RouterErrorBoundary />`

`<FileRouter />` manages route matching, async module loading, concurrent React transitions, and error handling:

```tsx
import { FileRouter } from '@dex/router/client'
import { routes } from '@core/router/.generated/routes'
import { layouts } from '@core/router/.generated/layouts'
import GlobalLayout from '../../web/layouts/global'

export function App() {
  return (
    <FileRouter
      routes={routes}
      layouts={layouts}
      GlobalLayout={GlobalLayout}
      subdomains={{ blog: '/blog' }}
      loading={<div>Loading...</div>}
      notFound={<div>Page Not Found</div>}
      error={({ error }) => <div>Failed to load route: {String(error)}</div>}
      errorBoundary={({ error, reset }) => (
        <div role="alert">
          <h2>Render error</h2>
          <p>{error instanceof Error ? error.message : String(error)}</p>
          <button type="button" onClick={reset}>Retry</button>
        </div>
      )}
    />
  )
}
```

### Concurrent Transitions & Module Caching

- **Zero-flicker `useTransition`**: When navigating between routes, `<FileRouter />` keeps the previous page rendered until the next page and layout modules finish loading, then commits the swap inside React `startTransition`. Use `useIsNavigating()` to display a subtle progress indicator while transitioning.
- **Error-evicting module cache**: Page and layout modules are cached in memory (`pageModuleCache`, `layoutModuleCache`) for instant repeat visits. If a dynamic import fails due to a transient network error, the failed entry is automatically deleted from the cache so subsequent navigation attempts can retry cleanly.

### Error Boundaries

- **Built-in `<RouterErrorBoundary />`**: `<FileRouter />` wraps its rendered tree in `<RouterErrorBoundary fallback={props.errorBoundary} resetKey={loc.pathname}>`, catching synchronous React render errors in pages and layouts.
- **Automatic reset on navigation**: Whenever `loc.pathname` changes, `RouterErrorBoundary` clears its error state automatically via `getDerivedStateFromProps`.
- **Custom fallback**: Pass `errorBoundary?: React.ComponentType<{ error: unknown; reset: () => void }>` to `<FileRouter />` (or use `<RouterErrorBoundary />` directly) to render a custom fallback UI with a `reset` handler.

## Subdomain Routing

You can mount route subtrees on dedicated subdomains by setting `subdomains` in `dex.config.ts` and passing the same map to `<FileRouter subdomains={...} />`:

```ts
// dex.config.ts
export default {
  mode: 'spa',
  renderStrategy: 'ssg',
  subdomains: {
    blog: '/blog',
    docs: '/docs',
  },
}
```

1. **Subdomain mounting (`resolveSubdomainMount`, `toInternalPathname`)**: Visiting `blog.example.com/hello` resolves internally to `/blog/hello` so `web/pages/blog/[slug].tsx` matches seamlessly.
2. **Clean URL bars (`toExternalPathname`, `toExternalHref`)**: Visiting `blog.example.com/blog/hello` normalizes the browser URL bar to `/hello`, and `<Link to="/blog/hello">` resolves to `href="/hello"` on `blog.example.com`.
3. **Main-domain canonical redirects (`resolveMainDomainSubdomainRedirect`)**: Visiting `example.com/blog/hello` redirects to `blog.example.com/hello`.
4. **Local development safety**: `localhost`, `*.localhost`, IPv4 addresses, and `host:port` hosts skip subdomain rewriting and redirects so local development continues to work at `http://localhost:7990/blog/hello`.

## SSG Router Context

During build-time prerendering (`dexPrerender`) or custom SSR with `renderToString`, wrap your app tree with `RouterContext.Provider` and `createStaticRouterState(pathname, params?)`:

```tsx
import { renderToString } from 'react-dom/server'
import { RouterContext, createStaticRouterState } from '@dex/router/client'
import BlogPost from './web/pages/blog/[slug]'

const html = renderToString(
  <RouterContext.Provider value={createStaticRouterState('/blog/hello?ref=rss', { slug: 'hello' })}>
    <BlogPost />
  </RouterContext.Provider>
)
```

This ensures `useLocation()`, `useParams()`, `useQuery()`, `useRouterState()`, and `<Link />` work identically during prerendering without a browser `window` object.

## Navigation & State Hooks

### `useNavigate()`

```tsx
import { useNavigate } from '@dex/router/client'

export default function LoginButton() {
  const navigate = useNavigate()

  const handleLogin = async () => {
    navigate('/dashboard')
    // Or replace current history entry:
    // navigate('/dashboard', { replace: true })
  }

  return <button onClick={handleLogin}>Log In</button>
}
```

### `useIsNavigating()`

```tsx
import { useIsNavigating } from '@dex/router/client'

export function GlobalNavProgress() {
  const isNavigating = useIsNavigating()
  if (!isNavigating) return null
  return <div className="fixed top-0 left-0 right-0 h-1 bg-blue-500 animate-pulse" />
}
```

### `usePrefetch()`

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

### `useParams()`, `useLocation()`, and `useQuery()`

```tsx
import { useParams, useLocation, useQuery } from '@dex/router/client'

export default function FilterPage() {
  const { id } = useParams<{ id: string }>()
  const { pathname, search, hash } = useLocation()
  const query = useQuery()
  const tab = query.get('tab') || 'overview'

  return (
    <div>
      <p>Route: {pathname}{search}{hash}</p>
      <p>Item: {id} / Tab: {tab}</p>
    </div>
  )
}
```

## `<ClientOnly />` & `clientOnly()`

Prevent hydration mismatches for components that rely on browser-only APIs during SSG prerendering:

```tsx
import { ClientOnly, clientOnly } from '@dex/router/client'
import DynamicChart from '../components/Chart'

export function Dashboard() {
  return (
    <ClientOnly fallback={<p>Loading chart...</p>}>
      <DynamicChart />
    </ClientOnly>
  )
}

export const ClientChart = clientOnly(DynamicChart, <p>Loading...</p>)
```

## See Also

- [Routing Rules](./routing-rules) — Route patterns and precedence
- [Dynamic Routes](./dynamic-routes) — Capturing URL parameters
- [Layouts](./layouts) — Layout composition and page metadata
- [Router API Reference](./reference) — Complete API signatures
