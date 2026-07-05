---
title: "Spa Fallback"
---

# SPA Fallback

SPA fallback ensures client-side routes work in production by serving `index.html` for non-API, non-static routes.

## How It Works

When a request doesn't match:
- `/api/*` (API routes)
- `/assets/*` (static files)
- Any path containing `.` (static file extension)

The server serves `index.html`, letting the client router handle the route.

## Example

| Request | Response |
|---------|----------|
| `GET /` | `index.html` |
| `GET /about` | `index.html` |
| `GET /users/123` | `index.html` |
| `GET /api/health` | API response |
| `GET /assets/client.js` | Static file |
| `GET /favicon.png` | 404 (not found) |

## Configuration

```ts
import { dexSpaFallback } from '@dex/server'

app.use(dexSpaFallback({
  // Default: skip /api/*, /assets/*, paths with .
  skip: ['/api', '/assets']
}))
```

## Client Router

The client router (`@dex/router/client`) handles these routes:

```tsx
import { BrowserRouter } from '@dex/router/client'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/:slug" element={<Page />} />
      </Routes>
    </BrowserRouter>
  )
}
```

## See Also

- [Client Navigation](./client-navigation) — Router hooks
- [Production](./production) — Deployment setup