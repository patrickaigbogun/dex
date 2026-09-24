---
title: "CLI"
---

# CLI

Command-line tools for the Dex framework.

## Topics

- [Scaffold](./scaffold) — Create a new Dex project
- [Commands](./commands) — Full CLI command reference

## Installation

### Linux / macOS
```bash
curl -fsSL https://raw.githubusercontent.com/patrickaigbogun/dex/master/install.sh | bash
```

### Windows (PowerShell)
```powershell
irm https://raw.githubusercontent.com/patrickaigbogun/dex/master/install.ps1 | iex
```

Dex installs binaries to `~/.dex/versions/<version>/dex` with an active executable shim in `~/.dex/bin/dex`.

## Quick Start

```bash
# Scaffold a new project
dex scaffold my-app

# Enter directory
cd my-app

# Start development server
dex start
```

## Available Commands

- `dex scaffold <dir>` — Scaffold a new Dex project
- `dex sync [--interactive]` — Sync template changes from upstream release
- `dex update [version]` — Update the CLI to the latest (or specific) release
- `dex versions` / `dex list` — List all locally installed versions
- `dex use <version>` — Switch the active CLI version
- `dex pie generate [spec]` — Generate fully typed route tree client from OpenAPI spec
- `dex tag <patch|minor|major>` — Bump and push SemVer git release tags
- `dex build` — Build project for production
- `dex start [-p]` — Run development (`dex start`) or production (`dex start -p`) server
- `dex -v` / `dex --version [-f]` — Display CLI and template version info