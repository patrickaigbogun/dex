# Dex Framework — v0.5 Roadmap

> **Goal:** Completing this roadmap brings Dex to **`v0.5.0`**.
> Keep the summary checklist below in sync as each milestone and its test suite reaches 100% completion.

## v0.5 Summary Checklist
- [x] **Native Go CLI (`cli/`)** — single-binary distribution, sub-5ms startup, cross-platform builds, full command parity
- [x] **Core Unit & Integration Tests** — Bun test suites for `@dex/router`, `@dex/server`, `@dex/pie`, `@dex/cli`, and Go tests for `cli/`
- [x] **Improved Benchmarking Suite & Performance Baselines** — route generation, SSG throughput, bundle size budgets, router matching, SSE scaling, watcher memory, CLI latency (CI regression gate active)
- [x] **Deployments & Vercel Compatibility** — Vercel Build Output API v3 adapter + automated deployment contract test suite, Netlify / Cloudflare / Railway / Render, `dex deploy`, official Docker support
- [x] **Developer Experience, Validation & Templates** — `@dex/validation` (Standard Schema + built-in `v.*` + Elysia/React helpers), file watcher improvements (`--no-watch`, structured errors), curated real-world templates (`docker`, `fullstack-typed-api`, `with-validation`, `with-auth`, `with-database`, `ssg`)
- [x] **Core Modularity & Composable Package Architecture** — `@dex/core` replacing userland `core/`, flat `config/core/` composition, `dex install` reconciler, safe package-only `dex sync`, `dex prune`, `DexPlugin` hooks
- [ ] **Documentation Redesign & Guides** — full docs overhaul, architecture deep dives, deployment & plugin authoring guides

---

## Completed Foundation (Shipped in v0.3.0)

### Native Go CLI (`cli/`)
- [x] Build zero-dependency Go CLI (`cli/`)
  - Sub-5ms startup time (no VM overhead)
  - Single binary distribution (~6 MB uncompressed)
  - Cross-platform builds (`linux-x64`, `linux-arm64`, `darwin-x64`, `darwin-arm64`, `windows-x64.exe`) + `SHA256SUMS`
- [x] Full feature parity with TypeScript CLI (`scaffold`, `sync`, `template`, `pie generate`, `update`, `versions`, `use`, `build`, `start`, `tag`)
- [x] Seamless installation & multi-version management (`install.sh`, `install.ps1`, `~/.dex/`)
- [x] Keep TypeScript CLI (`framework/packages/cli`) as workspace package reference

### Core Testing & CI Infrastructure
- [x] Unit test suite for `@dex/router` (route matching, segment parsing, precedence sorting, client router, `composeRoutes`, route/layout generation)
- [x] Integration tests for `@dex/server` (SPA fallback, SSG serving, assets path safety, `<head>` injection, Google Fonts, subdomain redirects, env/port utilities)
- [x] Tests for `@dex/pie` and `@dex/cli`
- [x] Go CLI tests across `cli/cmd/dex` and `cli/internal/{core,pie,runner,scaffold,version}`
- [x] CI/CD running `bun test`, `bun run typecheck`, `go vet ./...`, and `go test ./...`

---

## Phase A (Complete): Performance & Improved Benchmarking Suite

### Benchmarking Suite (`framework/benchmarks/`)
- [x] **Route generation & manifest throughput:** benchmark 100 / 1,000 page sites (`10.1ms` / `54.8ms`)
- [x] **Route matching latency:** benchmark `findMatchingRoute` across 1,000 mixed static/dynamic/catch-all routes (`422k ops/s`, `p50 0.44µs`, `p99 12.5µs` — 28× faster after static/prefix indexing)
- [x] **SSG prerender throughput:** measure 500 static pages + `<head>` + Google Fonts (`5,431 pages/s`, peak RSS `87.2 MB`)
- [x] **Client bundle & chunk size budgets:** track `client.js` (`358.4 KB` raw / `108.5 KB` gzip, 10 lazy chunks, `43ms` build)
- [x] **Server throughput & p95 latency:** SPA (`7,775 req/s`, `p95 0.146ms`), SSG (`13,769 req/s`), static assets (`14,928 req/s`)
- [x] **File watcher memory & reload latency:** 50 consecutive edit/regen cycles on 200 pages (`1.65ms` avg, `+4.0 MB` RSS)
- [x] **SSE scaling:** 100 concurrent dev clients on `/__dev/reload` (`2.75ms` broadcast, `+0.25 MB` RSS)
- [x] **CLI startup & command overhead:** Go binary `6.06 MB`, `2.71ms` median startup, `5.1ms` 100-endpoint YAML `dex pie generate`
- [x] **CI regression gates:** baseline stored in `framework/benchmarks/baseline.json` and enforced via `bun run bench:check` in `.github/workflows/ci.yml`

### Performance Optimization
- [x] Reduce CLI startup time via native Go binary (<5ms startup)
- [x] Optimize router matching for large route sets (`WeakMap`-cached O(1) static map + first-segment bucket index in `findMatchingRoute`)
- [ ] Profile and reduce memory footprint of file watcher
- [ ] Persistent route cache to avoid full directory rescans on every watch trigger

---

## Phase B (Complete): Deployment & Production Readiness

### Vercel & Vercel-Like Providers
- [x] **Vercel Build Output API v3 adapter (`.vercel/output/`):**
  - Emit static assets + prerendered SSG pages to `.vercel/output/static/`
  - Emit Elysia `/api/*` server function to `.vercel/output/functions/api.func/`
  - Generate `.vercel/output/config.json` routing rules (immutable `/assets/*`, subdomain routes, SPA fallback)
