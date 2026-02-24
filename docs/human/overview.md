# Overview

Dex is a Bun-first set of small composable **packages** that you assemble into an app.

The key idea is that the “framework” is not a monolith — it’s a set of packages you can compose.

- `@dex/router` generates routes from your filesystem and provides a lightweight React client router runtime.
- `@dex/server` provides Elysia helpers for static assets, SPA fallback, dev reload, and pretty request logging.
- `@dex/dev` runs multiple watch/build processes together (with prefixed stdout).
- `dex` (CLI) scaffolds projects and delegates to your project’s scripts.

Dex is intentionally explicit: generated files are readable, servers are “just Elysia”, and most behavior is opt-in.

## Distribution (GitHub-only)

Dex is distributed via GitHub Releases:

- The `dex` CLI is a single compiled binary installed from a release.
- Templates are `.tgz` assets that `dex scaffold` downloads and extracts.

## What you build

Typical Dex app:

- An Elysia server that mounts APIs and serves assets + `index.html` fallback.
- A React SPA that boots the client router runtime in the browser.
- A generator step that turns `web/pages` + `web/layouts` into lazy import tables.

## Deploying (starter template)

The starter template is set up so a production build outputs **one deployable folder**: `templates/starter/build/`.

Build:

```bash
cd templates/starter
bun run build
```

Deploy this folder:

- `build/server` (compiled Bun binary)
- `build/index.html`
- `build/assets/*` (eg `client.js`, `styles.css`)

Run (production):

```bash
cd templates/starter/build
PORT=7990 ./server
```

API-only deploys:

```bash
cd templates/starter/build
DEX_API_ONLY=1 PORT=7990 ./server
```

Notes:

- `dexSpaFallback()` intentionally skips `/api/*`, so APIs must be mounted explicitly.
- The production server entry is `templates/starter/core/runtime/server/prod.ts` and is compiled via `bun build --compile`.
