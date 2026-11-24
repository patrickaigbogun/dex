---
title: "Commands"
---

# CLI Commands

The native Go Dex CLI (`dex`) provides sub-5ms commands for scaffolding projects, managing template caches, syncing upstream updates, generating OpenAPI clients, tagging releases, and building/running applications.

## Overview

```bash
dex scaffold <dir> [options]
dex sync [--interactive] [options]
dex template <list|cache|diff> [options]
dex update [version] [--force]
dex versions | dex list | dex ls
dex use <version>
dex pie generate [spec-url-or-file] [options]
dex tag <patch|minor|major>
dex build
dex start [-p]
dex -v / --version [-f]
```

---

## `dex scaffold`

Scaffold a new Dex project in `<dir>`.

```bash
dex scaffold <dir> [options]
```

Prompts for project mode (`spa` or `mpa`, or pass `--mode`), downloads and extracts the template archive and framework packages (`router`, `server`, `dev`, `pie`) into `packages/`, initializes `.dex/metadata.json`, and runs `bun install` unless `--no-install` is set.

### Options

| Option | Description |
|---|---|
| `--mode <spa\|mpa>` | Project template mode (`spa` or `mpa`) without prompting |
| `--repo <owner/repo>` | GitHub repository containing release templates (default: `patrickaigbogun/dex`) |
| `--tag <tag\|latest>` | Release tag to download template from (default: `latest`) |
| `--packages-repo <owner/repo>` | GitHub repository containing `dex-package-*.tgz` assets |
| `--packages-tag <tag\|latest>` | Release tag for `dex-package-*.tgz` assets (default: template tag) |
| `--template <path>` | Use a local template `.tgz` archive instead of downloading from GitHub |
| `--template-url <url>` | Download template `.tgz` archive from a direct URL (skips GitHub API) |
| `--no-install` | Do not run `bun install` after scaffolding |
| `--no-cache`, `--fresh` | Bypass the local template cache and download fresh tarballs |

### Examples

```bash
# Scaffold in a new directory
dex scaffold my-app

# Bypass local template cache and pin a tag
dex scaffold my-app --tag v0.2.6 --fresh

# Scaffold from a local archive without installing dependencies
dex scaffold my-app --mode spa --template ./custom-template.tgz --no-install
```

---

## `dex sync`

Sync upstream template changes and obsolete file removals into an existing Dex project.

```bash
dex sync [options]
```

`dex sync` reads `.dex/metadata.json`, fetches the release diff manifest (`dex-diff-<tag>.json`), downloads the template archive (honoring `--no-cache` / `--fresh`), and performs two safety-checked steps:

1. **Enforced SHA-256 checksum verification**: Before copying any file listed in `changedFiles`, `dex sync` computes its SHA-256 digest and verifies it against `diff.Checksums[file]`. If a checksum does not match, the sync aborts with an error.
2. **Interactive `deletedFiles` cleanup**: If the release diff includes `deletedFiles` that still exist in your project, `dex sync` prompts whether to remove those obsolete upstream files (or removes them automatically when `--force` is passed).

### Options

| Option | Description |
|---|---|
| `--interactive` | Interactively select which changed files to sync |
| `--repo <owner/repo>` | Template GitHub repository (default: `patrickaigbogun/dex` or `DEX_TEMPLATE_REPO`) |
| `--tag <tag>` | Release tag to sync to (default: `latest`) |
| `--force` | Force sync even if already on the target version, and remove obsolete `deletedFiles` without prompting |
| `--no-cache`, `--fresh` | Bypass the local template cache when fetching the template archive |

### Examples

```bash
# Sync all changed files from the latest release
dex sync

# Interactively choose which changed files to apply, bypassing cache
dex sync --interactive --fresh

# Sync against a specific release tag and force cleanup
dex sync --tag v0.2.6 --force
```

---

## `dex template`

Inspect available/cached templates, manage the local template cache, and inspect upstream release diffs.

```bash
dex template list | ls
dex template cache list | ls
dex template cache clean [--all | <tag>]
dex template diff [tag] [--repo <owner/repo>]
```

### Subcommands

| Subcommand | Description |
|---|---|
| `dex template list` / `ls` | Lists official templates (`spa`, `mpa`) and all locally cached `<owner>/<repo>@<tag>` directories. |
| `dex template cache list` / `ls` | Lists cached template `.tgz` asset paths and file sizes (in KB) inside the template cache directory. |
| `dex template cache clean [--all \| <tag>]` | Removes all cached template tarballs (default or `--all`), or deletes cached assets for a specific `<tag>` across repos. |
| `dex template diff [tag]` | Fetches `dex-diff-<tag>.json` (default: `latest`) and prints JSON with `version`, `previousVersion`, `changedFiles`, and `deletedFiles`. |

### Examples

```bash
# List official and cached templates
dex template ls

# Inspect cached tarballs and sizes
dex template cache list

# Clear cached tarballs for a specific tag, or clear everything
dex template cache clean v0.2.5
dex template cache clean --all

# Preview changed and deleted files in the latest release
dex template diff
dex template diff v0.2.6
```

---

## `dex update`

Update the Dex CLI to the latest release (or a specific version) with multi-version storage.

```bash
dex update [version] [options]
```

Checks GitHub Releases, downloads the native binary for your OS and architecture (`dex-linux-x64`, `dex-linux-arm64`, `dex-darwin-x64`, `dex-darwin-arm64`, or `dex-windows-x64.exe`) into `~/.dex/versions/<version>/`, and atomically updates `~/.dex/current` and `~/.dex/bin/dex`.