- [x] **Automated Vercel deployment test suite:**
  - End-to-end contract test suite (`framework/packages/dev/tests/vercel-deploy.test.ts`) running in CI on every push, validating `config.json`, static/SSG output, cache-busting hashes, and invoking the compiled `api.func` handler
- [x] **Additional provider adapters (`dexPrepareProvider`):**
  - Netlify (`netlify.toml`), Cloudflare (`wrangler.toml` + `build/.assetsignore`), Railway (`railway.toml`), Render (`render.yaml`), Self-hosted / Docker
- [x] Implement `dex deploy` command in Go & TS CLIs (`dex deploy <vercel|netlify|cloudflare|railway|render|docker> [--dry-run] [--prod]`)
- [x] Generate provider environment templates (`.env.example`)

### Docker Support
- [x] Publish official multi-stage `Dockerfile` for Dex apps (non-root `dex` user, layer caching, `/api/v1/health` healthcheck)
- [x] Add `docker-compose.yml` template for dev + prod
- [x] Document container best practices (layer caching, env injection, healthchecks)
- [x] Complete `templates/docker`

---

## Phase C (Complete): Developer Experience, Validation & Templates

### Default Validation System
- [x] Build Standard Schema v1 & Zod-compatible `@dex/validation` package with zero-dep built-in `v.*` schema builder
- [x] Provide `@dex/validation` helpers:
  - Route param schema helpers (`validateParams`, `useValidatedParams`)
  - Query/body validation helpers & Elysia middleware (`validateQuery`, `validateBody`, `dexValidate`, `useValidatedQuery`)
  - Type-safe `Infer<S>` param/query inference + prototype-pollution guards
- [x] Add validation examples in `templates/with-validation` and `templates/fullstack-typed-api`

### File Watcher Improvements
- [x] Replace silent try-catch in `watchAndGenerate()` with structured error logging & actionable `EMFILE`/`ENOSPC` hints
- [x] Add `--no-watch` flag (`DEX_NO_WATCH=1` / `noWatch: true`) to `dexDev` for CI/headless environments
- [x] Clean `.stop()` handle + `AbortSignal` support + startup failure cleanup & unit tests (`watcher.test.ts`)

### Curated Example Templates
- [x] **`templates/docker`** — multi-stage Dockerfile + compose setup
- [x] **`templates/fullstack-typed-api`** — Elysia + `@dex/validation` + `@dex/pie` API best practices
- [x] **`templates/with-validation`** — showcase `@dex/validation` on client & server
- [x] **`templates/with-database`** — Dex + `bun:sqlite` (WAL, parameterized queries, `DB_PATH`)
- [x] **`templates/with-auth`** — HMAC-SHA256 signed tokens with expiration, timing-safe verification, and protected layout guard
- [x] **`templates/ssg`** — static-first site with OpenGraph `metadata`, Google variable fonts, and `<ClientOnly>` islands

---

## Phase D (Complete — v0.5.0): Core Modularity & Composable Package Architecture

> **The defining goal of Dex:** Move what previously lived in userland `core/` (`core/bootstrap/*`, `core/runtime/*`, `core/router/.generated/*`) into `@dex/core`, compose the framework declaratively in `config/core/`, and keep `packages/` clean and upgradeable.

### Moving `core/` Out of Userland & Config-as-Composition
- [x] Build `@dex/core` package replacing userland `core/bootstrap/*` and `core/runtime/*`; move generated files to `.dex/generated/`
- [x] Move framework configuration to `config/core/` (flat `index.ts` exporting `router.ts`, `server.ts`, `api.ts`, `build.ts`; `core/` is the only subfolder in `config/`, with app configs flat in `config/`)
- [x] Add `dex install` reconciler — reads `config/core/`, installs only enabled `@dex/*` packages, and scaffolds missing userland folders (`web/`, `routes/`, `lib/`) without overwriting existing files
- [x] Upgrade `dex sync` to safe package-only upgrades by default (`--dry-run`, multi-version jump safe, `SHA256SUMS` verification, `--include-template` opt-in) + `SHA256SUMS`-verified `dex update` and `dex prune`
- [x] Define clear package boundaries so users can run:
  - API-only apps (`@dex/core` + `@dex/server` without `@dex/router`)
  - Pure SPA/SSG frontends (`@dex/core` + `@dex/router` + `@dex/pie` without Elysia)
  - Full-stack apps composing all packages via `config/core/`
- [x] Remove userland `core/` from templates (`templates/starter`, `templates/spa`)
- [x] Lightweight `DexPlugin` lifecycle hooks (`onGenerate`, `onBeforeBuild`, `onAfterBuild`, `onServer`) in `@dex/core`

### Plugin Architecture & Extensibility
- [ ] Design plugin/hook interface for:
  - Custom route generators
  - Build-time transformations
  - Dev server middleware
  - Deployment provider adapters
  - Validation/schema plugins
- [ ] Refactor `framework/packages/cli` into composable TS modules (`cli/core`, `cli/router`, `cli/build`, `cli/dev`) for programmatic JS integration
- [ ] Add coverage reporting and enforce >80% test coverage across all core packages
- [ ] Document plugin authoring guide

---

## Ongoing

### Code Quality & Docs
- [x] Maintain `CHANGELOG.md` entries for package and CLI releases
- [ ] Full documentation redesign & interactive guides (planned)
- [ ] Keep roadmap synchronized with GitHub milestones & issues
- [ ] Publish and track performance baselines in CI
