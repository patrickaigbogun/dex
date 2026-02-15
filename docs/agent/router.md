# `@dex/router` (Agent)

## Source of truth

- Generator: `packages/router/src/generate.ts`
- Types: `packages/router/src/types.ts`
- Client runtime: `packages/router/src/client/router.tsx`
- Route helper: `packages/router/src/composeRoutes.ts`

## Starter integration

- Pages: `templates/starter/web/pages/**/*.tsx`
- Layouts: `templates/starter/web/layouts/**/*.{ts,tsx}` (excluding `.d.ts`)
- Generated outputs (do not edit):
  - `templates/starter/core/router/.generated/routes.ts`
  - `templates/starter/core/router/.generated/layouts.ts`
  - `templates/starter/core/router/.generated/manifest.json`

## Invariants

- Pages are `.tsx` only.
- Layout modules may be `.ts` or `.tsx` (excluding `.d.ts`).
- Any file/folder starting with `_` is ignored.
- `index.tsx` maps to its folder path (`/` or `/foo`).
- `[id]` is a param segment; `[...slug]` is a catch-all.

## Commands (starter)

```bash
cd templates/starter
bunx dex-router generate --pagesDir web/pages --layoutsDir web/layouts --outRoutesTs core/router/.generated/routes.ts --outRoutesJson core/router/.generated/manifest.json --outLayoutsTs core/router/.generated/layouts.ts
```

```bash
cd templates/starter
bunx dex-router watch --pagesDir web/pages --layoutsDir web/layouts --outRoutesTs core/router/.generated/routes.ts --outRoutesJson core/router/.generated/manifest.json --outLayoutsTs core/router/.generated/layouts.ts
```