### Options

| Option | Description |
|---|---|
| `[version]` | Specific version tag to install (e.g. `v0.2.6`). Defaults to latest GitHub release. |
| `--force` | Force re-download even if already on the target version. |
| `--repo <owner/repo>` | Release repository (default: `patrickaigbogun/dex` or `DEX_TEMPLATE_REPO`). |

### Verifying Release Checksums (`SHA256SUMS`)

Every release publishes a `SHA256SUMS` file covering all cross-compiled CLI binaries:

```bash
curl -fsSLO https://github.com/patrickaigbogun/dex/releases/download/v0.2.6/SHA256SUMS
curl -fsSLO https://github.com/patrickaigbogun/dex/releases/download/v0.2.6/dex-linux-x64
sha256sum -c SHA256SUMS --ignore-missing
```

---

## `dex versions` / `dex list` / `dex ls`

List all locally installed Dex CLI versions stored in `~/.dex/versions/`.

```bash
dex versions
# or
dex list
# or
dex ls
```

Output:

```
Dex installed versions (~/.dex):

  * v0.2.6 (active)
    v0.2.5
```

---

## `dex use`

Switch the active CLI version to another installed version.

```bash
dex use <version>
```

```bash
dex use v0.2.5
# Now using Dex v0.2.5 ✓

dex use v0.2.6
# Now using Dex v0.2.6 ✓
```

---

## `dex pie generate`

Generate a fully typed route-tree API client from a JSON or YAML OpenAPI 3.0/3.1 specification using the Go CLI's built-in YAML/JSON parser (alias: `dex api generate`).

```bash
dex pie generate [spec-url-or-file] [options]
```

### Options

| Option | Description |
|---|---|
| `[spec-url-or-file]` | Path to a local OpenAPI JSON/YAML file, or a URL to a remote schema (also `--spec`). |
| `--out <path>` | Output TypeScript file path (default: `core/api/generated.ts`). |
| `--prefix <prefix>` | Route path prefix to strip from generated client tree (default: `/api`). |
| `--url <baseUrl>` | Default base API URL (inferred from `dex.config.ts` `apiUrl`, `PUBLIC_API_URL`, or `NEXT_PUBLIC_API_URL`). |

### Examples

```bash
# Generate from local OpenAPI YAML or JSON file
dex pie generate ./openapi.yaml
dex pie generate ./openapi.json

# Generate from remote URL with custom output and prefix
dex pie generate https://api.example.com/openapi.yaml --out core/api/client.ts --prefix /v1
```

---

## `dex tag`

Bump SemVer version tags and push the tag to the `origin` git remote.

```bash
dex tag <patch|minor|major>
```

| Argument | Description | Example |
|---|---|---|
| `patch` | Bump SemVer patch version | `v0.2.5` → `v0.2.6` |
| `minor` | Bump SemVer minor version | `v0.2.6` → `v0.3.0` |
| `major` | Bump SemVer major version | `v0.2.6` → `v1.0.0` |

---

## `dex build`

Build the Dex application for production.

```bash
dex build
```

Discovers the project root (`dex.config.*`, `config/dex.config.*`, or `package.json#dex`) and runs `bun core/bootstrap/build.ts` (falling back to `core/bootstrap/scripts.ts` or `bun run build`).

---

## `dex start`

Start the Dex application in development or production mode (alias: `dex dev`).

```bash
dex start [-p]
```

| Option | Description |
|---|---|
| `-p` | Production mode (`NODE_ENV=production`). Executes `./build/server` (`./build/server.exe` on Windows) if present, falling back to `bun run start`. Without `-p`, runs `bun core/bootstrap/dev.ts`. |

---

## Version Flags

```bash
# Show CLI version
dex -v
dex --version

# Show CLI version and framework template version from .dex/metadata.json
dex --version -f
dex -v -f
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DEX_HOME` | Custom installation and multi-version storage directory | `~/.dex` |
| `DEX_TEMPLATE_REPO` | Default GitHub template repository (`owner/repo`) | `patrickaigbogun/dex` |
| `DEX_TEMPLATE_TGZ` | Path to local template `.tgz` archive (skips GitHub API) | — |
| `DEX_TEMPLATE_URL` | Direct URL to template `.tgz` archive (skips GitHub API) | — |
| `DEX_PACKAGE_REPO` | GitHub repository (`owner/repo`) for `dex-package-*.tgz` assets | Template repo |
| `DEX_PACKAGE_TAG` | Release tag for `dex-package-*.tgz` assets | Template tag |
| `DEX_CACHE_DIR` | Directory for caching downloaded templates and packages | OS cache directory (`~/.cache/dex`, `~/Library/Caches/dex`, or `%LOCALAPPDATA%\dex\Cache`) |
| `DEX_TEMPLATE_CACHE_TTL_MS` | Cache TTL in milliseconds for `latest` release downloads | `1800000` (30m) |
| `DEX_FETCH_TIMEOUT_MS` | Network timeout in milliseconds for GitHub API requests | `30000` (30s) |
| `DEX_API_SPEC` | Default OpenAPI spec URL or path for `dex pie generate` | — |
| `GITHUB_TOKEN` | GitHub token to avoid rate limits or access private repositories | — |

---

## See Also

- [Scaffold](./scaffold) — Guide to scaffolding a new project
- [CLI Flags](../reference/cli-flags) — Quick reference for CLI flags
- [Your First App](../getting-started/your-first-app) — Step-by-step tutorial
