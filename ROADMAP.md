# Dex Framework Roadmap

## Overview
Dex is evolving toward a modular, composable Bun-first framework powered by a native Go CLI. This roadmap tracks completed milestones and planned improvements across CLI architecture, core modularity, testing, deployment, and performance.

---

## Phase 1: Core Modularity & Testing

### CLI Modularization
- [ ] Refactor `framework/packages/cli` into independent, composable TypeScript modules (for external JS integration alongside the native Go CLI)
  - `cli/core` — command registry, argument parsing
  - `cli/router` — route generation commands
  - `cli/build` — build pipeline orchestration
  - `cli/dev` — dev server & watcher commands
- [ ] Publish each CLI module as a separate npm package for external integration
- [ ] Add plugin/hook system for third-party CLI extensions

### Package System Design (Plugin Architecture)
- [ ] Formalize "packages" terminology; clarify internal package boundaries
- [ ] Design plugin interface for:
  - Custom route generators
  - Build-time transformations
  - Dev server middleware
  - Validation/schema plugins (see below)
- [ ] Document plugin authoring guide
- [ ] Support manual assembly via workspace resolution (current approach) + future auto-discovery

### Testing Infrastructure
- [x] Add unit test suite for `@dex/router` (route matching, segment parsing, precedence sorting, client router, `composeRoutes`, route/layout generation)
- [x] Add integration tests for `@dex/server` (SPA fallback, assets path safety, dev reload, env/port utilities)
- [x] Add tests for `@dex/pie` and `@dex/cli`
- [x] Add Go CLI tests across `cli/cmd/dex` and `cli/internal/{core,pie,runner,scaffold,version}`
- [x] Set up CI/CD with test execution (`bun test`, `bun run typecheck`, `go vet ./...`, `go test ./...`)
- [ ] Add coverage reporting and enforce >80% coverage on core packages

---

## Phase 2: Developer Experience & Templates

### Example Templates
- [ ] **`templates/with-validation`** — showcase default validation system integration
- [ ] **`templates/with-database`** — Dex + Drizzle/Prisma example
- [ ] **`templates/with-auth`** — authentication flow example
- [ ] **`templates/docker`** — Dockerfile + compose setup
- [ ] **`templates/fullstack-api`** — Elysia + Dex routes + API best practices

### Default Validation System
- [ ] Integrate lightweight validation library (e.g., Zod, Valibot)
- [ ] Provide `@dex/validation` package with:
  - Route param schema helpers
  - Query/form validation middleware
  - Type-safe param/query inference
- [ ] Add validation examples to starters

### File Watcher Improvements
- [ ] Replace defensive try-catch in `watchAndGenerate()` with structured error logging
- [ ] Add `--no-watch` flag to dev commands for CI/headless environments
- [ ] Log warnings when file watching initialization fails (unavailable watchers, permission issues)
- [ ] Test watch behavior across macOS, Linux, Windows
- [ ] Document known limitations per OS

---

## Phase 3: Deployment & Production Readiness

### Deployment Guides & CLI Commands
- [ ] Write deployment guides for:
  - Vercel (Edge Functions)
  - Netlify (Functions + Build Plugins)
  - Railway / Render
  - Self-hosted (systemd, PM2, Docker)
- [ ] Implement `dex deploy` command with provider plugins
  - `dex deploy vercel`
  - `dex deploy railway`
  - (extensible via plugin system)
- [ ] Generate environment templates (`.env.example`) per provider

### Docker Support
- [ ] Publish official Dockerfile for Dex apps
- [ ] Add `docker-compose.yml` template for dev + prod
- [ ] Provide multi-stage build example (dev to prod)
- [ ] Document container best practices (layer caching, env injection)
- [ ] Include Docker template in `templates/docker`

---

## Phase 4: Performance & Benchmarks

### Benchmarking Suite
- [ ] **Route generation:** benchmark 1k+ page site generation time
- [ ] **File watcher memory:** profile memory over time with hot reloads
- [ ] **SSE scaling:** test 100+ concurrent dev clients on dev reload endpoint
- [ ] **CLI startup:** measure CLI invocation overhead
- [ ] Document baselines in `ROADMAP.md` and track regressions in CI

### Performance Optimization
- [ ] Optimize router segment parsing for large route sets
- [x] Reduce CLI startup time via native Go binary (<5ms startup)
- [ ] Profile and reduce memory footprint of file watcher
- [ ] Consider persistent route cache to avoid regeneration on every watch trigger

---

## Phase 5: CLI Port to Go

### Go CLI Implementation
- [x] Build Go-based CLI (`cli/`)
  - Sub-5ms startup time (no VM overhead)
  - Single binary distribution (<8 MB)
  - Cross-platform builds (`linux-x64`, `linux-arm64`, `darwin-x64`, `darwin-arm64`, `windows-x64.exe`)
- [x] Maintain feature parity with Bun/TypeScript CLI (`scaffold`, `sync`, `template`, `pie generate`, `update`, `versions`, `use`, `build`, `start`, `tag`)
- [x] Provide seamless installation and version management (`install.sh`, `install.ps1`, `~/.dex/`)
- [x] Keep TypeScript CLI (`framework/packages/cli`) as fallback/package reference

---

## Ongoing

### Code Quality
- [x] Maintain `CHANGELOG.md` entries for package and CLI releases
- [ ] Keep roadmap synchronized with GitHub milestones
- [ ] Review and close stale issues monthly
- [ ] Gather user feedback on plugin/package system

### Documentation
- [ ] Expand plugin authoring guide
- [x] Maintain Fumadocs documentation site (`learn/dex-framework-docs/`) covering CLI, Router, Server, Pie, Dev, and Core Concepts
- [ ] Document performance baselines and regression prevention
- [ ] Create video tutorials for key workflows

---

## Success Criteria
- Framework is modular — `@dex/router`, `@dex/server`, `@dex/dev`, `@dex/pie`, and `@dex/cli` compose independently
- Native Go CLI delivers <5ms startup and single-binary cross-platform distribution
- Core packages and Go CLI have automated unit/integration test suites running in CI
- Plugin system documented with community plugins (in progress)
- Deployment guides and Docker workflow streamlined across major platforms (in progress)
