---
title: "CLI"
---

# CLI

Command-line tools for the Dex framework, powered by a **native Go CLI** (`cli/`).

## Native Go Architecture (v0.2.6)

In v0.2.6, the `dex` CLI is compiled from Go (`cli/cmd/dex/main.go`) with `CGO_ENABLED=0` into a standalone ~6 MB binary with <5ms startup and zero runtime dependencies:

- **Cross-compiled release targets**:
  - Linux: `dex-linux-x64`, `dex-linux-arm64`
  - macOS: `dex-darwin-x64`, `dex-darwin-arm64`
  - Windows: `dex-windows-x64.exe`
- **Workspace TypeScript package**: `@dex/cli` (`framework/packages/cli`) continues to be maintained as a TypeScript workspace package alongside the native Go binary.
- **Release integrity (`SHA256SUMS`)**: Each GitHub Release publishes a `SHA256SUMS` manifest alongside the binaries so downloaded executables can be verified before running.

## Topics

- [Scaffold](./scaffold) — Create a new Dex project with `dex scaffold`
- [Commands](./commands) — Full CLI command reference (`template`, `sync`, `pie`, `update`, etc.)

## Installation

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/patrickaigbogun/dex/master/install.sh | bash
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/patrickaigbogun/dex/master/install.ps1 | iex
```

Dex installs binaries to `~/.dex/versions/<version>/dex` with an active symlink at `~/.dex/current` and executable shim at `~/.dex/bin/dex` (and `~/.local/bin/dex` when `~/.local/bin` exists).

### Verifying Release Binaries with `SHA256SUMS`

```bash
curl -fsSLO https://github.com/patrickaigbogun/dex/releases/latest/download/SHA256SUMS
sha256sum -c SHA256SUMS --ignore-missing
```

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

- `dex scaffold <dir>` — Scaffold a new Dex project (`--no-cache` / `--fresh` supported)
- `dex sync [--interactive]` — Sync template changes with SHA-256 checksum verification and `deletedFiles` cleanup
- `dex template <list|cache|diff>` — Inspect official/cached templates, manage template cache, and view release diffs
- `dex update [version] [--force]` — Update the CLI to the latest (or specific) release
- `dex versions` / `dex list` / `dex ls` — List all locally installed CLI versions
- `dex use <version>` — Switch the active CLI version
- `dex pie generate [spec]` — Generate a typed route-tree API client from JSON or YAML OpenAPI specs
- `dex tag <patch|minor|major>` — Bump and push SemVer git release tags
- `dex build` — Build project for production
- `dex start [-p]` — Run development (`dex start`) or production (`dex start -p`) server
- `dex -v` / `dex --version [-f]` — Display CLI and template version info
