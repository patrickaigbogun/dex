# Dex changelog

All notable changes to Dex packages will be documented here.

> Dex uses Changesets. Create a changeset via `bun run changeset`.

## Unreleased

- Starter template: move dev/prod server entrypoints to `core/runtime/` and rewire dev/build scripts.
- Starter template: add SSG build prerendering (`build/__ssg`) and hydrate when markup exists.
- `@dex/server`: allow `dexSpaFallback({ ssgDir })` to serve per-route SSG HTML.
- `@dex/router`: add `RenderStrategy` typing for `export const render`, add `ClientOnly`/`clientOnly()` islands helpers, harden `Link` (unsafe schemes/external URLs/tabnabbing) and allow `Link` without router context (SSG/SSR-safe).
