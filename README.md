# Dex

Dex is a composable, Bun-first framework stack for building small full‑stack apps:
- `@dex/router`: file-based React router + generator
- `@dex/server`: Elysia helpers (assets, SPA fallback, dev reload)
- `@dex/dev`: tiny dev process supervisor

## Repo layout

- `packages/` — published packages
- `templates/starter/` — minimal app template using the packages

## Try the starter

```bash
bun install
cd templates/starter
bun run dev
```

## Versioning & releases

Dex uses Changesets.

```bash
bun run changeset
bun run version
bun run release
```

See `ROADMAP.md` for planned work.
