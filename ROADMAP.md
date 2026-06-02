# Dex Framework Roadmap

## Overview
Dex is evolving toward a truly modular, composable Bun-first framework. This roadmap outlines planned improvements across CLI architecture, core modularity, testing, deployment, and performance.

---

## Phase 1: Core Modularity & Testing (Q3 2026)

### CLI Modularization
- [ ] Refactor `framework/packages/cli` into independent, composable modules
  - `cli/core` — command registry, argument parsing
  - `cli/router` — route generation commands
  - `cli/build` — build pipeline orchestration
  - `cli/dev` — dev server & watcher commands
- [ ] Publish each CLI module as a separate npm package for external integration
- [ ] Add plugin/hook system for third-party CLI extensions

### Package System Design (Plugin Architecture)
- [ ] Formalize "packages" terminology; rename/clarify internal package boundaries
- [ ] Design plugin interface for:
  - Custom route generators
  - Build-time transformations
  - Dev server middleware
  - Validation/schema plugins (see below)
- [ ] Document plugin authoring guide
- [ ] Support manual assembly via workspace resolution (current approach) + future auto-discovery

### Testing Infrastructure
- [ ] Add unit test suite for `@dex/router` (route matching, segment parsing, metadata resolution)
- [ ] Add integration tests for `@dex/server` (SPA fallback, assets, dev reload)
- [ ] Add CLI tests (command parsing, file generation, error handling)
- [ ] Set up CI/CD with test coverage reporting
- [ ] Target: >80% coverage on core packages

---

## Phase 2: Developer Experience & Templates (Q4 2026)

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

## Phase 3: Deployment & Production Readiness (2027 Q1)

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
- [ ] Provide multi-stage build example (dev → prod)
- [ ] Document container best practices (layer caching, env injection)
- [ ] Include Docker template in `templates/docker`

---

## Phase 4: Performance & Benchmarks (2027 Q2)

### Benchmarking Suite
- [ ] **Route generation:** benchmark 1k+ page site generation time
- [ ] **File watcher memory:** profile memory over time with hot reloads
- [ ] **SSE scaling:** test 100+ concurrent dev clients on dev reload endpoint
- [ ] **CLI startup:** measure CLI invocation overhead
- [ ] Document baselines in `ROADMAP.md` and track regressions in CI

### Performance Optimization
- [ ] Optimize router segment parsing for large route sets
- [ ] Reduce CLI startup time (lazy-load plugins, tree-shake unused code)
- [ ] Profile and reduce memory footprint of file watcher
- [ ] Consider persistent route cache to avoid regeneration on every watch trigger

---

## Phase 5: CLI Port to Go (2027 Q3+)

### Go CLI Implementation
- [ ] Prototype Go-based CLI (`dex-cli-go`)
  - Faster startup time (no VM overhead)
  - Single binary distribution
  - Better cross-platform support
- [ ] Maintain feature parity with Bun/TypeScript CLI
- [ ] Provide migration path for existing users
- [ ] Keep TypeScript CLI as fallback for extensibility
- [ ] Decide: replace or coexist with Bun CLI based on adoption

---

## Ongoing

### Code Quality
- [ ] Maintain changelog entries for all package changes
- [ ] Keep roadmap synchronized with GitHub milestones
- [ ] Review and close stale issues monthly
- [ ] Gather user feedback on plugin/package system

### Documentation
- [ ] Expand plugin authoring guide
- [ ] Add framework architecture overview
- [ ] Document performance baselines and regression prevention
- [ ] Create video tutorials for key workflows

---

## Success Criteria
- ✅ Framework is truly modular — packages can be composed independently
- ✅ Plugin system is documented and has 3+ community plugins
- ✅ Test coverage >80% on core packages
- ✅ CLI startup time <500ms on typical hardware
- ✅ Deployment guides cover 5+ providers
- ✅ Docker experience is frictionless
- ✅ Performance baselines are published and tracked