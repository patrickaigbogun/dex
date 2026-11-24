# Dex

Dex is a composable, Bun-first full-stack framework powered by a **Native Go CLI (`dex`)** (<8 MB binary, <5ms startup), file-based React routing, Elysia server primitives, SSG prerendering, and a typed OpenAPI route-tree HTTP client.

## Packages & Components

- **Native Go CLI (`cli/`)**: Fast, zero-dependency Go binary for scaffolding, upstream template syncing, template diffing/caching, multi-version switching (`~/.dex/`), builds, server execution, and OpenAPI codegen.
- **`@dex/router`**: File-based React router, route/layout generator (`importPage: () => import(...)`), concurrent transitions, intent prefetching, subdomain mounting, `ClientOnly`, and `RouterErrorBoundary`.
- **`@dex/server`**: Elysia helpers for path-safe static assets (`/assets/*`), SSG-aware SPA fallback, canonical subdomain redirects, Google variable fonts injection, `<head>` metadata injection, dev live reload (`/__dev/reload`), and env/port utilities.
- **`@dex/dev`**: Parallel dev supervisor (`dexDev`) and production build pipeline (`dexBuild`, `dexPrerender`) with ESM code splitting, `?v=<hash>` cache busting, and standalone Bun server compilation.
- **`@dex/pie`**: Framework-agnostic typed route-tree HTTP client and JSON/YAML OpenAPI code generator with lifecycle hooks and idempotent retry safety.
- **`@dex/cli`**: TypeScript/Bun CLI package (`framework/packages/cli`) retained as a composable workspace package alongside the native Go CLI.

## Feature Highlights

- **ESM Code Splitting & Cache Busting**: Production builds compile `core/bootstrap/web.tsx` into `build/assets/client.js` and `build/assets/chunks/[name]-[hash].js`, with automatic `?v=<hash>` query strings rewritten across `build/index.html` and prerendered HTML.
- **SSG Prerendering & `<head>` Metadata**: Static routes resolving to `'ssg'` render into `build/__ssg/` and `build/<route>/index.html` wrapped in `<RouterContext.Provider>`, with page `metadata` (title, description, Open Graph, Twitter cards) and Google Fonts injected into `<head>`.
- **Subdomain Mounting & Canonical Redirects**: Map subdomains (e.g. `{ docs: '/docs' }`) in `dex.config.ts` for clean subdomain URLs and automatic `308` redirects from main-domain prefixed paths.
- **Google Variable Fonts & Tailwind v4 `@theme`**: Configure `fonts` in `dex.config.ts` to inject `<link>` preconnects, `:root` CSS variables, `.font-<key>` utilities, and `@theme` definitions (`generateFontThemeCss`).
- **Typed OpenAPI Client (`@dex/pie`)**: Generate TypeScript DTOs and navigable route trees (`core/api/generated.ts`) from JSON or YAML OpenAPI 3.x specs.

## Install `dex` (GitHub Releases)

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/patrickaigbogun/dex/master/install.sh | bash
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/patrickaigbogun/dex/master/install.ps1 | iex
```

The installer stores versioned binaries in `~/.dex/versions/<version>/dex` and links the active binary at `~/.dex/bin/dex` (and `~/.local/bin/dex` if that directory exists).

Pin a specific version or custom directory:

```bash
DEX_VERSION=v0.3.0 curl -fsSL https://raw.githubusercontent.com/patrickaigbogun/dex/master/install.sh | bash
DEX_HOME=/opt/dex curl -fsSL https://raw.githubusercontent.com/patrickaigbogun/dex/master/install.sh | sudo bash
```

## Quick Start

```bash
# Scaffold a new Dex app
dex scaffold my-app

# Enter the project directory
cd my-app

# Start the development server (runs core/bootstrap/dev.ts)
dex start
```

Build and run the **Standalone Bun server executable (`build/server`)**:

```bash
dex build
dex start -p
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `dex scaffold <dir>` | Scaffold a new Dex project from release templates and packages |
| `dex sync [--interactive]` | Sync upstream template updates into `.dex`-tracked project |
| `dex template <list\|cache\|diff>` | List official/cached templates, manage cache, or inspect template diffs |
| `dex pie generate [spec]` | Generate typed `@dex/pie` route tree from a JSON or YAML OpenAPI spec |
| `dex update [version] [--force]` | Install or update to the latest (or specified) CLI release |
| `dex versions` / `dex list` | List locally installed CLI versions under `~/.dex/versions/` |
| `dex use <version>` | Switch active CLI version symlink |
| `dex build` | Run production build (`core/bootstrap/build.ts`) into `build/` |
| `dex start [-p]` | Run dev server (`dex start`) or compiled production server (`dex start -p`) |
| `dex tag <patch\|minor\|major>` | Bump and push SemVer git release tags |
| `dex -v` / `dex --version [-f]` | Show CLI version (or template version with `-f`) |

## Repo Layout

- `cli/` — Native Go CLI (`cmd/dex`, `internal/{core,pie,runner,scaffold,version}`)
- `framework/packages/` — Composable framework packages (`router`, `server`, `dev`, `pie`, `cli`)
- `templates/starter/` — Starter SPA template (`core/bootstrap/*`, `core/runtime/*`, `lib/api.ts`, `routes/api/`, `web/`)
- `learn/dex-framework-docs/` — Fumadocs documentation web app
- `scripts/` — Release tooling (including `generate-template-diff.ts`)

## Development & Testing

Run the framework TypeScript tests and typechecks:

```bash
cd framework
bun install
bun test
bun run typecheck
```

Run the Go CLI tests and vet checks:

```bash
cd cli
go vet ./...
go test ./...
```

## Release Assets

- `dex-linux-x64`
- `dex-linux-arm64`
- `dex-darwin-x64`
- `dex-darwin-arm64`
- `dex-windows-x64.exe`
- `dex-template-spa.tgz`
- `dex-diff-<tag>.json`
- `dex-package-router.tgz`
- `dex-package-server.tgz`
- `dex-package-dev.tgz`
- `dex-package-pie.tgz`
- `SHA256SUMS`
