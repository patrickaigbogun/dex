---
title: "Build Process"
---

# The Build Process

Dex's build pipeline transforms your source files into an ESM code-split client bundle, prerendered SSG HTML pages, minified Tailwind CSS, and a **Standalone Bun server executable (`build/server`)**.

## Development Mode

Run with the native Go CLI:

```bash
dex start
```

(Or directly with Bun via `bun run dev`, which runs `core/bootstrap/dev.ts`.)

**What happens:**

1. Runs `dex-router generate` once so `core/router/.generated/` is populated before starting watchers.
2. Spawns four concurrent processes via `@dex/dev`:
   - `routes:watch`: watches `web/pages/` and `web/layouts/` and regenerates `routes.ts`, `manifest.json`, and `layouts.ts`
   - `styles:watch`: compiles `web/styles/index.css` into `web/public/assets/styles.css` with Tailwind CSS v4
   - `client:watch`: runs `bun build core/bootstrap/web.tsx --splitting --format esm` into `web/public/assets/`
   - `server:dev`: runs `bun --watch core/runtime/app/index.ts` on `http://localhost:7990` with `/__dev/reload` SSE live reload

## Production Build

Run with:

```bash
dex build
```

(Or `bun run build`, which runs `core/bootstrap/build.ts`.)

**What `dexBuild()` executes:**

1. **Generate routes & layouts** — scans `web/pages/` and `web/layouts/` to emit `core/router/.generated/routes.ts`, `manifest.json`, and `layouts.ts`
2. **Prepare `build/`** — cleans `build/`, creates `build/assets/`, and copies `web/public/index.html` to `build/index.html`
3. **SSG prerender (`dexPrerender`)** — renders static routes whose strategy resolves to `'ssg'` with `<RouterContext.Provider>` (`createStaticRouterState`), injects `<head>` metadata (`injectHeadMeta`) and Google Fonts (`injectGoogleFonts`), and writes HTML to `build/__ssg/<route>/index.html` and `build/<route>/index.html`
4. **Compile CSS** — runs Tailwind CSS v4 (`bun tailwindcss -i web/styles/index.css -o build/assets/styles.css --minify`)
5. **Bundle client (ESM code splitting)** — runs `bun build core/bootstrap/web.tsx --target browser --splitting --format esm --minify --outdir build/assets --entry-naming client.[ext] --chunk-naming chunks/[name]-[hash].[ext]` with `NEXT_PUBLIC_*`, `PUBLIC_*`, and `VITE_*` defines
6. **Cache-bust HTML assets** — computes 8-char SHA-256 hashes of `build/assets/client.js` and `build/assets/styles.css` and rewrites `/assets/client.js?v=<hash>` and `/assets/styles.css?v=<hash>` across `build/index.html` and all prerendered HTML files
7. **Compile server** — compiles `core/runtime/server/prod.ts` with `bun build --compile` into a **Standalone Bun server executable (`build/server`)**

**Output structure:**

```text
build/
├─ server                          # Standalone Bun server executable
├─ index.html                      # Entry HTML with ?v=<hash> asset URLs
├─ __ssg/                          # Prerendered SSG HTML directory
│  ├─ index.html                   # Prerendered '/' (when SSG)
│  └─ about/index.html             # Prerendered '/about' (when SSG)
├─ about/index.html                # Copied static route HTML
└─ assets/
   ├─ client.js                    # Client router entry bundle
   ├─ chunks/
   │  └─ [name]-[hash].js          # Code-split page & layout chunks
   └─ styles.css                   # Minified Tailwind CSS
```

## Build & Run Commands

| Command | Purpose |
|---------|---------|
| `dex start` | Start dev watchers and dev server (`core/bootstrap/dev.ts`) |
| `dex build` | Run full production build (`core/bootstrap/build.ts`) |
| `dex start -p` | Run compiled production binary (`./build/server` with `NODE_ENV=production`) |
| `bun run dev` / `build` / `start` | Direct `package.json` script equivalents |

## Generated Files

### `core/router/.generated/routes.ts`

Maps sorted routes to lazy `importPage` loaders:

```ts
export const routes: Route[] = [
  {
    file: 'index.tsx',
    path: '/',
    segments: [],
    importPage: () => import('../../../web/pages/index.tsx'),
  },
  {
    file: 'about.tsx',
    path: '/about',
    segments: [{ kind: 'static', value: 'about' }],
    importPage: () => import('../../../web/pages/about.tsx'),
  },
]
```

### `core/router/.generated/layouts.ts`

Maps named layouts in `web/layouts/` to lazy dynamic imports:

```ts
export const layouts: Record<string, () => Promise<LayoutModule>> = {
  about: () => import('../../../web/layouts/about.tsx'),
  global: () => import('../../../web/layouts/global.tsx'),
}
```

**Never edit these files** — they are regenerated automatically.

## Customization

Override output locations and rendering strategy in `dex.config.ts`:

```ts
export default {
  renderStrategy: 'ssg',
  pagesDir: 'src/pages',
  layoutsDir: 'src/layouts',
  outRoutesTs: 'src/.generated/routes.ts',
  outRoutesJson: 'src/.generated/manifest.json',
  outLayoutsTs: 'src/.generated/layouts.ts',
}
```

## See Also

- [How Dex Works](../getting-started/how-dex-works) — Mental model
- [Configuration](./configuration) — Customize paths, fonts, and subdomains
- [Production Server](../server/production) — Running in production
