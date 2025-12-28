# Copilot instructions (fable)

## Big picture
- Bun + Elysia server in `app.ts`.
- API routes are mounted under `routes/api.ts` (currently `/api/v1/*`).
- Frontend is a small SPA served by the Elysia server:
  - HTML entry: `web/public/index.html`
  - JS bundle output: `web/public/assets/client.js`
  - CSS output: `web/public/assets/styles.css`
- File-based routing:
  - Source pages: `web/pages/**/*.tsx`
  - Generated route table: `core/router/.generated/routes.ts` (auto-generated; do not edit)
  - Client router runtime: `core/router/client/router.tsx`

## Dev / build workflows (use these)
- Dev (multi-watch): `bun run dev` (spawns route generation watch, Tailwind watch, client bundle watch, and server watch via `scripts/dev.ts`).
- One-off route generation: `bun run generate` (runs `core/router/generate.ts`).
- Production build: `bun run build` (generates routes + builds CSS + builds client bundle).
- Start server (prod): `bun run start` (sets `NODE_ENV=production` and runs `app.ts`).
- Server listens on port `7990` (see `app.ts`).

## Routing conventions
- Route paths come from filenames in `web/pages` (see `core/router/generate.ts`):
  - `web/pages/index.tsx` => `/`
  - `web/pages/foo/index.tsx` => `/foo`
  - Dynamic segments: `[id].tsx` => `/:id`
  - Catch-all: `[...slug].tsx` => `/*slug`
  - Any file/folder starting with `_` is ignored by the generator.
- Page modules should export a default React component and may export `metadata`:
  - Example: `export const metadata = { title: 'Profile' }` in `web/pages/profile/index.tsx`.

## Server-side SPA behavior
- The server serves the SPA HTML for “app routes” (see `routes/client.ts`):
  - Skips `/api/*`, `/assets/*`, `/__dev/*`, and any path containing a `.`.
- Assets are served from `web/public/assets` via `GET /assets/*` in `app.ts`.
  - `cache-control` is `no-store` in dev and long-lived immutable in prod.
- Dev live reload uses SSE at `/__dev/reload` (implemented in `routes/client.ts`, wired in `web/public/index.html`).

## TypeScript + imports
- TS is `strict` and uses path aliases (see `tsconfig.json`):
  - `@web/*` -> `web/*`
  - `@components/*` -> `web/components/*`

## Generated/artifact files
- Don’t commit built assets or generated route output:
  - `web/public/assets/` and `core/router/.generated/` are gitignored.
