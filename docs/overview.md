# Overview

Dex is a Bun-first set of small packages that you compose into your app:

- `@dex/router` generates a route table from your filesystem and provides a lightweight React client router.
- `@dex/server` provides Elysia helpers to serve built assets, an SPA HTML fallback, and dev live reload.
- `@dex/dev` runs a group of watch/build processes and shuts everything down if one fails.
- `dex` (CLI) scaffolds projects and delegates to your app’s scripts.

Dex is intentionally small and explicit: the “framework” is mostly conventions + generated route metadata + a few server helpers.

## What you build

You typically build:

- A backend HTTP server (Elysia) that serves static assets and an HTML entry.
- A frontend React app that boots a router runtime in the browser.
- A small generator step that turns `web/pages` and `web/layouts` into lazy import tables.

## Key conventions

These are defaults of the router generator (configurable by CLI flags):

- Pages directory: `./web/pages`
# Overview (moved)

This content moved to:

- `docs/human/overview.md`
- `index.tsx` maps to `/`
