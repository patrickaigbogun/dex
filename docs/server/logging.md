# Logging

Request logging and dev process output.

## Pretty Logger (Development)

Use `dexPrettyLogger()` for readable logs:

```ts
import { dexPrettyLogger } from '@dex/server'

app.use(dexPrettyLogger())
```

Output in development:
```
🔵 GET    /                  200  12ms
🟢 GET    /about             200   8ms
🟡 GET    /api/health        200   5ms
🔴 POST   /api/submit        500  42ms
```

## Plain Logger (Production)

In production, logs are plain text:

```
GET / 200 12ms
GET /about 200 8ms
GET /api/health 200 5ms
POST /api/submit 500 42ms
```

## Dev Process Logs

Each watcher in dev mode outputs prefixed logs:

```
[router] ✅ Routes generated (42 routes)
[styles] 🎨 Styles compiled
[client] 📦 Client bundled (234KB)
[server] 🚀 Dev server ready
```

## Custom Logging

Log requests in your routes:

```ts
app.get('/debug', ({ log }) => {
  log.info('Debug route accessed')
  return { ok: true }
})
```

## See Also

- [Server Guide](./index) — Server overview
- [Production Server](./production) — Production setup