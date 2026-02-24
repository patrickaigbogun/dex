# `@dex/server` (Agent)

## Exports

- `dexAssetsRoute({ assetsDir, cacheControlProd?, cacheControlDev? })`
- `dexSpaFallback({ indexHtmlPath })`
- `dexDevReloadRouter({ watchFiles?, pollIntervalMs? })`
- `dexPrettyLogger({ ignore?, includeQuery? })`

## Key behavior

- `dexSpaFallback` skips `/api/*`, `/assets/*`, `/__dev/*`, and paths containing `.`.
- `dexPrettyLogger` is a function-plugin (attaches hooks to parent app) and logs on `onAfterResponse`.

## Starter prod server

- Entry: `templates/starter/core/runtime/server/prod.ts`
- Build: `bun build --compile core/runtime/server/prod.ts --outfile build/server`
- API-only: `DEX_API_ONLY=1`
