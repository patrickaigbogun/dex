---
title: "Logging"
---

# Logging

Request logging and dev process output in Dex.

## Pretty Logger

Dex provides `dexPrettyLogger()` as an Elysia plugin to format incoming HTTP requests and errors.

```ts
import { dexPrettyLogger } from '@dex/server'

app.use(dexPrettyLogger({
  ignore: (pathname) => pathname.startsWith('/__dev'),
  includeQuery: false
}))
```

### Log Format

Requests are logged upon response completion using the following structure:

```
[timestamp] LEVEL METHOD /path status durationMs
```

Example request output:
```
[2026-09-21T12:00:00.000Z] INFO GET / 200 12.3ms
[2026-09-21T12:00:00.120Z] INFO GET /about 200 8.1ms
[2026-09-21T12:00:00.450Z] INFO GET /api/users 304 4.0ms
```

When an unhandled error occurs, `dexPrettyLogger` logs the error prefix and status code, followed by the error stack trace:

```
[2026-09-21T12:00:01.000Z] ERROR POST /api/submit 500
Error: Database connection failed
    at ...
```

### Colors and Formatting

- **Development (TTY):** Timestamp is dimmed, levels (`INFO` in cyan, `ERROR` in red) and status codes (2xx/3xx green, 4xx yellow, 5xx red) are colorized with ANSI escape codes.
- **Production / Non-TTY:** ANSI colors are disabled automatically when `NODE_ENV=production`, when running non-interactively, or when `NO_COLOR` is set.

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `ignore` | `(pathname: string) => boolean` | `undefined` | Predicate to bypass logging for specific routes (e.g. health checks or dev reload SSE). |
| `includeQuery` | `boolean` | `false` | When `true`, appends `?query` search parameters to the logged pathname. |

## Dev Process Logs

During development, the Dex CLI watcher outputs status messages prefixed by component:

```
[router] ✅ Routes generated (42 routes)
[styles] 🎨 Styles compiled
[client] 📦 Client bundled (234KB)
[server] 🚀 Dev server ready
```

## See Also

- [Server Exports](../reference/server-exports) — Server helpers API
- [Production Server](./production) — Production setup