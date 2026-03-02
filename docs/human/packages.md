# Packages

This repo is a monorepo of small packages. The framework is the *composition* of these packages.

## `@dex/router`

**Purpose**

- Build-time: scan `web/pages/**/*.tsx` and generate a route table.
- Build-time: scan `web/layouts/**/*.{ts,tsx}` (excluding `.d.ts`) and generate a layout loader map.
- Runtime: provide a React router (`FileRouter`, `Link`, hooks) that loads pages/layouts via dynamic import.

**How it’s used (starter)**

- Pages live in `templates/starter/web/pages/`
- Layouts live in `templates/starter/web/layouts/`
- Generator writes to `templates/starter/core/router/.generated/`

Generate once:

```bash
cd templates/starter
bun run generate
```

Watch in dev:

```bash
cd templates/starter
bun run dev
```

**Routing rules (high level)**

- `index.tsx` → `/`
- `foo/index.tsx` → `/foo`
- `[id].tsx` → `/:id`
- `[...slug].tsx` → `/*slug`
- ignore any file/folder starting with `_`

**Layout rule change we implemented**

- Pages remain `.tsx` only.
- Layout modules can be `.ts` or `.tsx` (excluding `.d.ts`).

**Route composition helper**

`@dex/router` exports `composeRoutes` to make API route registration a simple list:

```ts
import { composeRoutes } from '@dex/router'
import health from './health'
import users from './users'

export function apiRoutes() {
	return <const App extends Elysia>(app: App) => {
		return composeRoutes(app, [health, users])
	}
}
```

## `@dex/server`

**Purpose**

Small Elysia plugins you compose into your own server.

**Helpers**

- `dexAssetsRoute({ assetsDir })`: serves `GET /assets/*` from a directory.
- `dexSpaFallback({ indexHtmlPath })`: serves your HTML entry for SPA routes (skips `/api/*`, `/assets/*`, `/__dev/*`, and paths containing `.`).
- `dexDevReloadRouter()`: dev-only SSE endpoint at `GET /__dev/reload`.
- `dexPrettyLogger()`: pretty request logs to stdout (colored in dev TTY, plain in production).

**Example (starter dev server)**

See `templates/starter/core/runtime/app/index.ts`.

**Example (starter production server)**

See `templates/starter/core/runtime/server/prod.ts`.

## `@dex/dev`

**Purpose**

A tiny process supervisor for dev.

**API**

- `spawnGroup([{ name, cmd }])`: spawns processes; if one exits non-zero, terminates the group.

**Latest change**

- Output is now line-prefixed with the task name (colorized when TTY) so multi-watch logs are readable.
- Set `DEX_DEV_RAW=1` to disable prefixing and inherit raw stdio.

See `templates/starter/scripts/dev.ts`.

## `@dex/pie`

**Purpose**

A typed API client built on Eden `treaty`, with a retrying transport and simple header merging.

**How it’s used**

```ts
import pie from '@dex/pie'
import type { Api } from '@core/api'

const client = pie<Api>('http://localhost:7990/api', {
	retry: { retries: 2 },
	pieHeaders: () => ({
		// Authorization: `Bearer ${token}`,
	}),
})

await client.health.get()
```

## `dex` (CLI)

**Purpose**

- `dex scaffold <dir>`: download/extract a template from GitHub Releases.
- `dex build`: find project root and run `bun run build`.
- `dex start`: run dev by default; `-p` runs production start.

See `framework/packages/cli/src/cli.ts`.

## Templates (`templates/starter`)

This repo includes a starter template that demonstrates the packages working together.

Key points we implemented:

- Production build outputs to a single folder: `templates/starter/build/`.
- Server is compiled to a binary: `build/server` via `bun build --compile`.
- API-only deploy mode: `DEX_API_ONLY=1`.
- API routes are mounted from `templates/starter/routes/api/index.ts`.
- Pretty request logs are enabled in dev and prod.
