# `dex` CLI (Agent)

Dex distribution is GitHub-only:

- Users install a single compiled `dex` binary from GitHub Releases.
- `dex scaffold` downloads template `.tgz` assets from GitHub Releases.

## Source

- `framework/packages/cli/src/cli.ts`

## Commands

- `dex scaffold <dir>`
- `dex build`
- `dex start` (default dev)
- `dex start -p` (production, sets `NODE_ENV=production`)

## Project discovery

- Finds `dex.config.*` (or `config/dex.config.*`) or `package.json` with a `dex` field.
