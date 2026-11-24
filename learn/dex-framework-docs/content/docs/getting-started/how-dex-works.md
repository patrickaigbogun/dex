---
title: "How Dex Works"
---

# How Dex Works

This page explains Dex's mental model: how the Native Go CLI drives the workspace, how pages become routes, how layouts compose, and how the dev and production pipelines work.

## The Big Picture

```text
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  web/pages/  │────▶│ @dex/router  │────▶│ routes.ts / json │
│  web/layouts │     │  generator   │     │ layouts.ts       │
└──────────────┘     └──────────────┘     └──────────────────┘
       │                    │                      │
       ▼                    ▼                      ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   @dex/dev   │────▶│   Bun ESM    │────▶│   build/server   │
│  dexBuild()  │     │  + SSG + CSS │     │ (Bun executable) │
└──────────────┘     └──────────────┘     └──────────────────┘
```

## 1. Native Go CLI (`dex`)

The `dex` CLI is a compiled Go binary (<8 MB, <5ms startup) that manages:

- **Scaffolding & template sync**: `dex scaffold`, `dex sync`, and `dex template`
- **Multi-version management**: `dex update`, `dex versions`, and `dex use` under `~/.dex/`
- **Execution**: `dex start` runs `core/bootstrap/dev.ts`, `dex build` runs `core/bootstrap/build.ts`, and `dex start -p` executes the compiled `build/server` binary
- **OpenAPI codegen**: `dex pie generate` builds `core/api/generated.ts` from JSON or YAML specs

## 2. Pages to Routes

Dex uses **file-based routing**. Your folder structure under `web/pages/` defines your routes:

| File | Route |
|------|-------|
| `web/pages/index.tsx` | `/` |
| `web/pages/about.tsx` | `/about` |
| `web/pages/blog/index.tsx` | `/blog` |
| `web/pages/blog/[slug].tsx` | `/blog/:slug` |
| `web/pages/[...catchall].tsx` | `/*catchall` |

### Rules

- Files or folders starting with `_` are ignored
- `index.tsx` files map to their directory path
- Dynamic segments use `[param]` syntax
- Catch-all routes use `[...param]` syntax
- Generated routes in `core/router/.generated/routes.ts` are sorted by specificity (static before param before catch-all) and expose lazy `importPage: () => import(...)` loaders

## 3. Layouts Compose

Layouts wrap your pages cleanly:

1. `web/layouts/global.tsx` — imported in `core/bootstrap/web.tsx` and passed as `GlobalLayout` to `<FileRouter />`
2. `web/layouts/<name>.tsx` — named layouts registered in `core/router/.generated/layouts.ts` and selected via `export const layout = '<name>'`

```tsx
// web/layouts/global.tsx
export default function GlobalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header>Dex App</header>
      <main>{children}</main>
    </div>
  )
}
```

```tsx
// web/pages/about.tsx
export const layout = 'about'

export default function About() {
  return <h1>About Us</h1>
}
```

## 4. The Build Process

### Development (`dex start`)

Runs `core/bootstrap/dev.ts` (`dexDev()`), which generates routes once and then spawns four concurrent tasks via `@dex/dev`:

1. `routes:watch` — watches `web/pages/` and `web/layouts/` and regenerates `core/router/.generated/*`
2. `styles:watch` — runs Tailwind CSS v4 CLI to compile `web/styles/index.css` into `web/public/assets/styles.css`
3. `client:watch` — runs `bun build core/bootstrap/web.tsx --splitting --format esm` into `web/public/assets/`
4. `server:dev` — runs `bun --watch core/runtime/app/index.ts` (Elysia API routes + `/assets/*` + `/__dev/reload` SSE + SPA fallback)

### Production (`dex build`)

Runs `core/bootstrap/build.ts` (`dexBuild()`):

1. **Generate routes & layouts** into `core/router/.generated/`
2. **Prepare `build/`** — copies `web/public/index.html` to `build/index.html`
3. **SSG prerender** — renders static routes whose strategy resolves to `'ssg'` with `<RouterContext.Provider>`, injects `<head>` metadata (`injectHeadMeta`) and Google Fonts (`injectGoogleFonts`), and writes HTML to `build/__ssg/` and `build/<route>/index.html`
4. **Compile CSS** — minifies `web/styles/index.css` to `build/assets/styles.css`
5. **Bundle client (ESM code splitting)** — compiles `core/bootstrap/web.tsx` with `--splitting --format esm --minify` to `build/assets/client.js` and `build/assets/chunks/[name]-[hash].js`
6. **Cache busting** — hashes `client.js` and `styles.css` and updates HTML references with `?v=<hash>`
7. **Compile server** — compiles `core/runtime/server/prod.ts` into a **Standalone Bun server executable (`build/server`)**

Output structure:

```text
build/
├─ server                          # Standalone Bun server executable
├─ index.html                      # Entry HTML (with ?v=<hash> asset URLs)
├─ __ssg/                          # Prerendered SSG HTML lookup tree
├─ <route>/index.html              # Route-level prerendered HTML (for SSG routes)
└─ assets/
   ├─ client.js                    # Client router entry bundle
   ├─ chunks/
   │  └─ [name]-[hash].js          # ESM code-split route & layout chunks
   └─ styles.css                   # Compiled & minified Tailwind CSS
```

## 5. Client-Side Navigation & Subdomains

`@dex/router/client` provides:

- `<Link>` with intent/render prefetching, unsafe scheme filtering, and automatic `noopener noreferrer` on `target="_blank"`
- `useNavigate()`, `useParams()`, `useLocation()`, `useQuery()`, `useIsNavigating()`, `usePrefetch()`, `useRouterState()`
- `Outlet` & `useOutletContext()`
- `ClientOnly` & `clientOnly()` for SSG-safe client-only rendering
- `RouterErrorBoundary` for route & layout error recovery
- `subdomains` mounting (`resolveSubdomainMount`, canonical redirects, and clean external URLs)

## 6. Configuration

By default, Dex uses conventions:

```text
web/pages/     -> routes
web/layouts/   -> layouts
web/public/    -> static index.html & dev assets
web/styles/    -> Tailwind CSS source
routes/api/    -> Elysia API routes
```

Customize paths, subdomains, Google fonts, rendering strategy, and `@dex/pie` codegen options in `dex.config.ts`.
