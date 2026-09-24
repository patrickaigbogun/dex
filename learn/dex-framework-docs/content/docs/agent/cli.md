---
title: "Cli"
---

# `dex` CLI (Agent)

Dex distribution is GitHub-only:

- Users install a single compiled `dex` binary from GitHub Releases.
- `dex scaffold` downloads template `.tgz` assets and framework package `.tgz` assets from GitHub Releases.

## Source

- `framework/packages/cli/src/cli.ts`

## Commands

- `dex scaffold <dir>` (options: `--repo`, `--tag`, `--packages-repo`, `--packages-tag`, `--template`, `--template-url`, `--no-install`)
- `dex sync [--interactive]` (options: `--repo`, `--tag`)
- `dex update [version] [--force]` (downloads target version to `~/.dex/versions/<version>/dex` and updates `~/.dex/current` and `~/.dex/bin/dex` shims)
- `dex versions` / `dex list` (lists installed versions in `~/.dex/versions/`)
- `dex use <version>` (switches active version symlink)
- `dex pie generate [spec]` (generates typed route-tree client into `core/api/generated.ts`)
- `dex tag <patch|minor|major>` (bumps SemVer git tag and pushes to `origin`)
- `dex build` (runs `bun run build`)
- `dex start` (default dev, runs `bun run dev`)
- `dex start -p` (production, sets `NODE_ENV=production` and runs `bun run start`)
- `dex -v` / `dex --version` (shows CLI version)
- `dex --version -f` (shows framework template version from `.dex/metadata.json`)

## Multi-version Layout (`DEX_HOME`)

- Stored in `~/.dex` (or `$DEX_HOME`):
  - `versions/<version>/dex`: Binaries per version.
  - `current`: Symlink to active version directory.
  - `bin/dex`: Executable shim in user's PATH.

## Project discovery

- Discovers project root by finding `dex.config.*` (or `config/dex.config.*`) or `package.json` with a `dex` field.
