# Server Internals

This section explains `@dex/server` internals and composition behavior.

## Exported helpers

From `framework/packages/server/src/index.ts`:

- `dexAssetsRoute`
- `dexDevReloadRouter`
- `dexSpaFallback`
- `dexPrettyLogger`

Each helper is small and composable by design.

## `dexAssetsRoute`

Mounts `GET /assets/*` and serves files from configured directory.

### Important implementation details

- Normalizes path using `path.posix.normalize`.
- Rejects traversal-like paths.
- Sets `cache-control` based on environment:
  - prod default: long immutable cache
  - dev default: no-store

### Code example

```ts
app.use(dexAssetsRoute({ assetsDir: 'web/public/assets' }))
```

## `dexDevReloadRouter`

Provides SSE endpoint at `/__dev/reload`.

### Internal behavior

- Disabled in production (returns 404).
- Tracks connected SSE clients.
- Broadcasts `reload` event on watched file changes.
- Uses a debounce guard (`lastReloadAt`) to avoid event storms.
- Combines FS watch + watchFile + polling fallback.

### Why this design

Cross-platform FS event behavior is inconsistent.
Combining mechanisms improves reliability in dev.

## `dexSpaFallback`

Handles unmatched app routes by serving index HTML.

### Skip rules

Fallback is skipped for:

- `/api/*`
- `/assets/*`
- `/__dev/*`
- paths containing `.`
- non-GET methods
- requests that do not accept HTML (except permissive `*/*`)

### Code example

```ts
app.use(dexSpaFallback({ indexHtmlPath: 'web/public/index.html' }))
```

## `dexPrettyLogger`

Attaches Elysia lifecycle hooks:

- `onRequest`: captures start time.
- `onAfterResponse`: prints method/path/status/duration.
- `onError`: logs status + error details.

### Logging details

- Colors enabled in dev TTY.
- Color disabled in production or with `NO_COLOR`.
- Optional ignore function to suppress noisy paths.

## Real composition (starter dev)

```ts
new Elysia()
  .use(dexPrettyLogger({ ignore: (p) => p === '/__dev/reload' }))
  .group('/api', (api) => api.use(apiRoutes()))
  .use(dexAssetsRoute({ assetsDir: 'web/public/assets' }))
  .use(dexDevReloadRouter())
  .use(dexSpaFallback({ indexHtmlPath: 'web/public/index.html' }))
```

Order matters.
Mount API and assets before fallback to avoid accidental HTML responses for API/static paths.

## Failure modes to watch

- Wrong plugin order causing fallback overreach.
- Missing assets/index path in production build.
- Over-broad reload watching causing noisy refresh loops.

## Safe extension strategy

When adding server helpers:

1. keep each helper single-purpose,
2. preserve explicit mount order semantics,
3. document path matching behavior with examples,
4. add real request-shape tests for edge cases.
