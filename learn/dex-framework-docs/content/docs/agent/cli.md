---
title: "Cli"
---

# `dex` CLI (Agent)

Dex distribution is GitHub-only:

- Users install a single compiled Go CLI (`cli/`) or release binary from GitHub Releases.
- `dex scaffold` downloads template `.tgz` assets and framework package `.tgz` assets from GitHub Releases.

## Source

- Go CLI: `cli/`
- Framework CLI package: `framework/packages/cli/src/cli.ts`

## Commands

- `dex scaffold <dir>` (options: `--repo`, `--tag`, `--packages-repo`, `--packages-tag`, `--template`, `--template-url`, `--no-install`, `--no-cache`, `--fresh`)
- `dex sync` (options: `--interactive`, `--repo`, `--tag`, `--force`, `--no-cache`, `--fresh`)
- `dex template <list|cache|diff>`
- `dex update [version] [--force]`
- `dex versions` / `dex list`
- `dex use <version>`
- `dex pie generate [spec]`
- `dex build`
- `dex start` (runs dev process)
- `dex start -p` (sets `NODE_ENV=production` and runs production server)
- `dex -v` / `dex --version`
- `dex --version -f`

## See Also

- Guides: [`../cli/`](../cli/)
- Router docs: [`../router/`](../router/)
