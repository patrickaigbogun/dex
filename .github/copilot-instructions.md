# Copilot instructions (dex)

## Big picture
- Dex is a composable, Bun-first full-stack framework with a **Native Go CLI** (`cli/`).
- Native Go CLI lives in `cli/` (`cmd/dex`, `internal/{core,pie,runner,scaffold,version}`).
- Core TypeScript packages live in `framework/packages/`:
  - `framework/packages/router` (`@dex/router`): file-based router, route/layout generator, client runtime, `RouterErrorBoundary`, subdomain helpers
  - `framework/packages/server` (`@dex/server`): Elysia helpers (`dexAssetsRoute`, `dexSpaFallback`, `dexDevReloadRouter`, `dexPrettyLogger`, `injectHeadMeta`, `injectGoogleFonts`, `generateFontThemeCss`, `getPublicEnvDefines`, `findAvailablePort`)
  - `framework/packages/dev` (`@dex/dev`): parallel dev supervisor (`dexDev`, `spawnGroup`) and build/SSG pipeline (`dexBuild`, `dexBuildClient`, `dexPrepareBuild`, `dexPrerender`)
  - `framework/packages/pie` (`@dex/pie`): framework-agnostic typed route-tree HTTP client, OpenAPI JSON/YAML codegen (`generateApi`), `treatyPie`, and idempotent retry utilities
  - `framework/packages/cli` (`@dex/cli`): TypeScript CLI package
- Example/template app lives in `templates/starter/`.
- Documentation site lives in `learn/dex-framework-docs/` (Fumadocs + Next.js).

## Template structure & workflows (`templates/starter/`)
- Bootstrap entrypoints:
  - `core/bootstrap/dev.ts` — calls `runDev()` (`dexDev`)
  - `core/bootstrap/build.ts` — calls `runBuild()` (`dexBuild`)
  - `core/bootstrap/scripts.ts` — exports `runDev`, `runBuild`, `runBuildClient`, `runPrepareBuild`, `runPrerender`
  - `core/bootstrap/web.tsx` — mounts `<FileRouter routes={routes} layouts={layouts} GlobalLayout={GlobalLayout} />`
- Runtime server entrypoints:
  - `core/runtime/app/index.ts` — dev Elysia server (port fallback via `findAvailablePort`, `/api`, `/assets/*`, `/__dev/reload`, SPA fallback)
  - `core/runtime/server/prod.ts` — production Elysia server compiled into `build/server`
- API & client:
  - `core/api/generated.ts` — OpenAPI-generated `@dex/pie` types & `createApiClient`
  - `lib/api.ts` — userland `createPie<ApiRoutes>` client instance
  - `routes/api/` — Elysia API route handlers
- Frontend & styles:
  - `web/pages/**/*.tsx`, `web/layouts/*.tsx`, `web/public/index.html`, `web/styles/index.css`
- Commands from `templates/starter/` (or via `dex` CLI):
  - Dev: `dex start` or `bun run dev` (`bun core/bootstrap/dev.ts`)
  - Build: `dex build` or `bun run build` (`bun core/bootstrap/build.ts`)
  - Prod: `dex start -p` or `bun run start` (`NODE_ENV=production ./build/server`)
  - OpenAPI codegen: `dex pie generate [spec]`

## Routing conventions (Dex)
- Source pages: `templates/starter/web/pages/**/*.tsx`
- Source layouts: `templates/starter/web/layouts/**/*.{ts,tsx}`
- Generated outputs (auto-generated; do not edit):
  - `templates/starter/core/router/.generated/routes.ts` (uses lazy `importPage: () => import(...)`)
  - `templates/starter/core/router/.generated/manifest.json`
  - `templates/starter/core/router/.generated/layouts.ts`
- Client router runtime: `@dex/router/client`

Rules:
- `web/pages/index.tsx` => `/`
- `web/pages/foo/index.tsx` => `/foo`
- Dynamic segments: `[id].tsx` => `/:id`
- Catch-all: `[...slug].tsx` => `/*slug`
- Any file/folder starting with `_` is ignored by the generator.
- Pages may export `metadata` (`title`, `description`, `renderStrategy`, `og*`, `twitterCard`) and `layout`.

## Server-side SPA & SSG behavior (Dex)
- SPA fallback helper: `dexSpaFallback()` from `@dex/server`
  - Skips `/api/*`, `/assets/*`, `/__dev/*`, traversal paths, and file-extension requests.
  - Resolves prerendered HTML from `build/__ssg/` when present, injects `<head>` metadata (`resolveHead`) and Google Fonts (`fonts`), and enforces canonical subdomain redirects (`subdomains`).
- Assets helper: `dexAssetsRoute()` from `@dex/server` (path-traversal guarded `/assets/*` serving).
- Dev live reload: `dexDevReloadRouter()` from `@dex/server` + EventSource script in `web/public/index.html`.

## Testing & Verification
- Framework tests & types: run `bun test` and `bun run typecheck` inside `framework/`.
- Go CLI tests & vet: run `go vet ./...` and `go test ./...` inside `cli/`.

## Generated/artifacts
- Do not commit built assets or generated route output (already gitignored):
  - `templates/**/web/public/assets/`
  - `templates/**/build/`
  - `templates/**/core/router/.generated/`

## Changelog
- Maintain an up-to-date `CHANGELOG.md` for package, template, and CLI changes.
