# Starter template (`templates/starter`)

The starter template is the reference integration of the core packages.

## Dev workflow

From `templates/starter/`:

```bash
bun run dev
```

This runs multiple watchers (router generation, CSS, client bundle, server watch) via `@dex/dev`.

## Production workflow

Build (outputs a deployable `build/` folder):

```bash
bun run build
```

Start:

```bash
cd build
PORT=7990 ./server
```

API-only:

```bash
cd build
DEX_API_ONLY=1 PORT=7990 ./server
```

## API routes

API routes are defined under:

- `templates/starter/routes/api/`

The canonical entrypoint is:

- `templates/starter/routes/api/index.ts`

Nested routes are allowed: you can place modules anywhere under `routes/api/**`, as long as they export a top-level function that receives an Elysia instance.

Example module:

```ts
import type { Elysia } from 'elysia'

export default function health(api: Elysia) {
  api.get('/health', () => ({ ok: true }))
}
```

This module is mounted under `/api` by the entrypoint, so the route becomes `GET /api/health`.

## Logging

- Request logs: enabled via `dexPrettyLogger()` (dev: colored when TTY; prod: plain).
- Dev supervisor logs: each watcher’s output is prefixed with the task name.
