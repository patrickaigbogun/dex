# `dex` CLI (Agent)

## Source

- `packages/cli/src/cli.ts`

## Commands

- `dex scaffold <dir>`
- `dex build`
- `dex start` (default dev)
- `dex start -p` (production, sets `NODE_ENV=production`)

## Project discovery

- Finds `dex.config.*` (or `config/dex.config.*`) or `package.json` with a `dex` field.
