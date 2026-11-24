---
title: "Logging"
---

# Logging

Request logging and dev process output in Dex.

## Pretty Logger

`@dex/server` provides `dexPrettyLogger()` as an Elysia plugin to format incoming HTTP requests and unhandled errors.

```ts
import { dexPrettyLogger } from '@dex/server'

app.use(
  dexPrettyLogger({
    ignore: (pathname) => pathname === '/__dev/reload',
    includeQuery: false,
  })
)
```

### Log Format

Requests are measured with `performance.now()` (tracked per request in a `WeakMap`) and logged upon response completion:

```
[timestamp] METHOD /path status durationMs
```

When TTY colors are active in development, the level (`INFO` / `ERROR`) is included with ANSI color codes:

```
[2026-11-24T12:00:00.000Z] INFO GET / 200 12.3ms
[2026-11-24T12:00:00.120Z] INFO GET /about 200 8.1ms
[2026-11-24T12:00:00.450Z] INFO GET /api/users 304 4.0ms
```

When an unhandled error occurs, `dexPrettyLogger` logs the error status and prints the error object/stack trace to `stderr`:

```
[2026-11-24T12:00:01.000Z] ERROR POST /api/submit 500
Error: Database connection failed
    at ...
```

### Colors and Formatting

- **Development (TTY):** Timestamp is dimmed, levels (`INFO` in cyan, `ERROR` in red) and status codes (2xx/3xx green, 4xx yellow, 5xx red) are colorized.
- **Production / Non-TTY:** ANSI colors are disabled automatically when `NODE_ENV === 'production'`, `NO_COLOR` is set, or `process.stdout.isTTY` is falsy.

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `ignore` | `(pathname: string) => boolean` | `undefined` | Predicate to skip both response and error logging for matching routes (e.g. `/__dev/reload`). |
| `includeQuery` | `boolean` | `false` | When `true`, appends `?query` search parameters to the logged pathname. |

## Dev Process Logs

During development, `spawnGroup` in `@dex/dev` prefixes output from each concurrent watcher (`[routes:watch]`, `[styles:watch]`, `[client:watch]`, `[server:dev]`). Set `DEX_DEV_RAW=1` to bypass line prefixing and inherit raw stdio directly.

## See Also

- [Server Exports](../reference/server-exports) — Server helpers API
- [Production Server](./production) — Production setup
