# Changelog

All notable changes to the Dex framework, packages, templates, and CLI are documented in this file.

## [v0.5.0] - 2026-11-25

### `@dex/core` & Config-as-Composition
- Added **`@dex/core`** package (`framework/packages/core/`) replacing userland `core/bootstrap/*` and `core/runtime/*` with opt-in composition (API-only, frontend-only, and full-stack) and `DexPlugin` lifecycle hooks (`onGenerate`, `onBeforeBuild`, `onAfterBuild`, `onServer`).
- Moved framework configuration to **`config/core/`** (flat `index.ts` exporting `router.ts`, `server.ts`, `api.ts`, `build.ts`, with backward compatibility for legacy `dex.config.*`).
- Moved generated artifacts from `core/router/.generated/*` and `core/api/generated.ts` to **`.dex/generated/`**, removing the userland `core/` folder from `templates/starter` and `templates/spa`.
- Updated `dexBuild` to statically bundle `config/core/*` and `routes/api/*` into the standalone `build/server` binary.

### Refined Framework & CLI Updates
- Added **`dex install`** reconciler (Go & TS CLIs): reads `config/core/`, installs only enabled `@dex/*` packages, and scaffolds missing userland starter files without overwriting existing code.
- Upgraded **`dex sync`** to safe package-only upgrades by default (`--dry-run`, multi-version jump safe, `SHA256SUMS` verification, `--include-template` opt-in).
- Added `SHA256SUMS` binary verification to **`dex update`** and added **`dex prune`** (symlink-safe cleanup of inactive versions in `~/.dex/versions/`).

## [v0.4.0] - 2026-11-24

### Performance & Benchmarking
- Added 6-suite benchmark harness (`framework/benchmarks/`) covering route generation, 1k-route matching, SSG prerender throughput, client ESM bundle budgets, server/SSE fan-out, watcher memory, and Go CLI latency, enforced in CI via `bun run bench:check`.
- Optimized `@dex/router` `findMatchingRoute` with a `WeakMap`-cached O(1) static map and first-segment bucket index (28x faster on 1,000 routes).

### Deployments & Production Readiness
- Added **Vercel Build Output API v3** adapter (`dexBuildVercel`) with automated CI contract test suite (`vercel-deploy.test.ts`), immutable `/assets/*` headers, subdomain rewrites, `/__dev/*` 404 blocking, and bundled Elysia serverless function (`api.func`).
- Stripped the `/__dev/reload` SSE script automatically from production HTML in `dexPrepareBuild`.
- Added `dex deploy <vercel|netlify|cloudflare|railway|render|docker>` in Go and TS CLIs, provider config generators (`dexPrepareProvider`), and official Dex-CLI-powered multi-stage `Dockerfile` & `docker-compose.yml` (`templates/docker/`).

### Validation, Watchers & Templates
- Added `@dex/validation` (zero-dep Standard Schema v1 & Zod-compatible validation with built-in `v.*` builder, `dexValidate` Elysia middleware, `useValidatedParams`/`useValidatedQuery` React hooks, and prototype-pollution guards).
- Upgraded `watchAndGenerate()` with structured `[dex-router]` warnings (`EMFILE`/`ENOSPC` hints), clean `.stop()` / `AbortSignal` teardown, and `--no-watch` mode in `dexDev`.
- Updated all template `package.json` scripts to invoke the `dex` CLI directly (`dex start`, `dex build`, `dex start -p`) and added curated templates (`fullstack-typed-api`, `with-validation`, `with-auth`, `with-database`, `ssg`, `docker`).

## [v0.3.0] - 2026-11-24

