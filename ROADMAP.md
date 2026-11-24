# Dex Framework — v0.5 Roadmap

> **Goal:** Completing this roadmap brings Dex to **`v0.5.0`**.
> Keep the summary checklist below in sync as each milestone and its test suite reaches 100% completion.

## v0.5 Summary Checklist
- [x] **Native Go CLI (`cli/`)** — single-binary distribution, sub-5ms startup, cross-platform builds, full command parity
- [x] **Core Unit & Integration Tests** — Bun test suites for `@dex/router`, `@dex/server`, `@dex/pie`, `@dex/cli`, and Go tests for `cli/`
- [ ] **Improved Benchmarking Suite & Performance Baselines** — route generation, SSG throughput, bundle size budgets, router matching, SSE scaling, watcher memory, CLI latency
- [ ] **Deployments & Vercel Compatibility** — Vercel Build Output API v3 adapter + automated deployment test suite, Netlify / Cloudflare / Railway / Render, official Docker support
- [ ] **Developer Experience, Validation & Templates** — `@dex/validation`, file watcher improvements (`--no-watch`), curated real-world templates
- [ ] **Core Modularity & Composable Package Architecture** — move `core/` out of userland into opt-in packages so apps compose only what they need, plus plugin/hook system & >80% coverage
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

## Next Up — Phase A: Performance & Improved Benchmarking Suite

### Benchmarking Suite
- [ ] **Route generation & manifest throughput:** benchmark 100 / 1,000 / 5,000 page sites (generation time + memory)
- [ ] **Route matching latency:** benchmark `findMatchingRoute` & `matchRoute` across 1k+ mixed static/dynamic/catch-all routes
- [ ] **SSG prerender throughput:** measure pages/sec and peak RSS when prerendering 500–1,000 static pages
- [ ] **Client bundle & chunk size budgets:** track `client.js`, per-route chunk sizes, and gzipped transfer sizes across releases
- [ ] **Server cold start & TTFB:** benchmark `build/server` startup time, static asset throughput, and SPA/SSG p95 latency
- [ ] **File watcher memory & reload latency:** profile RSS over sustained edit/reload cycles
- [ ] **SSE scaling:** test 100+ concurrent dev clients on `/__dev/reload`
- [ ] **CLI startup & command overhead:** measure `dex --version`, `dex pie generate`, and `dex scaffold` latency
- [ ] **CI regression gates:** publish baseline numbers in-repo and fail/warn in CI when regressions exceed thresholds

### Performance Optimization
- [x] Reduce CLI startup time via native Go binary (<5ms startup)
- [ ] Optimize router segment parsing & matching (trie/radix lookup for large route sets)
- [ ] Profile and reduce memory footprint of file watcher
- [ ] Persistent route cache to avoid full directory rescans on every watch trigger

---

## Phase B: Deployment & Production Readiness

### Vercel & Vercel-Like Providers
- [ ] **Vercel Build Output API v3 adapter (`.vercel/output/`):**
  - Emit static assets + prerendered SSG pages to `.vercel/output/static/`
  - Emit Elysia `/api/*` server function to `.vercel/output/functions/api.func/`
  - Generate `.vercel/output/config.json` routing rules (immutable `/assets/*`, subdomain routes, SPA fallback)
- [ ] **Automated Vercel deployment test suite:**
  - Schema & structure verification test suite in CI ensuring every update produces a valid `.vercel/output/` build
  - End-to-end preview deployment smoke test workflow (optional/scheduled or on release candidates)
- [ ] **Additional provider adapters & guides:**
  - Netlify (Build Output / Functions)
  - Cloudflare Pages / Workers
  - Railway / Render
  - Self-hosted (systemd, PM2, Docker)
- [ ] Implement `dex deploy` command (`dex deploy vercel`, `dex deploy railway`, etc.)
- [ ] Generate provider environment templates (`.env.example`)

### Docker Support
- [ ] Publish official multi-stage `Dockerfile` for Dex apps (dev + slim prod image running `build/server`)
- [ ] Add `docker-compose.yml` template for dev + prod
- [ ] Document container best practices (layer caching, env injection, healthchecks)
- [ ] Complete `templates/docker`

---

## Phase C: Developer Experience, Validation & Templates

### Default Validation System
- [ ] Integrate lightweight validation library (e.g., Zod or Valibot)
- [ ] Provide `@dex/validation` package with:
  - Route param schema helpers
  - Query/form validation middleware
  - Type-safe param/query inference
- [ ] Add validation examples to starters

### File Watcher Improvements
- [ ] Replace defensive try-catch in `watchAndGenerate()` with structured error logging
- [ ] Add `--no-watch` flag to dev commands for CI/headless environments
- [ ] Log actionable warnings when file watching initialization fails (inotify limits, permissions)
- [ ] Verify watch behavior across macOS, Linux, and Windows and document OS caveats

### Curated Example Templates
- [ ] **`templates/docker`** — Dockerfile + compose setup
- [ ] **`templates/fullstack-typed-api`** — Elysia + Dex routes + `@dex/pie` API best practices
- [ ] **`templates/with-validation`** — showcase default validation system integration
- [ ] **`templates/with-database`** — Dex + Drizzle/Prisma example
- [ ] **`templates/with-auth`** — authentication flow example
- [ ] **`templates/ssg`** & **`templates/isr`** — static and incremental rendering examples

---

## Phase D (Final Milestone for v0.5): Core Modularity & Composable Package Architecture

> **The defining goal of Dex:** Move what currently lives in userland `core/` (`core/bootstrap/*`, `core/runtime/*`, `core/router/.generated/*`) into composable, opt-in packages so developers can assemble an app with only the pieces they want — without needing every package installed.

### Moving `core/` Out of Userland
- [ ] Design the minimal kernel (`@dex/core`) vs opt-in feature packages (`@dex/router`, `@dex/server`, `@dex/dev`, `@dex/pie`, `@dex/validation`)
- [ ] Define clear package boundaries so users can run:
  - API-only apps (`@dex/server` without `@dex/router`)
  - Pure SPA/SSG frontends (`@dex/router` + `@dex/pie` without Elysia)
  - Full-stack apps composing all packages via thin `dex.config.ts` presets
- [ ] Shrink templates to thin, clean userland blueprints (no vendored `core/bootstrap/` boilerplate)

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
