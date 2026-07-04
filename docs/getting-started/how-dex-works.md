# How Dex Works

This page explains Dex's mental model: how pages become routes, how layouts compose, and how the build process works.

## The Big Picture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Pages     │────▶│  Generator   │────▶│  Routes      │
│  (source)   │     │  (build)     │     │  (output)    │
└─────────────┘     └──────────────┘     └──────────────┘
       │                   │                     │
       ▼                   ▼                     ▼
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Layouts    │     │  Config      │     │  Client      │
│  (wrapper)  │     │  (paths)     │     │  Router      │
└─────────────┘     └──────────────┘     └──────────────┘
```

## 1. Pages → Routes

Dex uses **file-based routing**. Your folder structure defines your routes:

| File | Route |
|------|-------|
| `web/pages/index.tsx` | `/` |
| `web/pages/about.tsx` | `/about` |
| `web/pages/blog/index.tsx` | `/blog` |
| `web/pages/blog/[slug].tsx` | `/blog/:slug` |
| `web/pages/[...catchall].tsx` | `/*` |

### Rules

- Files starting with `_` are ignored
- `index.tsx` files become directory routes
- Dynamic segments use `[param]` syntax
- Catch-all uses `[...param]` syntax

## 2. Layouts Compose

Layouts wrap your pages. Dex looks for layouts in this order:

1. `web/layouts/global.tsx` — wraps every page
2. `web/layouts/[page]/layout.tsx` — wraps a specific page
3. Page-level `layout` export — wraps just that page

### Example

```tsx
// web/layouts/global.tsx
export default function Global({ children }) {
  return (
    <html>
      <body>
        <header>🌐 Dex App</header>
        <main>{children}</main>
      </body>
    </html>
  )
}
```

```tsx
// web/pages/about.tsx
export default function About() {
  return <h1>About Us</h1>
}

// This layout only wraps the About page
export function layout({ children }) {
  return (
    <div>
      <aside>Sidebar</aside>
      <main>{children}</main>
    </div>
  )
}
```

## 3. The Build Process

### Development

```bash
bun run dev
```

- Watches `web/pages/` and `web/layouts/`
- Generates routes on change
- Starts dev server with hot reload
- Serves from `core/router/.generated/`

### Production

```bash
bun run build
```

1. **Generate routes** — scans pages, creates `routes.ts`
2. **Bundle client** — compiles React to static JS
3. **Build server** — creates deployable Node binary
4. **Copy assets** — moves `public/` to `build/`

Output structure:
```
build/
├─ server           # Node.js binary
├─ index.html       # Entry HTML
├─ assets/
│  ├─ client.js     # Client router bundle
│  └─ styles.css    # CSS (if any)
└─ core/
   └─ router/
      └─ .generated/
         ├─ routes.ts
         └─ layouts.ts
```

## 4. Client-Side Navigation

Dex includes a client router (`@dex/router/client`) that enables:

- `<Link>` components for navigation
- `useRouter()` hook for programmatic navigation
- `useParams()` hook for route params
- SPA fallback for client-side routes

### SPA Fallback

The server automatically serves `index.html` for:
- Routes that match generated pages
- Routes that don't contain a `.` (static file)
- Routes not starting with `/api/` or `/assets/`

This enables client-side routing for dynamic paths.

## 5. Configuration

By default, Dex uses conventions:

```
web/pages/     → routes
web/layouts/   → layouts
web/public/    → static assets
```

Override with `dex.config.ts`:

```ts
import { defineConfig } from 'dex/config'

export default defineConfig({
  pagesDir: 'src/routes',
  layoutsDir: 'src/layouts',
  publicDir: 'static'
})
```

## Key Takeaways

1. **Pages are routes** — no config needed
2. **Layouts compose** — global → page-specific
3. **Build generates** — routes, bundles, server
4. **Client router** — SPA navigation
5. **Config is optional** — conventions work out of the box