### Added
- **Native Go CLI (`cli/`)**: Standalone sub-5ms Go binary (<8 MB) implementing `scaffold`, `sync`, `template`, `pie generate`, `update`, `versions`/`list`, `use`, `build`, `start [-p]`, `tag`, and `--version [-f]` with cross-platform builds (`linux`, `darwin`, `windows`) and `SHA256SUMS` release verification.
- **`dex template` & Git-Diff Deletion Tracking**: Added `dex template list`, `dex template cache list|clean`, and `dex template diff [tag]`, paired with `scripts/generate-template-diff.ts` (`dex-diff-<tag>.json`) to track both changed and deleted template files across releases.
- **ESM Code Splitting & Asset Cache Busting**: `dexBuildClient()` and `client:watch` bundle `core/bootstrap/web.tsx` with `--splitting --format esm` (`build/assets/client.js` and `build/assets/chunks/[name]-[hash].js`), and `dexBuild()` appends 8-character SHA-256 `?v=<hash>` query parameters to `/assets/client.js` and `/assets/styles.css` across `build/index.html` and prerendered SSG HTML.
- **SSG `<head>` Metadata & Router Context Injection**: `dexPrerender()` wraps SSG renders in `<RouterContext.Provider>` (`createStaticRouterState`) so router hooks and `<Link>` work during static prerendering, and injects `<title>`, `<meta name="description">`, Open Graph, and Twitter tags (`injectHeadMeta`) plus configured Google Fonts into `<head>`.
- **Subdomain Mounting & Canonical Redirects**: Added `subdomains` configuration in `dex.config.ts` with client-side URL normalization (`resolveSubdomainMount`, `toInternalPathname`, `toExternalPathname`, `toExternalHref`) in `@dex/router/client` and canonical `308` redirects in `dexSpaFallback()`.
- **Google Variable Fonts & Tailwind v4 `@theme`**: Added `@dex/server` `fonts` helpers (`buildGoogleFontsUrl`, `injectGoogleFonts`, `generateFontThemeCss`) and `dex.config.ts` `fonts` support for preconnect links, `:root` CSS variables, `.font-<key>` utility classes, and Tailwind v4 `@theme` output.
- **`<Link>` Validation & `RouterErrorBoundary`**: `<Link>` now validates required `to`/`href` destination props, blocks unsafe URL schemes (`hasUnsafeScheme`), enforces `noopener noreferrer` on `target="_blank"`, and `<FileRouter>` wraps routes and layouts in `RouterErrorBoundary` with automatic reset on navigation.
- **`@dex/pie` YAML OpenAPI & Idempotent Retry Safety**: `generateApi()` and the Go CLI `dex pie generate` support both JSON and YAML OpenAPI 3.x specs (with 50 MB size limits and prototype-safe parsing), while `@dex/pie` restricts default automatic retries to idempotent methods (`GET`, `HEAD`, `OPTIONS`, `PUT`, `DELETE`).

### Security & Hardening
- Hardened `@dex/server` `dexAssetsRoute()` and `dexSpaFallback()` against null bytes, backslashes, encoded path traversal (`..`), invalid host headers (`trustProxy` / `allowedHosts`), and unsafe metadata URL schemes (`javascript:`, `data:`, `vbscript:`).
- Hardened Go CLI archive extraction, URL/repo/tag validation, YAML recursion limits, and `parseJSConfig` comment filtering.

### Fixed
- Synced `core/bootstrap/{dev,build,scripts,web}` entrypoints in `templates/starter/` and removed stale `scripts/` references.
- Awaited `findAvailablePort` in `core/runtime/app/index.ts` and `core/runtime/server/prod.ts` for reliable port fallback.

## [v0.2.5] - 2026-10-03

### Fixed
- Removed obsolete `scripts/` directory from the published SPA template (`templates/starter/`).
- Resolved the latest release tag properly in `cmdSync` instead of re-syncing the current `.dex/metadata.json` tag.

## [v0.2.4] - 2026-10-02

### Fixed
- Synced updated `dexBuild()` implementation into template packages and awaited `findAvailablePort` in template runtime entrypoints.

## [v0.2.3] - 2026-10-01

### Fixed
- Prevented recursive process loops in CLI/template execution by invoking `core/bootstrap/` entrypoints directly.
- Simplified `templates/starter/package.json` scripts to `dev`, `build`, and `start`.

## [v0.2.2] - 2026-09-28

### Fixed
- Embedded release tag version at compile time (`main.Version`) and aligned all workspace package versions.

## [v0.2.1] - 2026-09-25

### Added
- Multi-version CLI management (`dex update`, `dex versions`/`list`, `dex use`) with `~/.dex/versions/<tag>/dex` and `~/.dex/bin/dex` shim layout.
- Dedicated user-facing `@dex/pie` documentation and CLI command docs.
- CI unit test step (`bun test`).

## [v0.2.0] - 2026-09-21

### Added
- **`@dex/pie`**: Transformed Pie into a framework-agnostic typed route-tree HTTP client with `generateApi` OpenAPI codegen, `treatyPie` adapter, exponential-backoff retries, and lifecycle hooks.
- **`dex pie generate` CLI command**: Generates `core/api/generated.ts` from OpenAPI specs, wired to userland `lib/api.ts`.
- **`@dex/router` enhancements**: Concurrent route transitions (`useTransition`), intent prefetching on `<Link>`, deterministic route precedence sorting (`sortRoutesByPrecedence`), and unit test suite.
- **`@dex/server` enhancements**: Path-traversal hardening on `/assets/*` and SSG lookup, improved SPA fallback HTTP status handling, and `env.ts` / `port.ts` utilities.
- **`@dex/dev` enhancements**: Lazy `importPage` support in `dexPrerender()`.
- **Fumadocs documentation site**: Structured documentation site in `learn/dex-framework-docs/`.
