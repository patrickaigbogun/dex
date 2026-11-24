---
title: "Reference"
---

# Router API Reference

Comprehensive reference for `@dex/router/client` and `@dex/router` in v0.2.6.

---

## Client API (`@dex/router/client`)

### `<Link />`

Client-side navigation link rendering an `<a>` element with History API navigation, scheme sanitization, subdomain href rewriting, and Data Saver-aware prefetching.

```tsx
import { Link } from '@dex/router/client'

<Link to="/about" prefetch="intent" className="nav-link">
  About
</Link>
```

#### Props (`LinkProps`)
- `to?: string` — Destination path or URL.
- `href?: string` — Alternative destination prop (used if `to` is omitted). Throws an error at runtime if neither `to` nor `href` is a `string`.
- `replace?: boolean` — Replaces the current history entry instead of pushing a new one.
- `prefetch?: 'intent' | 'render' | 'none' | boolean` — Prefetch strategy (default: `'intent'`):
  - `'intent'` — Prefetches route + layout modules on hover (debounced by 65ms) or focus.
  - `'render'` — Prefetches immediately when mounted.
  - `'none'` / `false` — Disables prefetching.
  - Automatically disabled when `navigator.connection.saveData` is `true`.
- Standard `React.AnchorHTMLAttributes<HTMLAnchorElement>` (`target`, `rel`, `className`, `onClick`, etc.). When `target="_blank"`, `noopener noreferrer` is merged into `rel`. Unsafe schemes (`javascript:`, `data:`, `vbscript:`, control-char bypasses, `//`, `/\`) render `href="#"` and are blocked on click.

---

### `<FileRouter />`

Root router component that resolves matching pages, metadata, layouts, subdomain mounts, concurrent transitions, and render error boundaries.

```tsx
import { FileRouter } from '@dex/router/client'
import { routes } from '@core/router/.generated/routes'
import { layouts } from '@core/router/.generated/layouts'
import GlobalLayout from '../../web/layouts/global'

<FileRouter
  routes={routes}
  layouts={layouts}
  GlobalLayout={GlobalLayout}
  subdomains={{ blog: '/blog' }}
  notFound={<div>Page Not Found</div>}
  loading={<div>Loading...</div>}
  error={({ error }) => <div>Load error: {String(error)}</div>}
  errorBoundary={({ error, reset }) => (
    <div>
      <p>{String(error)}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )}
/>
```

#### Props (`FileRouterProps`)
- `routes: Route[]` — Generated route records.
- `layouts?: Record<string, () => Promise<LayoutModule>>` — Generated lazy layout map.
- `GlobalLayout?: React.ComponentType<{ children: React.ReactNode }>` — Outer application shell component.
- `notFound?: React.ReactNode` — Rendered when no route matches (defaults to `<div>404</div>`).
- `loading?: React.ReactNode` — Initial mount placeholder before first route loads (defaults to `<div>Loading...</div>`).
- `error?: React.ComponentType<{ error: unknown }>` — Rendered when async page/layout import fails.
- `errorBoundary?: React.ComponentType<{ error: unknown; reset: () => void }>` — Custom fallback passed to `<RouterErrorBoundary />` for synchronous render errors.
- `subdomains?: Record<string, string>` — Map of subdomain labels to internal route prefixes (e.g. `{ blog: '/blog' }`).

---

### `<RouterErrorBoundary />`

React class error boundary wrapping rendered router views inside `<FileRouter />`. Catches synchronous render errors, logs them via `console.error`, and automatically clears the error state whenever `resetKey` changes.

```tsx
import { RouterErrorBoundary } from '@dex/router/client'

<RouterErrorBoundary
  resetKey={pathname}
  fallback={({ error, reset }) => (
    <button onClick={reset}>Recover from {String(error)}</button>
  )}
>
  {children}
</RouterErrorBoundary>
```

#### Props (`RouterErrorBoundaryProps`)
- `children: React.ReactNode`
- `fallback?: React.ComponentType<{ error: unknown; reset: () => void }>`
- `resetKey?: string` — When changed, resets `hasError` and `error` automatically.

---

### `RouterContext` & `createStaticRouterState(pathname, params?)`

Creates a static `RouterState` for `renderToString` prerendering (used automatically by `dexPrerender`) so `useLocation()`, `useParams()`, `useQuery()`, `useRouterState()`, and `<Link />` work without a browser environment.

```tsx
import { RouterContext, createStaticRouterState } from '@dex/router/client'

const state = createStaticRouterState('/blog/hello?tab=comments', { slug: 'hello' })
// state = { pathname: '/blog/hello', search: '?tab=comments', hash: '', params: { slug: 'hello' }, query: URLSearchParams, isNavigating: false, navigate, prefetch, resolveHref }
```

---

### Hooks

- `useNavigate(): (to: string, options?: NavigateOptions) => void` — Programmatic navigation (`{ replace?: boolean }`).
- `useIsNavigating(): boolean` — `true` while a route transition or async page/layout load is pending.
- `useRouterState(): RouterState` — Returns `{ pathname, search, hash, params, query, isNavigating, navigate, prefetch, resolveHref }`.
- `usePrefetch(): (to: string) => Promise<void>` — Preloads a route's page and layout modules into memory.
- `useParams<T extends Params = Params>(): T` — Dynamic route parameters (`string` for `[param]`, `string[]` for `[...param]`).
- `useLocation(): { pathname: string; search: string; hash: string }` — Current URL location.
- `useQuery(): URLSearchParams` — Current query parameters.
- `<Outlet<T> context?: T />` & `useOutletContext<T>(): T` — Pass and consume layout context.
- `<ClientOnly fallback?: React.ReactNode />` & `clientOnly(Component, fallback?)` — Defer browser-only rendering until after client mount.

---

### Subdomain & URL Utilities (`@dex/router/client`)

- `resolveSubdomainMount(subdomains?: Record<string, string>): string | null` — Returns normalized mount prefix for the active browser subdomain (returns `null` on SSR, `localhost`, IPv4, or `host:port`).
- `toInternalPathname(browserPathname: string, mountPrefix: string | null): string` — Prepends `mountPrefix` to a browser pathname when needed.
- `toExternalPathname(pathname: string, mountPrefix: string | null): string` — Strips `mountPrefix` for display in the browser URL bar or subdomain links.
- `toExternalHref(to?: string, mountPrefix?: string | null): string` — Rewrites same-origin hrefs to external subdomain form.
- `resolveMainDomainSubdomainRedirect(pathname, search, hash, subdomains?): string | null` — Computes canonical redirect URL when visiting a subdomain prefix on the main domain (skips `localhost`, `*.localhost`, IPv4, `host:port`).
- `hasUnsafeScheme(to?: string): boolean` — Detects unsafe URL schemes (`javascript:`, `data:`, `vbscript:`, etc.) and protocol-relative `//` or `/\`.
- `normalizePathname(p: string): string` — Normalizes trailing slashes (preserving `'/'`).
- `splitPathname(pathname: string): string[]` — Splits a normalized pathname into non-empty segments.
- `matchRoute(segments: RouteSegment[], pathname: string): Params | null` — Matches a route's segment descriptors against a pathname.
- `findMatchingRoute(routes: Route[], pathname: string): { route: Route; params: Params } | null` — Finds the first matching route in a sorted list.

---

## Types & Server/Generator API (`@dex/router`)

### `Metadata` & `RenderStrategy`

```ts
export type RenderStrategy = 'spa' | 'ssg' | 'ssr' | 'ppr' | 'dynamic'

export type Metadata = {
  title?: string
  description?: string
  renderStrategy?: RenderStrategy
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  ogVideo?: string
  ogType?: string
  url?: string
  twitterCard?: 'summary' | 'summary_large_image' | 'player'
}
```

### `composeRoutes(app, routes)`

Chains an array of Elysia route plugin functions into a single typed app instance.

```ts
import { composeRoutes } from '@dex/router'
import health from './health'
import users from './users'

export function apiRoutes() {
  return <const App extends Elysia>(app: App) => composeRoutes(app, [health, users])
}
```

### `generateFsRoutes(options?)` & `generateLayouts(options?)`

Scan `web/pages` and `web/layouts` (ignoring `_`-prefixed entries and symbolic links) and emit typed routes, manifest JSON, and lazy layout maps.

```ts
import { generateFsRoutes, generateLayouts } from '@dex/router'

await generateFsRoutes({
  pagesDir: 'web/pages',
  outTs: 'core/router/.generated/routes.ts',
  outJson: 'core/router/.generated/manifest.json',
})

await generateLayouts({
  layoutsDir: 'web/layouts',
  outTs: 'core/router/.generated/layouts.ts',
})
```

### `watchAndGenerate(options?)`

Watches `pagesDir` and `layoutsDir` for changes and regenerates routes and layouts (debounced by 120ms).

```ts
import { watchAndGenerate } from '@dex/router'

await watchAndGenerate({
  pagesDir: 'web/pages',
  layoutsDir: 'web/layouts',
  outRoutesTs: 'core/router/.generated/routes.ts',
  outRoutesJson: 'core/router/.generated/manifest.json',
  outLayoutsTs: 'core/router/.generated/layouts.ts',
})
```

### Precedence, Config & Parsing Utilities

- `sortRoutesByPrecedence(routes)` — Sorts routes in-place by segment precedence (`static` = 3 > `param` = 2 > `catchAll` = 1).
- `compareRouteSegments(a, b)` — Comparator for two `RouteSegment[]` arrays.
- `getSegmentScore(seg)` — Returns `3` (`static`), `2` (`param`), or `1` (`catchAll`).
- `parseSegment(seg)` — Parses a segment string into a `RouteSegment`.
- `fileToRoute(relPosixNoExt)` — Converts a relative page file path into `{ path, segments }`.
- `fileToLayoutName(relPosixNoExt)` — Normalizes a layout file path into a layout identifier.
- `loadDexConfig(startDir?)` & `DEFAULT_PATHS` — Loads `dex.config.{ts,js,mjs,cjs}` walking up from `startDir` (or `process.cwd()`).

---

## See Also

- [Routing Rules](./routing-rules) — Route patterns and segment precedence
- [Client Navigation](./client-navigation) — Navigation, error boundaries, and subdomain routing
- [Layouts](./layouts) — Layout composition and page metadata
