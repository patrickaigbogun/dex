# Copilot instructions (dex)

## Big picture
- Dex is a composable Bun-first framework repo.
- Core packages live in `framework/packages/`:
  - `framework/packages/router` (`@dex/router`): file-based router + generator + client runtime
  - `framework/packages/server` (`@dex/server`): Elysia helpers (assets, SPA fallback, dev reload)
  - `framework/packages/dev` (`@dex/dev`): small dev watch process supervisor
- Example/template app lives in `templates/starter/`.

## Template dev/build workflows
Run these from `templates/starter/`:
- Dev (multi-watch): `bun run dev`
- One-off route generation: `bun run generate`
- Production build: `bun run build`
- Start server (prod): `bun run start`

## Routing conventions (Dex)
- Source pages: `templates/starter/web/pages/**/*.tsx`
- Generated outputs (auto-generated; do not edit):
  - `templates/starter/core/router/.generated/routes.ts`
  - `templates/starter/core/router/.generated/layouts.ts`
- Client router runtime: `@dex/router/client`

Rules:
- `web/pages/index.tsx` => `/`
- `web/pages/foo/index.tsx` => `/foo`
- Dynamic segments: `[id].tsx` => `/:id`
- Catch-all: `[...slug].tsx` => `/*slug`
- Any file/folder starting with `_` is ignored by the generator.
- Pages may export `metadata` and `layout`.

## Server-side SPA behavior (Dex)
- SPA fallback helper: `dexSpaFallback()` from `@dex/server`
  - Skips `/api/*`, `/assets/*`, `/__dev/*`, and any path containing a `.`.
- Assets helper: `dexAssetsRoute()` from `@dex/server`
- Dev live reload: `dexDevReloadRouter()` from `@dex/server` + EventSource script in template HTML.

## Generated/artifacts
- Don’t commit built assets or generated route output (already gitignored):
  - `templates/**/web/public/assets/`
  - `templates/**/build/`
  - `templates/**/core/router/.generated/`

## Changelog
- Maintain an up-to-date `CHANGELOG.md` for package changes under `framework/packages/`.
- If a change affects a package, add or update the corresponding entry in `CHANGELOG.md`.
