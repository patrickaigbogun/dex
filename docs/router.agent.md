# FS Router (Agent Reference)

This document is optimized for code agents.

## Purpose

- Generate a route table from `web/pages/**/*.tsx`.
- Load matching React pages via dynamic import.
- Provide SPA navigation + params/query + optional layouts.

## Source of truth (Dex repo)

- Generator: `packages/router/src/generate.ts`
- Types: `packages/router/src/types.ts`
- Client router runtime: `packages/router/src/client/router.tsx`
- Starter template usage:
  - Pages: `templates/starter/web/pages/**/*.tsx`
  - Layouts: `templates/starter/web/layouts/**/*.tsx`
  - Generated: `templates/starter/dex/.generated/*`
  - Entry: `templates/starter/client/entry.tsx`

## Generator invariants

- Only `.tsx` files under `pagesDir` are considered.
- Any path segment starting with `_` is ignored.
- `index.tsx` maps to its folder path:
  - `index.tsx` => `/`
  - `foo/index.tsx` => `/foo`
- Segments:
  - `[id]` => `{ kind: 'param', name: 'id' }`
  - `[...slug]` => `{ kind: 'catchAll', name: 'slug' }`

## Client runtime invariants

- Uses the History API (`pushState` + `popstate`).
- Route match is exact: all segments must be consumed.
- Exposes:
  - `Link`, `useNavigate`, `useLocation`, `useParams`, `useQuery`
- Optional layouts:
  - if a page exports `layout`, `FileRouter` will resolve it from the `layouts` prop and wrap the page.
