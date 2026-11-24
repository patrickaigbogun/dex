---
title: "Dev Vs Prod"
---

# Development vs Production

Dex behaves differently in development and production modes. This guide explains the differences between `dex start` and `dex start -p`.

## Development Mode

Run with the native Go CLI:

```bash
dex start
```

This invokes `core/bootstrap/dev.ts`, which spawns the parallel dev watchers and runs `core/runtime/app/index.ts`.

**Characteristics:**

- Watches `web/pages/` and `web/layouts/` and regenerates `core/router/.generated/`
- Compiles Tailwind CSS and ESM client bundles in watch mode to `web/public/assets/`
- Live-reloads connected browsers via SSE (`/__dev/reload`)
- Disables asset caching (`Cache-Control: no-store`)
- Pretty colored request logging (ignoring `/__dev/reload` noise)

**Environment:**

- `NODE_ENV=development` (unset or development)
- `PORT=7990` (or `port` from `dex.config.ts`; automatically falls back via `findAvailablePort` if busy)

## Production Mode

Build once and run the **Standalone Bun server executable (`build/server`)**:

```bash
dex build
dex start -p
```

Or run the binary directly without the CLI:

```bash
NODE_ENV=production PORT=7990 ./build/server
```

**Characteristics:**

- Serves ESM code-split bundles (`client.js`, `chunks/[name]-[hash].js`) and minified `styles.css` from `build/assets/`
- Sets immutable cache headers (`public, max-age=31536000, immutable`) on `/assets/*` alongside `?v=<hash>` cache-busted HTML references
- Serves prerendered static HTML from `build/__ssg/` before falling back to `build/index.html`
- Disables `/__dev/reload` (returns `404`)
- Plain-text request logs (colors disabled when `NODE_ENV=production` or `NO_COLOR` is set)

**Environment:**

- `NODE_ENV=production`
- `PORT` from environment or `dex.config.ts` (default: `7990`)

## Key Differences

| Feature | Development (`dex start`) | Production (`dex start -p`) |
|---------|---------------------------|-----------------------------|
| Live Reload (`/__dev/reload`) | Enabled (SSE) | Disabled (`404`) |
| Asset Cache-Control | `no-store` | `public, max-age=31536000, immutable` |
| Client Bundle | Unminified ESM watch build | Minified ESM + content-hashed chunks + `?v=<hash>` |
| SSG Prerendering | Client-rendered on demand | Serves `build/__ssg/` HTML when prerendered |
| Logging | Colored TTY output | Plain timestamped output |
| Server Process | `bun --watch core/runtime/app/index.ts` | Standalone Bun server executable (`./build/server`) |

## API-Only Mode

Run the compiled production server without serving frontend assets or SPA HTML:

```bash
NODE_ENV=production DEX_API_ONLY=1 ./build/server
```

Useful for:

- API gateway setups
- Separate CDN/static frontend deployments
- Backend-only microservices

## Environment Variables

| Variable | Development | Production |
|----------|-------------|------------|
| `PORT` | `7990` (or `dex.config.ts`) | `7990` (or `dex.config.ts`) |
| `NODE_ENV` | `development` | `production` |
| `DEX_API_ONLY` | N/A | `1` or `true` for API-only mode |
| `NO_COLOR` | Disable colored logs | Always plain in prod |
| `DEX_DEV_RAW` | `1` to bypass `[task]` line prefixing | N/A |
| `PUBLIC_*` / `NEXT_PUBLIC_*` / `VITE_*` | Injected at client build time | Injected at client build time |

## Best Practices

1. **Develop locally with `dex start`** — watches routes, CSS, client bundles, and server together
2. **Test production builds locally** — run `dex build && dex start -p` before deploying
3. **Use `DEX_API_ONLY=1`** — when deploying API routes independently from static assets
4. **Never commit `build/` or `core/router/.generated/`** — generate them in CI/CD or during release builds

## See Also

- [Build Process](./build-process) — How builds and SSG prerendering work
- [Production Server](../server/production) — Production server details
- [Watch Process](../dev/watch-process) — Dev supervisor internals
