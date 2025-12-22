# File-system Router (React)

This repo uses a small, custom **file-system (FS) based router** for the React client. It discovers page components from `web/pages`, generates a route table into `core/router/.generated/`, and a lightweight client router (`core/router/client/router.tsx`) renders the matching page.

## How it works (high level)

1. **You create pages** as `.tsx` files under `web/pages`.
2. A generator scans those files and writes:
   - `core/router/.generated/routes.ts` (runtime route table + dynamic imports)
   - `core/router/.generated/manifest.json` (human/inspection manifest)
3. The browser bundle (`core/router/client/entry.tsx`) imports generated `routes` and renders:
   - `<FileRouter routes={routes} />`
4. The server (`routes/client.ts`) serves `web/public/index.html` for “app routes” so the client router can take over.

## Where to look

- **Generator:** `core/router/generate.ts`
- **Generated outputs:** `core/router/.generated/routes.ts`, `core/router/.generated/manifest.json`
- **Client router:** `core/router/client/router.tsx`
- **Client entry:** `core/router/client/entry.tsx`
- **Server SPA fallback:** `routes/client.ts`

## Pages directory and conventions

### Pages root

- Pages live in: `web/pages`
- Only files ending in `.tsx` are considered pages.

### Ignored files/folders

Any path segment starting with `_` is ignored.

Examples (ignored):
- `web/pages/_private.tsx`
- `web/pages/profile/_components/card.tsx`

### Route path mapping

This router uses a Nuxt-like convention:

- `web/pages/index.tsx` → `/`
- `web/pages/profile/index.tsx` → `/profile`
- `web/pages/profile/settings.tsx` → `/profile/settings`

Trailing slashes are normalized on the client (e.g. `/profile/` becomes `/profile`).

### Dynamic segments

Dynamic segments are encoded in file/folder names using brackets:

- **Param:** `[id]` captures exactly one segment
  - `web/pages/post/[id].tsx` → `/post/[id]`
  - Visiting `/post/123` yields `params.id === "123"`

- **Catch-all:** `[...slug]` captures the remaining segments
  - `web/pages/docs/[...slug].tsx` → `/docs/[...slug]`
  - Visiting `/docs/a/b` yields `params.slug === ["a", "b"]`

Param values are `decodeURIComponent`’d.

### Route matching order

Generated routes are sorted lexicographically by `path` (string compare). The client router tries them in that order and uses the **first match**.

## Client router behavior

The router is a minimal SPA router built on the History API:

- Matching is done against `window.location.pathname`.
- Navigation uses `history.pushState()` and dispatches a `popstate` event.
- Pages are loaded with `React.lazy()` via the generated `importPage()` function (code-splitting).

### Metadata support

A page module may export `metadata`:

- `metadata.title` sets `document.title`
- `metadata.description` sets/creates `<meta name="description" ...>`

Example page:

```tsx
// web/pages/profile/index.tsx
export const metadata = {
  title: 'Your profile',
  description: 'Manage your profile',
}

export default function ProfilePage() {
  return <div>Profile</div>
}
```

### Hooks and components

From `core/router/client/router.tsx`:

- `useParams<T extends Params = Params>()` → route params
- `useQuery()` → `URLSearchParams` of the current location
- `useNavigate()` → `(to: string) => void`
- `<Link to="/path">...</Link>` → client navigation (prevents full reload)

Example:

```tsx
import { Link, useParams, useQuery } from '@/core/router/client/router'

export default function PostPage() {
  const { id } = useParams<{ id: string }>()
  const query = useQuery()

  return (
    <div>
      <div>Post: {id}</div>
      <div>tab = {query.get('tab')}</div>
      <Link to="/">Go home</Link>
    </div>
  )
}
```

### 404 behavior

If no route matches, `<FileRouter />` renders either:
- `props.notFound` (if provided)
- otherwise a default `<div>404</div>`

## Dev and build workflow

### Generate routes once

```bash
bun run generate
```

### Dev mode (watch)

`bun run dev` starts multiple watchers:
- routes generator: `bun core/router/generate.ts --watch`
- client bundler: builds `core/router/client/entry.tsx` to `web/public/assets/client.js`
- CSS watcher: builds Tailwind output to `web/public/assets/styles.css`
- server watcher: restarts `app.ts` on changes

```bash
bun run dev
```

### Production build

```bash
bun run build
bun run start
```

## Server-side SPA fallback

The server router in `routes/client.ts`:

- Lets `/api/**` and `/assets/**` pass through
- Avoids treating “dot paths” like `/favicon.ico` as SPA routes
- For HTML-ish requests, returns `web/public/index.html`

This enables deep-linking (e.g. visiting `/profile/settings` directly) to load the SPA and then have the client router render the page.

## Adding a new route (quick recipe)

1. Add a page file under `web/pages`.
   - Example: `web/pages/about.tsx`.
2. Run dev or regenerate.
   - `bun run dev` (watch) or `bun run generate`.
3. Navigate to the route.
   - `/about`

That’s it — no manual route registration.
