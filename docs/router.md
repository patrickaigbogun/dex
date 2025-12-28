# File-system Router (React)

Dex provides a small, custom **file-system (FS) based router** for React.

It has two parts:
- a **generator** (`@dex/router`) that scans `web/pages/**/*.tsx` and produces a route table
- a **client runtime** (`@dex/router/client`) that matches the current URL and renders the page

In this repo, the example app is in `templates/starter/`.

## How it works (high level)

1. You create pages as `.tsx` files under `templates/starter/web/pages`.
2. The generator writes:
   - `templates/starter/dex/.generated/routes.ts`
   - `templates/starter/dex/.generated/manifest.json`
   - `templates/starter/dex/.generated/layouts.ts`
3. The client entry (`templates/starter/client/entry.tsx`) imports `routes` + `layouts` and renders:
   - `<FileRouter routes={routes} layouts={layouts} />`
4. The server (`@dex/server`) serves `web/public/index.html` for app routes so the client router takes over.

## Routing rules

- `web/pages/index.tsx` => `/`
- `web/pages/foo/index.tsx` => `/foo`
- Dynamic segments:
  - `web/pages/users/[id].tsx` => `/users/:id`
- Catch-all:
  - `web/pages/docs/[...slug].tsx` => `/docs/*slug`
- Any file/folder starting with `_` is ignored.

## Layouts

Pages may export `layout`:
- `export const layout = 'global'`

The generator scans `web/layouts/**/*.tsx` and emits a loader map (`dex/.generated/layouts.ts`).

## Where to look

- Generator + watch: `packages/router/src/generate.ts`
- Router runtime: `packages/router/src/client/router.tsx`
- Starter template integration: `templates/starter/client/entry.tsx`
