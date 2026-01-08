# Dex

Dex is a composable, Bun-first framework stack for building small full‑stack apps:
- `@dex/router`: file-based React router + generator
- `@dex/server`: Elysia helpers (assets, SPA fallback, dev reload)
- `@dex/dev`: tiny dev process supervisor

Dex is made of composable **packages** (that’s the framework), but distribution is **GitHub-only**:

- A single `dex` CLI binary (compiled with Bun) installed from GitHub Releases.
- Templates shipped as `.tgz` release assets that `dex scaffold` downloads and extracts.

## Repo layout

- `packages/` — composable packages (framework building blocks)
- `templates/starter/` — minimal app template using the packages

## Try the starter

```bash
bun install
cd templates/starter
bun run dev
```

## Install `dex` (GitHub Releases)

```bash
curl -fsSL https://raw.githubusercontent.com/patrickaigbogun/dex/master/install.sh | bash
```

See `dist.README.md` for details.
