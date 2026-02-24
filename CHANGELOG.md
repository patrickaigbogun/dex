# Dex changelog

All notable changes to Dex packages will be documented here.

> Dex uses Changesets. Create a changeset via `bun run changeset`.

## Unreleased

- Starter template: move dev/prod server entrypoints to `core/runtime/` and rewire dev/build scripts.
- `@dex/router`: harden `Link` against unsafe schemes, external navigation, and `_blank` tabnabbing.
