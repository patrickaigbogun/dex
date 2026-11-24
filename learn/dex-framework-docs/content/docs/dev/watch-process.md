---
title: "Watch Process"
---

# Watch Process

`@dex/dev` manages both the concurrent development workflow (`dexDev`) and the full production build pipeline (`dexBuild`).

## Development Mode (`dexDev`)

When you run `bun run dev` (or `dex start`), `dexDev({ rootDir, defineArgs? })`:

1. Resolves client-safe public environment variables (`PUBLIC_*`, `NEXT_PUBLIC_*`, `VITE_*`) from `.env` and `process.env` via `getPublicEnvDefines(rootDir)` if `defineArgs` is not provided.
2. Runs `bunx --bun dex-router generate` once to ensure `routes.ts`, `manifest.json`, and `layouts.ts` exist before the server boots.
3. Launches **4 concurrent processes** via `spawnGroup`:

| Process Name | Command | Purpose |
|---|---|---|
| `routes:watch` | `bunx --bun dex-router watch --pagesDir web/pages --layoutsDir web/layouts ...` | Watches `web/pages` & `web/layouts` and regenerates route/layout manifests. |
| `styles:watch` | `bun tailwindcss -i web/styles/index.css -o web/public/assets/styles.css --watch` | Recompiles Tailwind CSS on stylesheet or markup changes. |
| `client:watch` | `bun build core/bootstrap/web.tsx --target browser --splitting --format esm --outdir web/public/assets --entry-naming client.[ext] ... --watch` | Bundles code-split ESM client code with public `.env` `--define` substitutions. |
| `server:dev` | `bun --watch core/runtime/app/index.ts` | Runs and restarts the Elysia dev server on server code changes. |

### `spawnGroup` Process Supervision

`spawnGroup(tasks)` prefixes stdout/stderr lines from each child with colorized tags (e.g. `[routes:watch]`, `[client:watch]`). Set `DEX_DEV_RAW=1` to inherit raw stdio without prefixes, or `NO_COLOR=1` to disable ANSI colors. If any task exits with a non-zero code, or when `SIGINT`/`SIGTERM` is received, `spawnGroup` terminates all sibling processes cleanly.

---

## Production Build Pipeline (`dexBuild`)

`dexBuild({ rootDir, defineArgs? })` runs a 6-stage pipeline using `dexPrepareBuild`, `dexPrerender`, and `dexBuildClient`:

1. **Stage 1 — Route & layout generation**
   Runs `bunx --bun dex-router generate` to write `core/router/.generated/routes.ts`, `core/router/.generated/manifest.json`, and `core/router/.generated/layouts.ts`.
2. **Stage 2 — Build directory preparation (`dexPrepareBuild`)**
   Removes any previous `build/` directory, creates `build/assets/`, and copies `web/public/index.html` to `build/index.html`.
3. **Stage 3 — SSG prerendering (`dexPrerender`)**
   Inspects `dex.config.ts` `renderStrategy` (default `'spa'`) and per-page `metadata.renderStrategy`. For every static route resolving to `'ssg'`:
   - Wraps `GlobalLayout > NamedLayout > Page` inside `<RouterContext.Provider value={createStaticRouterState(routePath, {})}>` and renders HTML via `react-dom/server` `renderToString`.
   - Injects rendered markup into `<div id="root">...</div>`.
   - Injects page `<head>` metadata (`title`, `description`, Open Graph, and Twitter card tags) and Google Fonts (`cfg.fonts`).
   - Writes each page to `build/__ssg/<route>/index.html` (or `build/__ssg/index.html` for `/`) and copies the prerendered tree to `build/<route>/index.html`.
4. **Stage 4 — Tailwind CSS compilation**
   Runs `bun tailwindcss -i web/styles/index.css -o build/assets/styles.css --minify`.
5. **Stage 5 — ESM code-split client bundling (`dexBuildClient`) & SHA-256 cache busting**
   Runs `bun build core/bootstrap/web.tsx --target browser --splitting --format esm --minify --outdir build/assets --entry-naming client.[ext] --chunk-naming chunks/[name]-[hash].[ext]` (with `defineArgs`).
   Then computes 8-character SHA-256 content hashes for `build/assets/client.js` and `build/assets/styles.css` and stamps `?v=<hash>` onto `/assets/client.js` and `/assets/styles.css` references across all HTML files under `build/**/*.html` (ensuring `<script type="module">` on `client.js`).
6. **Stage 6 — Standalone production server binary**
   Runs `bun build --compile core/runtime/server/prod.ts --outfile build/server` to produce a self-contained server executable.

## Manual Regeneration

To regenerate routes and layouts outside of `dexDev` or `dexBuild`:

```bash
bunx --bun dex-router generate
```

## See Also

- [Dev Reload](./dev-reload) — How browser refresh works
- [Dev vs Production](../core-concepts/dev-vs-prod) — Mode differences
- [Build Process](../core-concepts/build-process) — Build details
