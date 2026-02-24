# Architecture Deep Dive

Dex is an implementation of “small framework pieces + strong conventions + generated runtime metadata.”

## Top-level architecture

Dex has four primary execution layers:

1. **Build/generation layer**
   - Route + layout generation from the filesystem.
2. **Server layer**
   - Elysia app composition with Dex server helpers.
3. **Client runtime layer**
   - Router runtime that matches generated route segments and lazy-loads modules.
4. **Tooling layer**
   - CLI, dev process supervisor, and scaffold/sync workflows.

## Control-plane vs data-plane

A useful engineering split:

- **Control-plane**: CLI, generation commands, release tags, template metadata.
- **Data-plane**: HTTP request handling, static assets, API routes, client-side route rendering.

Dex keeps control-plane logic explicit and local to scripts/CLI rather than deeply implicit in runtime.

## Starter template flow (real implementation)

From `templates/starter/scripts/dev.ts`:

1. Run one-off route generation via `dex-router generate`.
2. Start parallel watch tasks:
   - `dex-router watch`
   - Tailwind watch
   - client bundle watch
   - server watch
3. Browser receives:
   - HTML from `web/public/index.html`
   - client runtime bundle from `/assets/client.js`
4. Server-side SSE endpoint (`/__dev/reload`) triggers browser reload in dev.

## Production architecture

From `templates/starter/core/runtime/server/prod.ts`:

- Production app composes API routes first.
- If assets exist, mount assets route plugin.
- If index exists, mount SPA fallback plugin.
- Optional API-only mode via `DEX_API_ONLY`.

This keeps production behavior deterministic and deploy-shape aware.

## Why generated route metadata matters

Dex does not discover routes dynamically at runtime.
Instead, generation creates static route records with segment metadata and dynamic import functions.

This gives:

- predictable routing behavior,
- easy diffability in generated artifacts,
- less runtime route introspection complexity.

## Internal package boundaries

- `@dex/router`: route/layout generation + client runtime + route composition helper.
- `@dex/server`: Elysia route/plugins for assets, fallback, reload SSE, logging.
- `@dex/dev`: process group supervisor with line-prefix logging.
- `@dex/cli`: scaffold/sync/build/start/tag workflows.

## Architecture constraints to preserve

When extending Dex, preserve these invariants:

1. Generated artifacts are outputs, never primary source.
2. Server helpers remain composable and explicit.
3. Client router stays decoupled from backend framework internals.
4. CLI remains scriptable with stable command semantics.
