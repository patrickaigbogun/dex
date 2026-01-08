# Concepts

## Philosophy: everything is a package

Dex is built around a simple idea:

- The “framework” is a **set of packages**.
- You compose those packages into the exact development environment you want.
- Each package should stand on its own, with a small and explicit API.

Dex is currently in 0.x and not fully composable yet, but the direction is:

- fewer hidden conventions
- fewer magical runtime layers
- more small packages you can swap or skip

## Two phases: build-time vs runtime

Dex has two distinct phases:

- **Build-time** (generator/bundler): file scanning, codegen, compiling.
- **Runtime** (server + browser): request handling, routing, navigation.

The packages align to those phases:

- `@dex/router` is both build-time (generator) and runtime (client router).
- `@dex/server` is runtime (Elysia plugins).
- `@dex/dev` is build-time/dev tooling (process supervisor).
- `dex` (CLI) is developer experience glue (scaffold + run scripts).

## Conventions (starter defaults)

- Pages: `templates/starter/web/pages/**/*.tsx`
- Layouts: `templates/starter/web/layouts/**/*.{ts,tsx}` (excluding `.d.ts`)
- Generated router outputs (auto-generated):
  - `templates/starter/core/router/.generated/routes.ts`
  - `templates/starter/core/router/.generated/layouts.ts`
  - `templates/starter/core/router/.generated/manifest.json`

Anything under a path segment starting with `_` is ignored by the router generator.
