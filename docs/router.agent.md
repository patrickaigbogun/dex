# FS Router (Agent Reference)

This document is optimized for code agents: it is deterministic, file-linked, and mirrors actual behavior.

## Purpose

- Generate a route table from `web/pages/**/*.tsx`.
- Load matching React pages via dynamic import.
- Provide minimal SPA navigation + params/query.

## Source of truth

- **Generator:** `core/router/generate.ts`
- **Types:** `core/router/types.ts`
- **Client router:** `core/router/client/router.tsx`
- **Client entry:** `core/router/client/entry.tsx`
- **Generated route table:** `core/router/.generated/routes.ts`
- **Generated manifest:** `core/router/.generated/manifest.json`
- **Server SPA fallback:** `routes/client.ts`
- **Dev orchestration:** `scripts/dev.ts`

## Route generation

### Input

- Root directory: `web/pages`
- Included files: all files ending in `.tsx`
- Ignored paths: any path segment starting with `_` (file or directory)

Pseudo-rule:

- `isIgnoredRouteFile(relPosix)` is true if `relPosix.split('/')` contains a segment with prefix `_`.

### File → URL path mapping

Given a relative path (POSIX) without extension, `relPosixNoExt`:

1. If `relPosixNoExt === 'index'`, map to `''`.
2. If it ends with `/index`, remove that suffix.
3. Prepend `/`.
4. Remove trailing slashes (except keep `/` as `/`).

Examples:

- `index` → `/`
- `profile/index` → `/profile`
- `profile/settings` → `/profile/settings`

### Segment parsing

For each segment between slashes:

- `[name]` → `{ kind: 'param', name }`
- `[...name]` → `{ kind: 'catchAll', name }`
- else → `{ kind: 'static', value: segment }`

### Output artifacts

`generateFsRoutes()` writes:

- `core/router/.generated/routes.ts`
  - exports `routes: Route[]`
  - each route has `importPage: () => import(<page-module-path>)`
- `core/router/.generated/manifest.json`
  - `{ source, generatedAt, routes: [{ file, path, segments }] }`

Routes are sorted by `a.path.localeCompare(b.path)`.

### Watch mode

Running `bun core/router/generate.ts --watch`:

- Watches all directories under `web/pages` (not relying on recursive watch).
- Debounces regeneration (~120ms).
- Rescans directories on structural changes.

## Client router runtime

### Matching algorithm

From `core/router/client/router.tsx`:

- Normalizes pathname:
  - empty → `/`
  - if not `/` and endsWith(`/`) → trim trailing `/`
- Splits pathname into parts: `pathname.split('/').filter(Boolean)` (except `/` → `[]`).

`matchRoute(segments, pathname)` returns `Params | null`.

Rules:

- `static`: must equal current part; else no match.
- `param`: captures 1 part, sets `params[name] = decodeURIComponent(part)`.
- `catchAll`: captures remaining parts, sets `params[name] = parts.slice(i).map(decodeURIComponent)`; then ends matching.
- After consuming segments, match only if all pathname parts are consumed.

### Route selection

- Iterates `props.routes` in order.
- Picks first route where `matchRoute(...)` returns non-null.

Implication:

- Ordering matters; generated ordering is lexicographic by `path`.

### Page loading

- Page component is loaded via `React.lazy(async () => { const mod = await route.importPage(); applyMetadata(mod.metadata); return mod })`.
- Suspense fallback: `<div>Loading...</div>`.

### Metadata application

If `mod.metadata` exists:

- `title` → `document.title = title`
- `description` → ensures `<meta name="description">` exists; sets `.content`.

### Router context API

`RouterContext` value shape:

- `pathname: string`
- `search: string`
- `query: URLSearchParams`
- `params: Params` where `Params = Record<string, string | string[]>`
- `navigate(to: string): void`

Public hooks/components:

- `useParams<T extends Params = Params>(): T`
- `useQuery(): URLSearchParams`
- `useNavigate(): (to: string) => void`
- `Link({ to, ...anchorProps })`
  - intercepts normal click (no modifier keys)
  - `preventDefault()` then calls `navigate(to)`

### Navigation semantics

- `navigate(to)` resolves `to` against `window.location.origin` using `new URL(to, origin)`.
- Performs `history.pushState({}, '', url)`.
- Triggers `window.dispatchEvent(new PopStateEvent('popstate'))`.
- Router listens to `popstate` and updates state.

### 404 behavior

If no match:

- renders `props.notFound ?? <div>404</div>`

## Server integration

### SPA fallback (`routes/client.ts`)

`clientRouter` returns `web/public/index.html` if:

- request is `GET`
- path is not:
  - `/api/**`
  - `/assets/**`
  - `/__dev/**`
  - any path containing `.` (treated as asset-like)
- `accept` header includes `text/html` or `*/*` (otherwise fall through)

### Dev reload endpoint

`devReloadRouter` provides SSE at `/__dev/reload` in non-prod.

## Build & dev commands (as implemented)

From `package.json` and `scripts/dev.ts`:

- `bun run generate` → `bun core/router/generate.ts`
- `bun run dev` runs:
  - `bun core/router/generate.ts --watch`
  - tailwind CLI watch building `web/public/assets/styles.css`
  - `bun build core/router/client/entry.tsx --watch` to `web/public/assets/client.js`
  - `bun --watch app.ts ...` (server reload)

- `bun run build` runs:
  - generate routes
  - build CSS
  - build client bundle

## Page module contract

A page module under `web/pages/**` must export:

- `default`: React component (any props; currently router passes none)

Optional:

- `metadata?: { title?: string; description?: string }`

## Common edits an agent might do safely

- Add a new page: create `web/pages/<path>.tsx`.
- Add dynamic params: use `[param]` or `[...catchAll]`.
- Exclude helper files: prefix folder/file with `_`.
- Change routing behavior:
  - mapping rules live in `core/router/generate.ts` (`fileToRoute`, `parseSegment`, `isIgnoredRouteFile`).
  - matching/navigation behavior lives in `core/router/client/router.tsx`.

## Gotchas

- Only `.tsx` pages are routed. `.ts` is ignored.
- A route file named with `_` anywhere in its path is ignored (including nested directories).
- Generated route ordering is string-sort by `path`, not specificity-based.
- `Link` intercepts only plain left-clicks (modifier keys pass through).
